import { useEffect, useState } from 'react';
import { Banknote, Check, Clock3, Film, KeyRound, Loader2, LogOut, Search, ShieldCheck, UploadCloud, X } from 'lucide-react';

import { createVideo, removeUploadedVideo, uploadVideoFile } from '@/data/videos';
import { supabase } from '@/lib/supabase';

interface PendingProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  account_type: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  is_certified: boolean;
  suspended_at: string | null;
  created_at: string;
}

interface AdminPanelProps {
  email: string;
  onSignOut: () => void;
}

function identifierFor(id: string) {
  return `ID-${id.split('-').join('').slice(0, 15).toUpperCase()}`;
}

export default function AdminPanel({ email, onSignOut }: AdminPanelProps) {
  const [found, setFound] = useState<PendingProfile | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const searchRequest = async () => {
    if (!identifier.trim()) {
      setError('Saisissez un numéro d’identification.');
      setFound(null);
      setMessage(null);
      return;
    }
    setSearching(true);
    setError(null);
    setMessage(null);
    const { data, error: searchError } = await supabase.rpc('find_pending_profile_by_identifier', { p_identifier: identifier.trim() });
    setSearching(false);
    if (searchError) {
      setError('La recherche n’a pas pu être effectuée.');
      setFound(null);
      return;
    }
    const result = (data?.[0] ?? null) as PendingProfile | null;
    setFound(result);
    if (!result) setError('Aucun compte ne correspond à cet identifiant.');
  };

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setWorkingId(id);
    const { error: approvalError } = await supabase.rpc('approve_profile', { p_user_id: id, p_status: status });
    setWorkingId(null);
    if (approvalError) {
      setError('Le statut du compte n’a pas pu être mis à jour.');
      return;
    }
    setFound((current) => current ? { ...current, approval_status: status } : current);
    setMessage(status === 'approved' ? 'Le compte est maintenant approuvé.' : 'Le compte a été refusé.');
  };

  const updateCertification = async (id: string, certified: boolean) => {
    setWorkingId(id);
    const { error: certificationError } = await supabase.rpc('set_profile_certification', { p_user_id: id, p_certified: certified });
    setWorkingId(null);
    if (certificationError) {
      setError('La certification n’a pas pu être mise à jour.');
      return;
    }
    setFound((current) => current ? { ...current, is_certified: certified } : current);
    setMessage(certified ? 'Le compte est certifié.' : 'La certification a été retirée.');
  };

  const updateSuspension = async (id: string, suspended: boolean) => {
    setWorkingId(id);
    const { error: suspensionError } = await supabase.rpc('set_profile_suspension', { p_user_id: id, p_suspended: suspended });
    setWorkingId(null);
    if (suspensionError) {
      setError('Le statut de suspension n’a pas pu être mis à jour.');
      return;
    }
    setFound((current) => current ? { ...current, suspended_at: suspended ? new Date().toISOString() : null } : current);
    setMessage(suspended ? 'Le compte a été suspendu.' : 'Le compte a été réactivé.');
  };

  const updatePaymentCode = async (id: string, code: string) => {
    if (!code.trim()) {
      setError('Saisissez un code de retrait.');
      return;
    }
    setWorkingId(id);
    const { error: codeError } = await supabase.rpc('set_profile_payment_code', { p_user_id: id, p_code: code.trim() });
    setWorkingId(null);
    if (codeError) {
      setError('Le code de retrait n’a pas pu être enregistré.');
      return;
    }
    setMessage('Le code de retrait a été enregistré.');
  };

  return <div className="min-h-screen bg-[#07101c] text-slate-100">
    <header className="border-b border-white/10 bg-[#0b1524]"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-10"><div className="flex items-center gap-3"><span className="google-mark small">G</span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-300">Google TV</p><h1 className="text-xl font-bold text-white">Compte administratif</h1></div></div><button onClick={onSignOut} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10"><LogOut className="h-4 w-4" /> Quitter</button></div></header>
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-10">
      <div className="mb-8"><p className="text-sm text-slate-400">Connecté en tant que {email}</p><h2 className="mt-2 text-3xl font-black text-white">Rechercher une demande</h2><p className="mt-2 text-slate-400">Saisissez le numéro d’identification communiqué par l’utilisateur pour afficher sa demande.</p></div>
      <section className="rounded-3xl border border-blue-400/25 bg-[#172236] p-5 sm:p-7"><label className="mb-3 block text-sm font-bold uppercase tracking-[.12em] text-slate-300">Numéro d’identification</label><div className="flex flex-col gap-3 sm:flex-row"><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void searchRequest(); }} placeholder="ID-22984756320187" className="form-input" /><button onClick={() => void searchRequest()} disabled={searching} className="primary-button inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold disabled:opacity-60"><Search className="h-4 w-4" /> {searching ? 'Recherche…' : 'Rechercher'}</button></div></section>
      {error && <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      {message && <p className="mt-5 rounded-xl border border-green-400/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">{message}</p>}
      {found ? <ProfileResult profile={found} working={workingId === found.id} onApprove={() => void updateStatus(found.id, 'approved')} onReject={() => void updateStatus(found.id, 'rejected')} onCertificationChange={(certified) => void updateCertification(found.id, certified)} onSuspensionChange={(suspended) => void updateSuspension(found.id, suspended)} onPaymentCodeSave={(code) => void updatePaymentCode(found.id, code)} /> : <div className="mt-10 rounded-2xl border border-white/10 bg-[#172236] p-10 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-blue-300" /><p className="mt-4 text-lg font-semibold text-white">Aucun compte affiché</p><p className="mt-2 text-sm text-slate-400">Utilisez la recherche ci-dessus pour consulter un compte précis.</p></div>}
      <WithdrawalReviewSection />
      <PublishVideoSection />
    </main>
  </div>;
}

