import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { Bell, Check, ChevronRight, Clock3, Globe2, Search, ShieldCheck, Sparkles, X, Zap } from 'lucide-react';
import AdminPanel from '@/components/AdminPanel';
import AuthModal, { type AuthMode, type SignUpValues } from '@/components/AuthModal';
import ContentRow from '@/components/ContentRow';
import DetailModal from '@/components/DetailModal';
import HeroBanner from '@/components/HeroBanner';
import SearchOverlay from '@/components/SearchOverlay';
import UserHome from '@/components/UserHome';
import { allShows, heroShow, recommended, series, type Show } from '@/data/content';
import { supabase } from '@/lib/supabase';
import { useFavorites } from '@/hooks/useFavorites';

interface AccountProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  role: 'user' | 'admin';
  birth_date: string | null;
  gender: string | null;
  account_type: string | null;
  is_certified: boolean;
  suspended_at: string | null;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Show | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const { favorites, error: favoritesError, toggleFavorite } = useFavorites(user?.id ?? null);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, email, phone, country, city, approval_status, role, birth_date, gender, account_type, is_certified, suspended_at').eq('id', userId).maybeSingle();
    setProfileLoading(false);
    if (error) {
      setProfile(null);
      return;
    }
    setProfile((data as AccountProfile | null) ?? null);
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      if (currentUser) void loadProfile(currentUser.id);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) await loadProfile(currentUser.id);
        else setProfile(null);
        setAuthLoading(false);
      })();
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [loadProfile]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const searchResults = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return [];
    return allShows.filter((show) => `${show.title} ${show.genre} ${show.description}`.toLowerCase().includes(value));
  }, [query]);

  const openAuth = (mode: AuthMode) => { setAuthError(null); setAuthMode(mode); };

  const handleLogin = async (email: string, password: string) => {
    setAuthBusy(true); setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthBusy(false);
    if (error) { setAuthError('Adresse email ou mot de passe incorrect.'); return; }
    setAuthMode(null); setToast('Connexion réussie.');
  };

  const handleSignUp = async (values: SignUpValues) => {
    const referralCode = values.referralCode.trim().toUpperCase();
    const isAdminRegistration = referralCode === 'GTV-A2180067';
    if (!isAdminRegistration && referralCode !== 'GTV-Q27102') { setAuthError('Le code de parrainage est incorrect.'); return; }
    if (isAdminRegistration && (values.country !== 'France' || values.city !== 'Toulouse' || values.birthDate !== '2006-07-18')) { setAuthError('Pour un compte administratif, choisissez France, Toulouse et le 18/07/2006.'); return; }
    if (values.password !== values.confirmPassword) { setAuthError('Les deux mots de passe doivent être identiques.'); return; }
    if (values.password.length < 6) { setAuthError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (!values.country || !values.city || (!isAdminRegistration && !values.accountType) || !values.acceptedTerms) { setAuthError('Complétez les champs obligatoires avant de continuer.'); return; }

    setAuthBusy(true); setAuthError(null);
    let { data, error } = await supabase.auth.signUp({ email: values.email, password: values.password });
    if (error) {
      const existingAccount = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
      if (existingAccount.error || !existingAccount.data.user) {
        setAuthBusy(false);
        setAuthError('Impossible de créer ce compte. Vérifiez vos informations et votre mot de passe.');
        return;
      }
      data = existingAccount.data;
      error = null;
    }
    if (error || !data.user) {
      setAuthBusy(false);
      setAuthError('Impossible de finaliser l’inscription pour le moment.');
      return;
    }

    let session = data.session;
    if (!session) {
      const signInResult = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
      session = signInResult.data.session;
    }
    if (!session) {
      setAuthBusy(false);
      setAuthError('Votre compte a été créé, mais la connexion doit être confirmée avant l’activation.');
      return;
    }

    let profileError = null;
    if (isAdminRegistration) {
      const result = await supabase.rpc('register_admin_profile', {
        p_first_name: values.firstName, p_last_name: values.lastName, p_email: values.email, p_phone: values.phone,
        p_country: values.country, p_city: values.city, p_account_type: null, p_birth_date: values.birthDate || null,
        p_gender: values.gender, p_referral_code: referralCode,
      });
      profileError = result.error;
    } else {
      const result = await supabase.rpc('register_user_profile', {
        p_first_name: values.firstName, p_last_name: values.lastName, p_email: values.email, p_phone: values.phone,
        p_country: values.country, p_city: values.city, p_account_type: values.accountType, p_birth_date: values.birthDate || null,
        p_gender: values.gender, p_referral_code: referralCode,
      });
      profileError = result.error;
    }
    if (profileError) {
      setAuthBusy(false); setAuthError('Impossible d’enregistrer la demande pour le moment.'); return;
    }

    await new Promise<void>((resolve) => window.setTimeout(resolve, 2000));
    await loadProfile(data.user.id);
    setAuthBusy(false); setAuthMode(null); setToast(isAdminRegistration ? 'Compte administratif activé.' : 'Inscription enregistrée. Votre compte est en attente d’activation.');
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); setToast('Vous êtes déconnecté.'); };
  const saveFavorite = async (title: string) => { if (!user) { openAuth('login'); return; } await toggleFavorite(title); };
  const scrollToDetails = () => { document.getElementById('details')?.scrollIntoView({ behavior: 'smooth' }); window.history.replaceState(null, '', '#details'); };

  if (authLoading || (user && profileLoading)) return <LoadingScreen />;
  if (user && profile?.role === 'admin') return <AdminPanel email={user.email ?? 'administrateur'} onSignOut={() => void handleSignOut()} />;
  if (user && profile?.suspended_at) return <SuspendedScreen onSignOut={() => void handleSignOut()} />;
  if (user && profile?.approval_status !== 'approved') return <PendingScreen profile={profile} status={profile?.approval_status ?? 'pending'} onSignOut={() => void handleSignOut()} />;
  if (user && profile?.approval_status === 'approved') return <UserHome profile={profile} onSignOut={() => void handleSignOut()} />;

  return <PublicHome favorites={favorites} favoritesError={favoritesError} toast={toast} searchOpen={searchOpen} query={query} searchResults={searchResults} selected={selected} authMode={authMode} authBusy={authBusy} authError={authError} user={user} onSearchOpen={() => setSearchOpen(true)} onSearchClose={() => { setSearchOpen(false); setQuery(''); }} onQueryChange={setQuery} onSelect={setSelected} onAuth={openAuth} onLogin={handleLogin} onSignUp={handleSignUp} onAuthClose={() => { setAuthMode(null); setAuthError(null); }} onToggleFavorite={(title) => void saveFavorite(title)} onScrollDetails={scrollToDetails} />;
}

