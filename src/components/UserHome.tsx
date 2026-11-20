import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Home, Loader2, LogOut, Play, RotateCcw, ShieldCheck, UserRound, Video } from 'lucide-react';
import VideoTab from '@/components/VideoTab';
import { recommended } from '@/data/content';
import { countries, getCountry, getPaymentMethods, getPlanRewardAmount } from '@/data/locations';
import { supabase } from '@/lib/supabase';

interface UserHomeProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  birth_date?: string | null;
  gender?: string | null;
  account_type?: string | null;
  is_certified: boolean;
  suspended_at: string | null;
}

interface UserHomeProps {
  profile: UserHomeProfile;
  onSignOut: () => void;
}

type UserTab = 'home' | 'video' | 'withdrawal' | 'profile';
interface Activity { watched: boolean; liked: boolean; disliked: boolean; favorited: boolean; }
type ActivityKey = 'watched' | 'liked' | 'disliked' | 'favorited';

const recommendationLabels = ['Recommandation 1', 'Recommandation 2', 'Recommandation 3', 'Recommandation 4'];

export default function UserHome({ profile, onSignOut }: UserHomeProps) {
  const [tab, setTab] = useState<UserTab>('home');
  const [activities, setActivities] = useState<Record<string, Activity>>({});
  const [activityError, setActivityError] = useState<string | null>(null);
  const firstName = profile.first_name || 'vous';
  const rewardAmount = getPlanRewardAmount(profile.account_type);

  useEffect(() => {
    let mounted = true;
    void supabase.from('user_content_activity').select('content_id, watched, liked, disliked, favorited').eq('user_id', profile.id).then(({ data, error }) => {
      if (!mounted) return;
      if (error) { setActivityError('Les statistiques ne sont pas disponibles pour le moment.'); return; }
      const next: Record<string, Activity> = {};
      (data ?? []).forEach((row) => { next[row.content_id] = { watched: row.watched, liked: row.liked, disliked: row.disliked, favorited: row.favorited }; });
      setActivities(next);
    });
    return () => { mounted = false; };
  }, [profile.id]);

  const updateActivity = async (contentId: string, key: ActivityKey, forcedValue?: boolean) => {
    const current = activities[contentId] ?? { watched: false, liked: false, disliked: false, favorited: false };
    const next = { ...current, [key]: forcedValue ?? !current[key] };
    if (key === 'liked' && next.liked) next.disliked = false;
    if (key === 'disliked' && next.disliked) next.liked = false;
    setActivities((value) => ({ ...value, [contentId]: next }));
    setActivityError(null);
    const { error } = await supabase.from('user_content_activity').upsert({ content_id: contentId, watched: next.watched, liked: next.liked, disliked: next.disliked, favorited: next.favorited, updated_at: new Date().toISOString() }, { onConflict: 'user_id,content_id' });
    if (error) {
      setActivities((value) => ({ ...value, [contentId]: current }));
      setActivityError('Cette action n’a pas pu être enregistrée.');
    }
  };

  const markWatched = async (contentId: string) => {
    if (activities[contentId]?.watched) return;
    await updateActivity(contentId, 'watched', true);
  };

  const counts = useMemo(() => Object.values(activities).reduce((result, activity) => ({
    watched: result.watched + Number(activity.watched),
    liked: result.liked + Number(activity.liked),
    favorited: result.favorited + Number(activity.favorited),
    rewarded: result.rewarded + Number(activity.watched && activity.liked && activity.favorited),
  }), { watched: 0, liked: 0, favorited: 0, rewarded: 0 }), [activities]);

  return <div className="user-home min-h-screen bg-[#090d14] pb-24 text-slate-100">
    <header className="border-b border-white/10 bg-[#0b0f17] px-5 py-5 sm:px-10"><div className="mx-auto flex max-w-6xl items-center justify-between"><div className="flex items-center gap-2"><span className="google-mark">G</span><span className="text-2xl font-bold tracking-tight text-white">Google</span><span className="rounded-lg bg-[#4285f4] px-2.5 py-1 text-lg font-bold text-white shadow-[0_0_20px_rgba(66,133,244,.4)]">TV</span></div><button onClick={onSignOut} className="inline-flex items-center gap-2 rounded-xl bg-[#171c25] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-[#222936] hover:text-white sm:px-6"><LogOut className="h-4 w-4" /> Déconnexion</button></div></header>
    <main className="mx-auto max-w-6xl px-5 sm:px-10">
      {tab === 'home' && <HomeTab firstName={firstName} isCertified={profile.is_certified} />}
      {tab === 'video' && <VideoTab activities={activities} rewardAmount={rewardAmount} onActivity={updateActivity} onWatched={markWatched} />}
      {tab === 'withdrawal' && <WithdrawalTab profile={profile} counts={counts} rewardAmount={rewardAmount} />}
      {tab === 'profile' && <ProfileTab profile={profile} />}
      {activityError && <p className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-red-400/30 bg-[#2a1720] px-4 py-3 text-sm text-red-200 shadow-xl">{activityError}</p>}
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#11151e]/95 px-3 py-3 shadow-[0_-12px_35px_rgba(0,0,0,.35)] backdrop-blur-xl"><div className="mx-auto grid max-w-2xl grid-cols-4 gap-2">{([{ id: 'home', label: 'Accueil', icon: Home }, { id: 'video', label: 'Vidéo', icon: Video }, { id: 'withdrawal', label: 'Retrait', icon: RotateCcw }, { id: 'profile', label: 'Profil', icon: UserRound }] as const).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition sm:text-sm ${tab === id ? 'text-blue-400' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}><Icon className="h-6 w-6" strokeWidth={tab === id ? 2.5 : 2} /><span>{label}</span></button>)}</div></nav>
  </div>;
}

function HomeTab({ firstName, isCertified }: { firstName: string; isCertified: boolean }) {
  return <div className="pb-10"><section className="relative -mx-5 min-h-[520px] overflow-hidden sm:-mx-10 sm:min-h-[600px]"><img src={recommended[0].image} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-70" /><div className="absolute inset-0 bg-gradient-to-r from-[#090d14] via-[#090d14]/75 to-transparent" /><div className="absolute inset-0 bg-gradient-to-t from-[#090d14] via-transparent to-[#090d14]/20" /><div className="relative flex min-h-[520px] items-end px-5 pb-14 sm:min-h-[600px] sm:px-10 sm:pb-20"><div className="max-w-2xl"><h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl">Bonjour, <span className="hero-gradient">{firstName}</span>{isCertified && <span className="ml-3 inline-flex items-center gap-2 align-middle rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1 text-sm font-bold text-blue-200 sm:text-base"><ShieldCheck className="h-4 w-4" /> Certifié</span>}</h1><p className="mt-6 max-w-xl text-xl leading-8 text-slate-300 sm:text-2xl">Bienvenue sur Google TV. Découvrez des milliers de films et séries adaptés à vos goûts.</p><button className="primary-button mt-8 inline-flex items-center gap-2 rounded-xl px-5 py-3.5 font-bold"><Play className="h-5 w-5 fill-current" /> Découvrir</button></div></div></section><section className="pt-12 sm:pt-16"><h2 className="text-3xl font-black text-white sm:text-4xl">Recommandés pour vous</h2><div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">{recommendationLabels.map((label, index) => { const show = recommended[index]; return <article key={label} className="group overflow-hidden rounded-3xl border border-white/10 bg-[#141a24] transition duration-300 hover:-translate-y-1 hover:border-blue-400/60"><div className="relative aspect-[.76] overflow-hidden"><img src={show.image} alt={label} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#10151f] to-transparent" /><div className="absolute bottom-3 left-3 right-3"><p className="text-base font-bold text-white sm:text-lg">Contenu {index + 1}</p><p className="mt-1 text-xs text-slate-300 sm:text-sm">Exclusif · 2026</p></div></div><div className="p-3 sm:p-4"><p className="text-xs font-semibold uppercase tracking-wide text-blue-300">{label}</p></div></article>; })}</div></section></div>;
}

function WithdrawalTab({ profile, counts, rewardAmount }: { profile: UserHomeProfile; counts: { watched: number; liked: number; favorited: number; rewarded: number }; rewardAmount: number }) {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [withdrawalCountry, setWithdrawalCountry] = useState(profile.country ?? '');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(profile.phone?.replace(/^\+\d+\s?/, '') ?? '');
  const [withdrawalCode, setWithdrawalCode] = useState('');
  const [codeStep, setCodeStep] = useState(false);
  const [codeReady, setCodeReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [committedAmount, setCommittedAmount] = useState(0);
  const [balanceReady, setBalanceReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const beneficiary = `${profile.first_name} ${profile.last_name}`.trim();
  const paymentMethods = getPaymentMethods(withdrawalCountry);
  const dialCode = getCountry(withdrawalCountry)?.dialCode ?? '+';
  const earnedBalance = counts.rewarded * rewardAmount;
  const availableBalance = balanceReady ? Math.max(0, earnedBalance - committedAmount) : 0;

  useEffect(() => {
    let mounted = true;
    void supabase.from('withdrawal_requests').select('amount').eq('user_id', profile.id).in('status', ['pending', 'approved']).then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setBalanceReady(false);
        setErrorMessage('Le solde disponible ne peut pas être vérifié pour le moment.');
        return;
      }
      setCommittedAmount((data ?? []).reduce((total, row) => total + Number(row.amount), 0));
      setBalanceReady(true);
    });
    return () => { mounted = false; };
  }, [profile.id]);

  useEffect(() => {
    if (!codeStep) return undefined;
    setCodeReady(false);
    const timer = window.setTimeout(() => setCodeReady(true), 3000);
    return () => window.clearTimeout(timer);
  }, [codeStep]);

  const beginSubmit = () => {
    setErrorMessage(null);
    setWithdrawalCode('');
    setCodeStep(true);
  };

  const submit = async () => {
    if (!withdrawalCode.trim()) {
      setErrorMessage('Saisissez votre code de retrait.');
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    const { error } = await supabase.rpc('submit_withdrawal_request', { p_amount: Number(amount), p_payment_method: paymentMethod, p_phone: phone, p_country: withdrawalCountry, p_city: profile.city ?? '', p_payment_code: withdrawalCode.trim() });
    setSubmitting(false);
    if (error) {
      if (error.message.includes('payment code')) setErrorMessage('Le code de retrait est incorrect. Vérifiez-le puis réessayez.');
      else if (error.message.includes('already pending')) setErrorMessage('Une demande de retrait est déjà en attente. Elle doit être traitée avant une nouvelle demande.');
      else if (error.message.includes('not eligible')) setErrorMessage('Votre compte ne peut pas effectuer ce retrait pour le moment. Veuillez contacter l’administrateur.');
      else if (error.message.includes('exceeds')) setErrorMessage('Le montant demandé dépasse votre solde disponible.');
      else setErrorMessage('Votre demande n’a pas pu être envoyée. Veuillez vérifier les informations puis réessayer.');
      return;
    }
    setSubmitted(true);
  };

  if (submitted) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-blue-400/30 bg-[#141a24] p-8 text-center shadow-2xl sm:p-12"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Votre demande de retrait est en cours de vérification</h1><p className="mt-4 leading-7 text-slate-400">Notre équipe vérifie votre demande. Vous serez informé dès qu’elle sera traitée.</p></div></section>;

  const numericAmount = Number(amount);
  const canSubmit = balanceReady && !submitting && paymentMethod !== '' && withdrawalCountry !== '' && phone.trim() !== '' && numericAmount > 0 && numericAmount <= availableBalance;
  return <section className="py-9 sm:py-14"><div className="grid gap-6 sm:grid-cols-4"><StatCard label="Nombre de vidéo regardée" value={counts.watched} /><StatCard label="Nombre de vidéo aimée" value={counts.liked} /><StatCard label="Nombre de favoris" value={counts.favorited} /><StatCard label="Récompenses validées" value={counts.rewarded} /></div><div className="mx-auto mt-8 max-w-3xl rounded-[30px] border border-blue-400/40 bg-[linear-gradient(145deg,#192c49,#102329)] px-5 py-8 text-center shadow-[0_20px_55px_rgba(24,87,120,.18)] sm:px-10"><p className="text-sm font-bold uppercase tracking-[.28em] text-blue-400">Solde disponible</p><p className="mt-5 text-5xl font-black tracking-tight text-white sm:text-7xl">{availableBalance.toLocaleString('fr-FR')} FCFA</p><p className="mt-5 text-base text-slate-500 sm:text-lg">{counts.rewarded} vidéo(s) regardée(s), aimée(s) et ajoutée(s) aux favoris · {rewardAmount.toLocaleString('fr-FR')} FCFA par vidéo</p>{committedAmount > 0 && <p className="mt-3 text-sm font-semibold text-amber-200">{committedAmount.toLocaleString('fr-FR')} FCFA sont déjà réservés par une demande en attente ou approuvée.</p>}</div><div className="mx-auto mt-8 max-w-3xl rounded-[30px] border border-slate-400/20 bg-[#242c40] p-5 shadow-2xl sm:p-10"><h1 className="sr-only">Retrait</h1>{codeStep ? <div className="text-center"><h2 className="text-2xl font-black text-white">Confirmation du retrait</h2>{!codeReady ? <div className="py-12"><Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-400" /><p className="mt-5 text-slate-300">Préparation de la confirmation…</p></div> : <div className="mt-8 text-left"><p className="mb-6 text-sm leading-6 text-slate-300">Saisissez le code de retrait communiqué par l’administrateur pour lancer votre demande.</p><WithdrawalField label="Code de retrait"><input type="text" autoComplete="one-time-code" value={withdrawalCode} onChange={(event) => setWithdrawalCode(event.target.value)} placeholder="Saisissez votre code" className="withdrawal-input" /></WithdrawalField>{errorMessage && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</p>}<button onClick={() => void submit()} disabled={submitting || !withdrawalCode.trim()} className="primary-button w-full rounded-2xl px-5 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Vérification en cours…' : 'Confirmer le retrait'}</button><button onClick={() => setCodeStep(false)} disabled={submitting} className="mt-3 w-full rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50">Modifier les informations</button></div>}</div> : <><WithdrawalField label="Moyen de paiement"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="withdrawal-input"><option value="">-- Choisir un moyen de paiement --</option>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></WithdrawalField><WithdrawalField label="Nom complet du bénéficiaire"><input value={beneficiary} readOnly className="withdrawal-input" /></WithdrawalField><div className="grid gap-5 sm:grid-cols-2"><WithdrawalField label="Pays"><select value={withdrawalCountry} onChange={(event) => { setWithdrawalCountry(event.target.value); setPaymentMethod(''); }} className="withdrawal-input"><option value="">-- Choisir un pays --</option>{countries.map((country) => <option key={country.name} value={country.name}>{country.name}</option>)}</select></WithdrawalField><WithdrawalField label="Ville"><input value={profile.city ?? '—'} readOnly className="withdrawal-input" /></WithdrawalField></div><WithdrawalField label="Numéro de compte Mobile Money"><div className="flex overflow-hidden rounded-2xl bg-[#0b0f16]"><span className="flex items-center border-r border-white/10 px-4 text-lg text-slate-400">{dialCode}</span><input type="tel" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="77 000 00 00" className="withdrawal-input rounded-none bg-transparent" /></div></WithdrawalField><WithdrawalField label="Montant à retirer"><input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={`Ex : ${availableBalance.toLocaleString('fr-FR')}`} className="withdrawal-input" /></WithdrawalField>{errorMessage && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</p>}<button onClick={beginSubmit} disabled={!canSubmit} className="primary-button w-full rounded-2xl px-5 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50">Continuer vers la confirmation</button></>}</div></section>;
}

function StatCard({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-white/10 bg-[#141a24] p-5"><p className="text-sm leading-6 text-slate-400">{label}</p><p className="mt-2 text-4xl font-black text-white">{value}</p></div>; }
function WithdrawalField({ label, children }: { label: string; children: ReactNode }) { return <label className="mb-6 block"><span className="mb-3 block text-sm font-bold uppercase tracking-[.1em] text-slate-300">{label}</span>{children}</label>; }
function ProfileTab({ profile }: { profile: UserHomeProfile }) { const identifier = `ID-${profile.id.split('-').join('').slice(0, 15).toUpperCase()}`; const details = [['Numéro d’identification', identifier], ['Prénom', profile.first_name], ['Nom', profile.last_name], ['Adresse mail', profile.email ?? '—'], ['Téléphone', profile.phone ?? '—'], ['Pays', profile.country ?? '—'], ['Ville', profile.city ?? '—'], ['Date de naissance', profile.birth_date ?? '—'], ['Genre', profile.gender ?? '—']]; return <section className="mx-auto max-w-3xl py-12 sm:py-16"><p className="text-sm font-bold uppercase tracking-[.2em] text-blue-300">Mon compte</p><h1 className="mt-3 text-4xl font-black text-white">Profil</h1><p className="mt-3 text-slate-400">Vos informations personnelles</p><div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#141a24]">{details.map(([label, value]) => <div key={label} className="flex flex-col gap-1 border-b border-white/10 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-7"><span className="text-slate-400">{label}</span><span className="break-all font-semibold text-white sm:text-right">{value}</span></div>)}</div></section>; }