interface PendingWithdrawal {
  request_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  identifier: string;
  amount: number;
  payment_method: string;
  phone: string;
  country: string;
  city: string;
  status: string;
  created_at: string;
}

function WithdrawalReviewSection() {
  const [requests, setRequests] = useState<PendingWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchRequests = async () => {
      const { data, error: fetchError } = await supabase.rpc('get_pending_withdrawals');
      if (!mounted) return;
      if (fetchError) { setError('Les demandes de retrait ne peuvent pas être affichées pour le moment.'); setLoading(false); return; }
      setError(null);
      setRequests((data ?? []) as PendingWithdrawal[]);
      setLoading(false);
    };
    void fetchRequests();
    const timer = window.setInterval(fetchRequests, 5000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  const review = async (requestId: string, status: 'approved' | 'rejected') => {
    setWorkingId(requestId);
    setError(null);
    setMessage(null);
    const { error: reviewError } = await supabase.rpc('review_withdrawal_request', { p_request_id: requestId, p_status: status });
    setWorkingId(null);
    if (reviewError) { setError('La demande n’a pas pu être traitée.'); return; }
    setRequests((current) => current.filter((request) => request.request_id !== requestId));
    setMessage(status === 'approved' ? 'La demande de retrait a été approuvée.' : 'La demande de retrait a été refusée.');
  };

  return <section className="mt-12 rounded-2xl border border-white/10 bg-[#172236] p-5 sm:p-7">
    <div className="flex items-center gap-3"><Banknote className="h-6 w-6 text-blue-300" /><h2 className="text-2xl font-black text-white">Confirmer un retrait</h2></div>
    <p className="mt-2 text-sm text-slate-400">Toutes les demandes de retrait en attente de validation apparaissent ici automatiquement.</p>
    {loading ? <div className="mt-8 py-8 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400" /><p className="mt-4 text-sm text-slate-400">Chargement des demandes…</p></div>
      : requests.length === 0 ? <div className="mt-8 rounded-2xl border border-white/10 bg-[#0b1524] px-6 py-10 text-center"><p className="font-semibold text-white">Aucune demande de retrait en attente</p><p className="mt-2 text-sm text-slate-400">Les nouvelles demandes des utilisateurs apparaîtront ici automatiquement.</p></div>
      : <div className="mt-6 space-y-4">{requests.map((request) => <article key={request.request_id} className="rounded-2xl border border-blue-400/20 bg-[#0b1524] p-5"><div className="grid gap-4 sm:grid-cols-2">
        <div><p className="text-xs uppercase tracking-wider text-slate-500">Bénéficiaire</p><p className="mt-1 font-bold text-white">{request.first_name} {request.last_name}</p><p className="mt-1 text-sm font-semibold text-blue-300">{request.identifier}</p></div>
        <div><p className="text-xs uppercase tracking-wider text-slate-500">Montant</p><p className="mt-1 text-xl font-black text-green-300">{Number(request.amount).toLocaleString('fr-FR')} XOF</p></div>
        <div><p className="text-xs uppercase tracking-wider text-slate-500">Moyen de paiement</p><p className="mt-1 text-slate-200">{request.payment_method}</p></div>
        <div><p className="text-xs uppercase tracking-wider text-slate-500">Téléphone</p><p className="mt-1 text-slate-200">{request.phone}</p></div>
        <div><p className="text-xs uppercase tracking-wider text-slate-500">Pays et ville</p><p className="mt-1 text-slate-200">{request.country} · {request.city}</p></div>
        <div><p className="text-xs uppercase tracking-wider text-slate-500">Demande reçue le</p><p className="mt-1 text-slate-200">{new Date(request.created_at).toLocaleDateString('fr-FR')}</p></div>
      </div><div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button disabled={workingId === request.request_id} onClick={() => void review(request.request_id, 'rejected')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/30 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/10 disabled:opacity-50"><X className="h-4 w-4" /> Refuser le retrait</button>
        <button disabled={workingId === request.request_id} onClick={() => void review(request.request_id, 'approved')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50"><Check className="h-4 w-4" /> Confirmer le retrait</button>
      </div></article>)}</div>}
    {error && <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    {message && <p className="mt-5 rounded-xl border border-green-400/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">{message}</p>}
  </section>;
}

function PublishVideoSection() {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  const publish = async () => {
    if (!title.trim()) { setPublishError('Saisissez un titre pour la vidéo.'); setPublishMessage(null); return; }
    if (!file) { setPublishError('Choisissez un fichier vidéo à publier.'); setPublishMessage(null); return; }

    setPublishing(true);
    setPublishError(null);
    setPublishMessage(null);
    let uploadedPath: string | null = null;
    try {
      const uploaded = await uploadVideoFile(file);
      uploadedPath = uploaded.path;
      await createVideo({ title: title.trim(), videoUrl: uploaded.publicUrl });
      setTitle('');
      setFile(null);
      setPublishMessage('La vidéo a été publiée. Elle est maintenant disponible dans l’onglet Vidéos.');
    } catch {
      if (uploadedPath) await removeUploadedVideo(uploadedPath);
      setPublishError('La publication a échoué. Vérifiez le fichier et réessayez.');
    } finally {
      setPublishing(false);
    }
  };

  return <section className="mt-12 rounded-2xl border border-white/10 bg-[#172236] p-5 sm:p-7">
    <div className="flex items-center gap-3"><UploadCloud className="h-6 w-6 text-blue-300" /><h2 className="text-2xl font-black text-white">Publier une vidéo</h2></div>
    <p className="mt-2 text-sm text-slate-400">Ajoutez uniquement vos propres fichiers vidéo. Aucun nom de chaîne n’est demandé.</p>
    <label className="mt-6 block"><span className="mb-3 block text-sm font-bold uppercase tracking-[.1em] text-slate-300">Titre de la vidéo</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex : Ma nouvelle vidéo" className="form-input" /></label>
    <label className="mt-5 block"><span className="mb-3 block text-sm font-bold uppercase tracking-[.1em] text-slate-300">Fichier vidéo</span><div className="flex items-center gap-3 rounded-xl border border-dashed border-white/20 bg-[#0b1524] px-4 py-4"><Film className="h-6 w-6 flex-none text-blue-300" /><input type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="w-full text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-400" /></div><span className="mt-2 block text-xs text-slate-500">Formats acceptés : MP4, WebM, MOV et OGG, jusqu’à 500 Mo.</span></label>
    {publishError && <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{publishError}</p>}
    {publishMessage && <p className="mt-5 rounded-xl border border-green-400/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">{publishMessage}</p>}
    <button onClick={() => void publish()} disabled={publishing} className="primary-button mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold disabled:opacity-60">{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} {publishing ? 'Publication en cours…' : 'Publier la vidéo'}</button>
  </section>;
}

function ProfileResult({ profile, working, onApprove, onReject, onCertificationChange, onSuspensionChange, onPaymentCodeSave }: { profile: PendingProfile; working: boolean; onApprove: () => void; onReject: () => void; onCertificationChange: (certified: boolean) => void; onSuspensionChange: (suspended: boolean) => void; onPaymentCodeSave: (code: string) => void }) {
  const [paymentCode, setPaymentCode] = useState('');
  const statusLabel = profile.approval_status === 'approved' ? 'Compte approuvé' : profile.approval_status === 'rejected' ? 'Compte refusé' : 'Compte en attente';
  const suspended = Boolean(profile.suspended_at);
  return <article className="mt-8 rounded-2xl border border-white/10 bg-[#172236] p-5 sm:p-7">
    <div className="grid gap-5 sm:grid-cols-2">
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Prénom et nom</p><p className="mt-1 text-lg font-bold text-white">{profile.first_name} {profile.last_name}</p>{profile.is_certified && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-400/15 px-2.5 py-1 text-xs font-bold text-blue-200"><ShieldCheck className="h-3.5 w-3.5" /> Certifié</p>}</div>
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Numéro d’identification</p><p className="mt-1 font-bold text-blue-300">{identifierFor(profile.id)}</p></div>
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Statut du compte</p><p className={`mt-1 font-bold ${profile.approval_status === 'approved' ? 'text-green-300' : 'text-amber-300'}`}>{statusLabel}</p></div>
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Adresse e-mail</p><p className="mt-1 text-slate-200">{profile.email ?? '—'}</p></div>
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Téléphone</p><p className="mt-1 text-slate-200">{profile.phone ?? '—'}</p></div>
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Pays et ville</p><p className="mt-1 text-slate-200">{profile.country ?? '—'} · {profile.city ?? '—'}</p></div>
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Formule</p><p className="mt-1 text-slate-200">{profile.account_type ?? '—'}</p></div>
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Accès</p><p className={`mt-1 font-bold ${suspended ? 'text-red-300' : 'text-green-300'}`}>{suspended ? 'Compte suspendu' : 'Compte actif'}</p></div>
    </div>
    <div className="mt-7 border-t border-white/10 pt-6"><div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-blue-300" /><p className="text-sm font-bold uppercase tracking-[.1em] text-slate-300">Code de retrait</p></div><p className="mt-2 text-sm leading-6 text-slate-400">Définissez ou remplacez le code demandé à l’utilisateur après la préparation de son retrait.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input value={paymentCode} onChange={(event) => setPaymentCode(event.target.value)} placeholder="Ex : 4829" className="form-input" /><button disabled={working} onClick={() => onPaymentCodeSave(paymentCode)} className="primary-button inline-flex flex-none items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold disabled:opacity-60"><KeyRound className="h-4 w-4" /> Enregistrer le code</button></div></div>
    <div className="mt-7 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2">
      <button disabled={working} onClick={() => onCertificationChange(!profile.is_certified)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/30 px-4 py-3 text-sm font-bold text-blue-200 hover:bg-blue-400/10 disabled:opacity-50"><ShieldCheck className="h-4 w-4" /> {profile.is_certified ? 'Retirer la certification' : 'Certifier le compte'}</button>
      <button disabled={working} onClick={() => onSuspensionChange(!suspended)} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50 ${suspended ? 'border-green-400/30 text-green-200 hover:bg-green-400/10' : 'border-red-400/30 text-red-200 hover:bg-red-500/10'}`}>{suspended ? 'Réactiver le compte' : 'Désactiver le compte'}</button>
      <button disabled={working} onClick={onReject} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/30 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/10 disabled:opacity-50"><X className="h-4 w-4" /> Refuser le compte</button>
      {profile.approval_status !== 'approved' && <button disabled={working} onClick={onApprove} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50"><Check className="h-4 w-4" /> Approuver le compte</button>}
    </div>
    <p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Reçu le {new Date(profile.created_at).toLocaleDateString('fr-FR')}</p>
  </article>;
}
