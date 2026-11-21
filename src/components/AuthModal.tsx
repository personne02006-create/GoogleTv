import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, CalendarDays, Check, Eye, EyeOff, Globe2, LockKeyhole, Mail, MapPin, Phone, UserRound, X } from 'lucide-react';
import { countries, formatPlanPrice, getCountry } from '@/data/locations';

export type AuthMode = 'login' | 'signup';

export interface SignUpValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  accountType: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
  gender: string;
  referralCode: string;
  acceptedTerms: boolean;
}

interface AuthModalProps {
  mode: AuthMode;
  busy: boolean;
  error: string | null;
  onModeChange: (mode: AuthMode) => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (values: SignUpValues) => Promise<void>;
  onClose: () => void;
}

const defaultValues: SignUpValues = {
  firstName: '', lastName: '', email: '', phone: '', country: '', city: '', accountType: '', password: '', confirmPassword: '', birthDate: '', gender: 'Non spécifié', referralCode: '', acceptedTerms: false,
};

export default function AuthModal({ mode, busy, error, onModeChange, onLogin, onSignUp, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [values, setValues] = useState<SignUpValues>(defaultValues);
  const [showPassword, setShowPassword] = useState(false);
  const selectedCountry = useMemo(() => getCountry(values.country), [values.country]);
  const adminCandidate = values.country === 'France' && values.city === 'Toulouse' && values.birthDate === '2006-07-18' && values.referralCode.trim().toUpperCase() === 'GTV-A2180067';

  useEffect(() => {
    setEmail(''); setPassword(''); setValues(defaultValues); setShowPassword(false);
  }, [mode]);

  const updateValue = (key: keyof SignUpValues, value: string | boolean) => setValues((current) => ({ ...current, [key]: value }));
  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); await onLogin(email, password); };
  const handleSignUpSubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); await onSignUp(values); };

  return <div className="modal-backdrop fixed inset-0 z-50 overflow-y-auto p-4 sm:p-8" onClick={onClose}><div className="auth-panel mx-auto w-full max-w-2xl rounded-3xl" onClick={(event) => event.stopPropagation()}>
    <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-9"><div className="flex items-center gap-3"><span className="google-mark small">G</span><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-300">Google TV</p><h2 className="text-xl font-bold text-white">{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h2></div></div><button onClick={onClose} aria-label="Fermer" className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button></div>
    <div className="p-6 sm:p-9">{mode === 'login' ? <form onSubmit={handleLoginSubmit} className="space-y-5"><p className="mb-7 text-slate-400">Accédez à votre profil et votre bibliothèque.</p><Field label="Adresse email" icon={<Mail className="h-4 w-4" />}><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="exemple@google.com" className="form-input" /></Field><Field label="Mot de passe" icon={<LockKeyhole className="h-4 w-4" />}><div className="relative"><input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Votre mot de passe" className="form-input pr-12" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label="Afficher ou masquer le mot de passe" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field><div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-slate-400"><input type="checkbox" className="accent-blue-500" /> Se souvenir de moi</label><button type="button" className="text-blue-300 hover:text-blue-200">Mot de passe oublié ?</button></div>{error && <ErrorMessage message={error} />}<button disabled={busy} className="primary-button w-full rounded-xl px-5 py-3.5 font-bold disabled:opacity-60">{busy ? 'Connexion…' : 'Se connecter'}</button><p className="pt-3 text-center text-sm text-slate-400">Pas encore de compte ? <button type="button" onClick={() => onModeChange('signup')} className="font-semibold text-blue-300">Créer un compte</button></p></form> : <form onSubmit={handleSignUpSubmit} className="space-y-4"><button type="button" onClick={() => onModeChange('login')} className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-300"><ArrowLeft className="h-4 w-4" /> Retour à la connexion</button><div className="mb-5"><p className="text-lg font-semibold text-white">Afrique & Europe</p><p className="mt-1 text-sm leading-6 text-slate-400">Remplissez vos informations. Choisissez votre pays et la ville proposée apparaîtra automatiquement.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Prénom *" icon={<UserRound className="h-4 w-4" />}><input required value={values.firstName} onChange={(event) => updateValue('firstName', event.target.value)} placeholder="Marie" className="form-input" /></Field><Field label="Nom *" icon={<UserRound className="h-4 w-4" />}><input required value={values.lastName} onChange={(event) => updateValue('lastName', event.target.value)} placeholder="Durand" className="form-input" /></Field></div><Field label="Adresse email *" icon={<Mail className="h-4 w-4" />}><input required type="email" value={values.email} onChange={(event) => updateValue('email', event.target.value)} placeholder="exemple@google.com" className="form-input" /></Field><Field label="Téléphone *" icon={<Phone className="h-4 w-4" />}><input required type="tel" value={values.phone} onChange={(event) => updateValue('phone', event.target.value)} placeholder="Numéro de téléphone" className="form-input" /></Field><div className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><Field label="Pays de résidence *" icon={<Globe2 className="h-4 w-4 text-blue-300" />}><select required value={values.country} onChange={(event) => { updateValue('country', event.target.value); updateValue('city', ''); updateValue('accountType', ''); }} className="form-input"><option value="">Sélectionnez votre pays</option>{countries.map((country) => <option key={country.name} value={country.name}>{country.name}</option>)}</select></Field><div className="mt-4"><Field label="Ville *" icon={<MapPin className="h-4 w-4 text-green-400" />}><select required disabled={!selectedCountry} value={values.city} onChange={(event) => updateValue('city', event.target.value)} className="form-input disabled:cursor-not-allowed disabled:opacity-50"><option value="">{selectedCountry ? 'Sélectionnez votre ville' : 'Choisissez d’abord un pays'}</option>{selectedCountry?.cities.map((city) => <option key={city} value={city}>{city}</option>)}</select></Field></div></div><Field label={`Type de compte d’accès${adminCandidate ? '' : ' *'}`} icon={<UserRound className="h-4 w-4" />}><select required={!adminCandidate} disabled={!selectedCountry} value={values.accountType} onChange={(event) => updateValue('accountType', event.target.value)} className="form-input disabled:cursor-not-allowed disabled:opacity-50"><option value="">{adminCandidate ? 'Aucun type pour ce compte' : 'Sélectionner le type de compte'}</option>{['Standard', 'Premium', 'MasterClass'].map((plan) => <option key={plan} value={plan}>{plan} — {formatPlanPrice(plan, values.country)}</option>)}</select></Field>{selectedCountry && <p className="-mt-2 text-xs text-blue-300">Prix adaptés à {selectedCountry.name} ({selectedCountry.currency}).</p>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Mot de passe *" icon={<LockKeyhole className="h-4 w-4" />}><input required minLength={6} type={showPassword ? 'text' : 'password'} value={values.password} onChange={(event) => updateValue('password', event.target.value)} placeholder="6 caractères minimum (lettres, chiffres, symboles)" className="form-input" /></Field><Field label="Confirmer le mot de passe *" icon={<LockKeyhole className="h-4 w-4" />}><input required minLength={6} type={showPassword ? 'text' : 'password'} value={values.confirmPassword} onChange={(event) => updateValue('confirmPassword', event.target.value)} placeholder="Répétez le mot de passe" className="form-input" /></Field></div><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="text-xs font-semibold text-blue-300">{showPassword ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}</button><div className="grid gap-4 sm:grid-cols-2"><Field label="Date de naissance" icon={<CalendarDays className="h-4 w-4" />}><input type="date" value={values.birthDate} onChange={(event) => updateValue('birthDate', event.target.value)} className="form-input" /></Field><Field label="Genre" icon={<UserRound className="h-4 w-4" />}><select value={values.gender} onChange={(event) => updateValue('gender', event.target.value)} className="form-input"><option>Non spécifié</option><option>Femme</option><option>Homme</option><option>Autre</option></select></Field></div><Field label="Code de parrainage *" icon={<Check className="h-4 w-4 text-amber-300" />}><input required value={values.referralCode} onChange={(event) => updateValue('referralCode', event.target.value)} placeholder="Code de parrainage" className="form-input" /><span className="mt-1 block text-xs text-slate-500">Le code de parrainage valide est obligatoire.</span></Field><label className="flex items-start gap-3 py-2 text-sm leading-6 text-slate-400"><input required type="checkbox" checked={values.acceptedTerms} onChange={(event) => updateValue('acceptedTerms', event.target.checked)} className="mt-1 accent-blue-500" /> J’accepte les Conditions Google TV et la Politique de confidentialité.</label>{error && <ErrorMessage message={error} />}<button disabled={busy} className="primary-button w-full rounded-xl px-5 py-3.5 font-bold disabled:opacity-60">{busy ? 'Inscription en cours…' : 'Créer mon compte Google TV'}</button></form>}</div>
  </div></div>;
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) { return <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">{icon}{label}</span>{children}</label>; }
function ErrorMessage({ message }: { message: string }) { return <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{message}</p>; }