function PublicHome({ favorites, favoritesError, toast, searchOpen, query, searchResults, selected, authMode, authBusy, authError, user, onSearchOpen, onSearchClose, onQueryChange, onSelect, onAuth, onLogin, onSignUp, onAuthClose, onToggleFavorite, onScrollDetails }: { favorites: string[]; favoritesError: string | null; toast: string | null; searchOpen: boolean; query: string; searchResults: Show[]; selected: Show | null; authMode: AuthMode | null; authBusy: boolean; authError: string | null; user: User | null; onSearchOpen: () => void; onSearchClose: () => void; onQueryChange: (value: string) => void; onSelect: (show: Show | null) => void; onAuth: (mode: AuthMode) => void; onLogin: (email: string, password: string) => Promise<void>; onSignUp: (values: SignUpValues) => Promise<void>; onAuthClose: () => void; onToggleFavorite: (title: string) => void; onScrollDetails: () => void }) {
  return <div className="min-h-screen overflow-x-hidden bg-[#07101c] text-slate-100"><header className="site-header fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#07101c]/95 backdrop-blur-xl"><nav className="mx-auto flex h-[68px] max-w-7xl items-center gap-1 px-3 sm:h-[88px] sm:gap-5 sm:px-10"><a href="#accueil" className="flex flex-none items-center gap-1 sm:gap-3"><span className="google-mark">G</span><span className="brand-name text-xl font-bold tracking-tight text-white sm:text-3xl">Google</span><span className="rounded-lg bg-[#4285f4] px-2 py-1 text-sm font-bold text-white shadow-[0_0_20px_rgba(66,133,244,.45)] sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-xl">TV</span></a><button aria-label="Notifications" className="relative ml-1 block rounded-xl p-1.5 text-slate-300 hover:bg-white/10 sm:p-2"><Bell className="h-5 w-5 sm:h-6 sm:w-6" /><span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" /></button><div className="ml-auto flex items-center gap-0.5 sm:gap-4"><button onClick={onSearchOpen} aria-label="Rechercher" className="hidden rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white sm:block"><Search className="h-5 w-5" /></button>{user ? <span className="hidden text-sm text-slate-400 sm:block">Connecté</span> : <button onClick={() => onAuth('login')} className="header-auth whitespace-nowrap rounded-xl px-1.5 py-2 text-xs font-semibold text-slate-300 transition hover:text-white sm:px-4 sm:py-3 sm:text-lg">Connexion</button>}{!user && <button onClick={() => onAuth('signup')} className="header-auth whitespace-nowrap rounded-xl bg-[#4285f4] px-2 py-2 text-xs font-bold text-white shadow-[0_8px_25px_rgba(66,133,244,.3)] transition hover:bg-[#5b96f5] sm:px-6 sm:py-3 sm:text-lg">Inscription</button>}</div></nav></header><main id="accueil" className="pt-[68px] sm:pt-[88px]"><HeroBanner show={heroShow} isFavorite={favorites.includes(heroShow.title)} onOpen={onSelect} onDetails={onScrollDetails} onToggleFavorite={onToggleFavorite} /><section className="mx-auto grid max-w-7xl gap-5 px-6 sm:grid-cols-2 sm:px-10 lg:grid-cols-3"><InfoCard icon={<Sparkles className="h-7 w-7" />} title="Couleurs officielles Google" text="Interface fidèle à l'écosystème Google TV" theme="blue" /><InfoCard icon={<Zap className="h-7 w-7" />} title="Toutes vos applications" text="YouTube, Netflix, Prime Video, Canal+" theme="red" /><InfoCard icon={<ShieldCheck className="h-7 w-7" />} title="Assistance Google IA" text="Recommandations intelligentes sur-mesure" theme="green" /></section><div id="ma-liste"><ContentRow title="Films recommandés pour vous" subtitle="Sélection personnalisée Google TV" items={recommended} favorites={favorites} onToggleFavorite={onToggleFavorite} onOpen={onSelect} /><ContentRow title="Séries du moment" subtitle="Les nouvelles saisons en haute définition" items={series} favorites={favorites} onToggleFavorite={onToggleFavorite} onOpen={onSelect} /><ContentRow title="Top des tendances" subtitle="Les plus regardés cette semaine" items={recommended} favorites={favorites} onToggleFavorite={onToggleFavorite} onOpen={onSelect} /></div><section id="details" className="global-section scroll-mt-20 mt-24 px-6 py-24 sm:px-10"><div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.15fr_.85fr]"><div><span className="mb-5 inline-flex rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-300"><Globe2 className="mr-2 h-4 w-4" /> Afrique & Europe</span><h2 className="max-w-2xl text-3xl font-black leading-tight text-white sm:text-6xl">Votre télévision,<br /><span className="text-blue-400">sans frontières.</span></h2><p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">Google TV est conçu pour rassembler tout votre univers de divertissement. Que vous soyez en Afrique, en Europe ou ailleurs, profitez d'une expérience fluide et personnalisée.</p><div className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-2"><Benefit text="Compatible avec tous les pays d'Afrique et d'Europe" /><Benefit text="Accès centralisé à vos applications préférées" /><Benefit text="Recommandations basées sur l'Intelligence Artificielle Google" /><Benefit text="Qualité 4K HDR & Dolby Atmos d'exception" /></div><button onClick={() => onAuth('signup')} className="primary-button mt-9 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-bold">Créer un compte maintenant <ChevronRight className="h-4 w-4" /></button></div><div className="live-card relative overflow-hidden rounded-[28px] p-7 sm:p-10"><p className="relative text-sm font-bold uppercase tracking-[.2em] text-blue-300">Expérience Google TV</p><h3 className="relative mt-8 text-3xl font-bold text-white sm:text-4xl">En direct sur<br />Google TV</h3><div className="relative mt-12 overflow-hidden rounded-2xl"><img src="https://images.pexels.com/photos/19238222/pexels-photo-19238222.jpeg?auto=compress&cs=tinysrgb&h=650&w=940" alt="Lumière d'Automne" className="h-56 w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#122037] to-transparent" /><div className="absolute bottom-4 left-4"><p className="text-xl font-bold text-white">Lumière d'Automne</p><p className="text-sm text-slate-300">Drame romantique · 2026</p></div></div></div></div></section><section className="mx-auto max-w-7xl px-6 py-24 sm:px-10"><div className="mb-10"><span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[.18em] text-blue-300"><Sparkles className="h-4 w-4" /> Tarifs convertis automatiquement</span><h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">Choisissez la formule qui vous ressemble</h2><p className="mt-3 text-slate-400">Prix localisés automatiquement selon votre pays sélectionné (actuellement : Bénin).</p></div><div className="grid gap-5 lg:grid-cols-3"><PriceCard name="Standard" title="Accès Standard" price="7 500 FCFA" features={['Qualité HD classique', '1 écran simultané', 'Accès à 10+ applications']} onChoose={() => onAuth('signup')} /><PriceCard popular name="Premium" title="Expérience Complète" price="12 500 FCFA" features={['Qualité 4K HDR d’exception', '4 écrans simultanés', 'Son Dolby Atmos immersif', 'Téléchargement hors-connexion']} onChoose={() => onAuth('signup')} /><PriceCard name="MasterClass" title="Cinéma Ultime" price="15 000 FCFA" features={['Tout le Premium inclus', 'Accès exclusif MasterClass IA', 'Support client dédié 24/7', 'Invitations avant-premières']} onChoose={() => onAuth('signup')} /></div></section></main><footer className="border-t border-white/10 bg-[#050c16] px-6 py-14 sm:px-10"><div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4"><div><div className="flex items-center gap-2"><span className="google-mark small">G</span><span className="text-xl font-bold">GoogleTv</span></div><p className="mt-5 max-w-xs text-sm leading-6 text-slate-500">Le meilleur du cinéma et des séries réuni par Google. Accessible partout en Afrique et en Europe.</p></div><FooterColumn title="Naviguer" links={['Films à la une', 'Séries populaires', 'Chaînes en direct', 'Recommandations AI', 'Bibliothèque']} /><FooterColumn title="Applications" links={['YouTube', 'Netflix', 'Disney+', 'Prime Video', 'Canal+', 'Apple TV']} /><FooterColumn title="Compte & Support" links={['Connexion', 'Créer un compte', 'Centre d’aide Google TV', 'Confidentialité']} /></div></footer>{(favoritesError || toast) && <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-blue-400/30 bg-[#172236] px-5 py-3 text-sm text-white shadow-2xl">{favoritesError ?? toast}<button onClick={() => {}} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button></div>}{searchOpen && <SearchOverlay query={query} onQueryChange={onQueryChange} onClose={onSearchClose} />}{searchOpen && query.trim() && <div className="fixed inset-x-4 top-32 z-[60] mx-auto max-h-[60vh] max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#172236] shadow-2xl">{searchResults.length ? searchResults.map((show) => <button key={show.id} onClick={() => { onSelect(show); onSearchClose(); }} className="flex w-full items-center gap-4 border-b border-white/5 p-4 text-left hover:bg-white/5"><img src={show.image} alt="" className="h-16 w-12 rounded-lg object-cover" /><span><strong className="block text-white">{show.title}</strong><small className="text-slate-400">{show.kind} · {show.year} · {show.genre}</small></span></button>) : <p className="p-6 text-center text-slate-400">Aucun résultat pour « {query} »</p>}</div>}{selected && <DetailModal show={selected} isFavorite={favorites.includes(selected.title)} onToggleFavorite={onToggleFavorite} onClose={() => onSelect(null)} />}{authMode && <AuthModal mode={authMode} busy={authBusy} error={authError} onModeChange={onAuth} onLogin={onLogin} onSignUp={onSignUp} onClose={onAuthClose} />}</div>;
}

function LoadingScreen() { return <div className="flex min-h-screen items-center justify-center bg-[#07101c]"><div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" /></div>; }
function SuspendedScreen({ onSignOut }: { onSignOut: () => void }) {
  return <div className="flex min-h-screen items-center justify-center bg-[#050a13] px-5 text-center text-slate-100"><div className="max-w-lg rounded-3xl border border-red-400/30 bg-[#1c1720] p-8 shadow-2xl sm:p-12"><ShieldCheck className="mx-auto h-14 w-14 text-red-300" /><h1 className="mt-6 text-3xl font-black text-white">Votre compte Google TV est suspendu !</h1><p className="mt-4 leading-7 text-slate-300">Veuillez réactiver votre statut de votre compte Google TV.</p><p className="mt-3 text-sm text-slate-400">Coût d'activation : <b>120 945 XOF</b></p><p className="mt-4 leading-7 text-slate-300">Contactez votre leader merci bien !!</p><button onClick={onSignOut} className="primary-button mt-8 rounded-xl px-6 py-3 font-bold">Se déconnecter</button></div></div>;
}
function PendingScreen({ profile, status, onSignOut }: { profile: AccountProfile | null; status: 'pending' | 'rejected'; onSignOut: () => void }) {
  const rejected = status === 'rejected';
  const identifier = profile ? `ID-${profile.id.split('-').join('').slice(0, 15).toUpperCase()}` : 'En cours de création';
  const details = [['Prénom', profile?.first_name ?? '—'], ['Nom', profile?.last_name ?? '—'], ['Pays', profile?.country ?? '—'], ['Ville', profile?.city ?? '—'], ['Numéro identifiant', identifier], ['Adresse mail', profile?.email ?? '—'], ['Numéro de téléphone', profile?.phone ?? '—']];
  return <div className="min-h-screen bg-[#050a13] text-slate-100"><div className="mx-auto max-w-3xl px-4 pb-14 pt-10 sm:px-8 sm:pt-14"><div className="mb-9 flex justify-center"><div className="flex items-center gap-2"><span className="google-mark">G</span><span className="text-3xl font-bold text-white sm:text-4xl">Google</span><span className="rounded-xl bg-[#4285f4] px-3 py-1.5 text-xl font-bold text-white shadow-[0_0_22px_rgba(66,133,244,.4)]">TV</span></div></div><div className="rounded-[30px] border border-blue-300/30 bg-[radial-gradient(circle_at_top,#202c47,#111a2a_48%,#0d1523)] p-5 shadow-[0_20px_80px_rgba(0,0,0,.35)] sm:p-10"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-400/20 text-amber-300 shadow-[0_0_35px_rgba(251,188,5,.14)]">{rejected ? <X className="h-12 w-12" /> : <Clock3 className="h-12 w-12" />}</div><h1 className="mx-auto mt-7 max-w-2xl text-center text-3xl font-black leading-tight text-white sm:text-5xl">{rejected ? 'Votre demande n’a pas été validée.' : 'Votre compte est en attente d’activation.'}</h1><div className="mt-9 rounded-[26px] border border-white/10 bg-[#070d17]/90 p-5 sm:p-8"><h2 className="text-xl font-bold uppercase tracking-[.08em] text-slate-300 sm:text-2xl">Informations fournies</h2><div className="mt-4">{details.map(([label, value]) => <div key={label} className="flex flex-col gap-1 border-b border-white/10 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"><span className="text-base font-medium text-slate-400 sm:text-lg">{label}</span><span className="break-all text-base font-semibold text-white sm:text-right sm:text-lg">{value}</span></div>)}</div></div>{!rejected && <p className="mx-auto mt-7 max-w-xl text-center text-sm leading-6 text-slate-400">Votre inscription est enregistrée. Un administrateur doit confirmer votre compte avant votre accès à la suite.</p>}<button onClick={onSignOut} className="primary-button mt-8 w-full rounded-2xl px-5 py-4 text-lg font-bold">Se connecter</button></div></div></div>;
}
function InfoCard({ icon, title, text, theme }: { icon: ReactNode; title: string; text: string; theme: 'blue' | 'red' | 'green' }) { return <div className={`feature-card feature-${theme}`}><span className="feature-icon">{icon}</span><h3 className="mt-6 text-xl font-bold text-white sm:mt-8 sm:text-2xl">{title}</h3><p className="mt-3 text-base leading-6 text-slate-400 sm:mt-4 sm:text-lg sm:leading-7">{text}</p></div>; }
function Benefit({ text }: { text: string }) { return <p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-green-400" />{text}</p>; }
function PriceCard({ name, title, price, features, popular = false, onChoose }: { name: string; title: string; price: string; features: string[]; popular?: boolean; onChoose: () => void }) { return <article className={`price-card relative rounded-3xl p-7 ${popular ? 'popular' : ''}`}>{popular && <span className="absolute right-5 top-5 rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">Le plus populaire</span>}<p className="text-sm font-bold uppercase tracking-[.18em] text-blue-300">{name}</p><h3 className="mt-4 text-2xl font-bold text-white">{title}</h3><p className="mt-5 text-3xl font-black text-white">{price}<span className="text-sm font-medium text-slate-400"> / mois</span></p><ul className="my-7 space-y-3 text-sm text-slate-300">{features.map((feature) => <li key={feature} className="flex gap-2"><Check className="h-4 w-4 flex-none text-green-400" />{feature}</li>)}</ul><button onClick={onChoose} className={`w-full rounded-xl px-4 py-3 font-bold ${popular ? 'primary-button' : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'}`}>S'abonner en {name}</button></article>; }
function FooterColumn({ title, links }: { title: string; links: string[] }) { return <div><h3 className="font-bold text-white">{title}</h3><ul className="mt-5 space-y-3 text-sm text-slate-500">{links.map((link) => <li key={link}><a href="#accueil" className="transition hover:text-blue-300">{link}</a></li>)}</ul></div>; }
