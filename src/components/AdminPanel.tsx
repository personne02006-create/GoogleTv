import { useEffect, useState } from 'react';
import { Banknote, Check, Clock3, KeyRound, Loader2, LogOut, Search, ShieldCheck, X } from 'lucide-react';
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
  const isWithdrawalManager = email.trim().toLowerCase() === 'ihssaneassani4@gmail.com';
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
      <div className="mb-8"><p className="text-sm text-slate-400">Connecté en tant que {email}</p><h2 className="mt-2 text-3xl font-black text-white">Rechercher une demande</h2><p className="mt-2 text-slate-400">Saisissez l’identifiant de l’utilisateur pour afficher sa demande.</p></div>
      <section className="rounded-3xl border border-blue-400/25 bg-[#172236] p-5 sm:p-7"><label className="mb-3 block text-sm font-bold uppercase tracking-[.12em] text-slate-300">Numéro d’identification</label><div className="flex flex-col gap-3 sm:flex-row"><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void searchRequest(); }} placeholder="ID-22984756320187" className="form-input" /><button onClick={() => void searchRequest()} disabled={searching} className="primary-button inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold disabled:opacity-60"><Search className="h-4 w-4" /> {searching ? 'Recherche…' : 'Rechercher'}</button></div></section>
      {error && <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      {message && <p className="mt-5 rounded-xl border border-green-400/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">{message}</p>}
      {found ? <ProfileResult profile={found} working={workingId === found.id} showWithdrawalActions={isWithdrawalManager} onApprove={() => void updateStatus(found.id, 'approved')} onReject={() => void updateStatus(found.id, 'rejected')} onCertificationChange={(certified) => void updateCertification(found.id, certified)} onSuspensionChange={(suspended) => void updateSuspension(found.id, suspended)} onPaymentCodeSave={(code) => void updatePaymentCode(found.id, code)} /> : <div className="mt-10 rounded-2xl border border-white/10 bg-[#172236] p-10 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-blue-300" /><p className="mt-4 text-lg font-semibold text-white">Aucun compte affiché</p><p className="mt-2 text-sm text-slate-400">Utilisez la recherche ci-dessus pour consulter un compte précis.</p></div>}
      {!isWithdrawalManager && <WithdrawalReviewSection />}
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
  const [identifier, setIdentifier] = useState('');
  const [request, setRequest] = useState<PendingWithdrawal | null>(null);
  const [searching, setSearching] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const searchRequest = async (): Promise<void> => {
    if (!identifier.trim()) {
      setError('Saisissez le numéro d’identification de la demande.');
      setRequest(null);
      return;
    }
    setSearching(true);
    setError(null);
    setMessage(null);
    const { data, error: searchError } = await supabase.rpc('find_pending_withdrawal_by_identifier', { p_identifier: identifier.trim() });
    setSearching(false);
    if (searchError) {
      setError('La recherche de la demande n’a pas pu être effectuée.');
      setRequest(null);
      return;
    }
    const result = (data?.[0] ?? null) as PendingWithdrawal | null;
    setRequest(result);
    if (!result) setError('Aucune demande de retrait en attente pour cet identifiant.');
  };

  const review = async (requestId: string, status: 'approved' | 'rejected'): Promise<void> => {
    setWorkingId(requestId);
    setError(null);
    setMessage(null);
    const { error: reviewError } = await supabase.rpc('review_withdrawal_request', { p_request_id: requestId, p_status: status });
    setWorkingId(null);
    if (reviewError) { setError('La demande n’a pas pu être traitée.'); return; }
    setRequest(null);
    setMessage(status === 'approved' ? 'Le retrait a été accepté.' : 'Le retrait a été refusé.');
  };

  return <section className="mt-12 rounded-2xl border border-white/10 bg-[#172236] p-5 sm:p-7">
    <div className="flex items-center gap-3"><Banknote className="h-6 w-6 text-blue-300" /><h2 className="text-2xl font-black text-white">Confirmer un retrait</h2></div>
    <p className="mt-2 text-sm text-slate-400">Recherchez l’identifiant avant d’afficher et de confirmer une demande.</p>
    <div className="mt-6 flex flex-col gap-3 sm:flex-row"><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void searchRequest(); }} placeholder="ID-22984756320187" className="form-input" /><button onClick={() => void searchRequest()} disabled={searching} className="primary-button inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold disabled:opacity-60"><Search className="h-4 w-4" /> {searching ? 'Recherche…' : 'Rechercher la demande'}</button></div>
    {request && <article className="mt-6 rounded-2xl border border-blue-400/20 bg-[#0b1524] p-5"><div className="grid gap-4 sm:grid-cols-2">
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Bénéficiaire</p><p className="mt-1 font-bold text-white">{request.first_name} {request.last_name}</p><p className="mt-1 text-sm font-semibold text-blue-300">{request.identifier}</p></div>
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Montant</p><p className="mt-1 text-xl font-black text-green-300">{Number(request.amount).toLocaleString('fr-FR')} XOF</p></div>
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Moyen de paiement</p><p className="mt-1 text-slate-200">{request.payment_method}</p></div>
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Téléphone</p><p className="mt-1 text-slate-200">{request.phone}</p></div>
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Pays et ville</p><p className="mt-1 text-slate-200">{request.country} · {request.city}</p></div>
      <div><p className="text-xs uppercase tracking-wider text-slate-500">Demande reçue le</p><p className="mt-1 text-slate-200">{new Date(request.created_at).toLocaleDateString('fr-FR')}</p></div>
    </div><div className="mt-5 grid gap-3 sm:grid-cols-2">
      <button disabled={workingId === request.request_id} onClick={() => void review(request.request_id, 'rejected')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/30 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/10 disabled:opacity-50"><X className="h-4 w-4" /> Refuser le retrait</button>
      <button disabled={workingId === request.request_id} onClick={() => void review(request.request_id, 'approved')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50"><Check className="h-4 w-4" /> Accepter le retrait</button>
    </div></article>}
    {error && <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    {message && <p className="mt-5 rounded-xl border border-green-400/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">{message}</p>}
  </section>;
}

function ProfileResult({ profile, working, showWithdrawalActions, onApprove, onReject, onCertificationChange, onSuspensionChange, onPaymentCodeSave }: { profile: PendingProfile; working: boolean; showWithdrawalActions: boolean; onApprove: () => void; onReject: () => void; onCertificationChange: (certified: boolean) => void; onSuspensionChange: (suspended: boolean) => void; onPaymentCodeSave: (code: string) => void }) {
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
    <div className="mt-7 border-t border-white/10 pt-6"><div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-blue-300" /><p className="text-sm font-bold uppercase tracking-[.1em] text-slate-300">Code de retrait</p></div><p className="mt-2 text-sm leading-6 text-slate-400">Définissez le code demandé à l’utilisateur.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input value={paymentCode} onChange={(event) => setPaymentCode(event.target.value)} placeholder="Ex : 4829" className="form-input" /><button disabled={working} onClick={() => onPaymentCodeSave(paymentCode)} className="primary-button inline-flex flex-none items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold disabled:opacity-60"><KeyRound className="h-4 w-4" /> Enregistrer le code</button></div></div>
    <div className="mt-7 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2">
      <button disabled={working} onClick={() => onCertificationChange(!profile.is_certified)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/30 px-4 py-3 text-sm font-bold text-blue-200 hover:bg-blue-400/10 disabled:opacity-50"><ShieldCheck className="h-4 w-4" /> {profile.is_certified ? 'Retirer la certification' : 'Certifier le compte'}</button>
      <button disabled={working} onClick={() => onSuspensionChange(!suspended)} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50 ${suspended ? 'border-green-400/30 text-green-200 hover:bg-green-400/10' : 'border-red-400/30 text-red-200 hover:bg-red-500/10'}`}>{suspended ? 'Réactiver le compte' : 'Désactiver le compte'}</button>
      {profile.approval_status === 'pending' && <>
        <button disabled={working} onClick={onReject} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/30 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/10 disabled:opacity-50"><X className="h-4 w-4" /> Refuser le compte</button>
        <button disabled={working} onClick={onApprove} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50"><Check className="h-4 w-4" /> Approuver le compte</button>
      </>}
    </div>
    {showWithdrawalActions && <ProfileWithdrawalReview profileId={profile.id} />}
    <p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Reçu le {new Date(profile.created_at).toLocaleDateString('fr-FR')}</p>
  </article>;
}

function ProfileWithdrawalReview({ profileId }: { profileId: string }) {
  const [request, setRequest] = useState<PendingWithdrawal | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void supabase.rpc('get_pending_withdrawals').then(({ data, error: loadError }) => {
      if (!mounted) return;
      setLoading(false);
      if (loadError) {
        setError('La demande de retrait n’a pas pu être chargée.');
        return;
      }
      const match = ((data ?? []) as PendingWithdrawal[]).find((item) => item.user_id === profileId) ?? null;
      setRequest(match);
    });
    return () => { mounted = false; };
  }, [profileId]);

  const review = async (status: 'approved' | 'rejected') => {
    if (!request) return;
    setWorking(true);
    setError(null);
    setMessage(null);
    const { error: reviewError } = await supabase.rpc('review_withdrawal_request', { p_request_id: request.request_id, p_status: status });
    setWorking(false);
    if (reviewError) {
      setError('La demande n’a pas pu être traitée.');
      return;
    }
    setRequest(null);
    setMessage(status === 'approved' ? 'Le retrait a été accepté.' : 'Le retrait a été refusé.');
  };

  return <div className="mt-7 border-t border-blue-400/20 pt-6">
    <div className="flex items-center gap-2"><Banknote className="h-5 w-5 text-blue-300" /><p className="text-sm font-bold uppercase tracking-[.1em] text-slate-300">Retrait de cet utilisateur</p></div>
    {loading ? <div className="mt-5 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin text-blue-300" /> Recherche d’une demande en attente…</div> : request ? <div className="mt-5 rounded-2xl border border-blue-400/20 bg-[#0b1524] p-5"><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wider text-slate-500">Montant</p><p className="mt-1 text-xl font-black text-green-300">{Number(request.amount).toLocaleString('fr-FR')} XOF</p></div><div><p className="text-xs uppercase tracking-wider text-slate-500">Moyen de paiement</p><p className="mt-1 text-slate-200">{request.payment_method}</p></div><div><p className="text-xs uppercase tracking-wider text-slate-500">Téléphone</p><p className="mt-1 text-slate-200">{request.phone || '—'}</p></div><div><p className="text-xs uppercase tracking-wider text-slate-500">Pays et ville</p><p className="mt-1 text-slate-200">{request.country} · {request.city}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button disabled={working} onClick={() => void review('rejected')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/30 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/10 disabled:opacity-50"><X className="h-4 w-4" /> Refuser le retrait</button><button disabled={working} onClick={() => void review('approved')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50"><Check className="h-4 w-4" /> Accepter le retrait</button></div></div> : <p className="mt-4 text-sm text-slate-400">Aucune demande de retrait en attente pour cet utilisateur.</p>}
    {error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    {message && <p className="mt-4 rounded-xl border border-green-400/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">{message}</p>}
  </div>;
}
