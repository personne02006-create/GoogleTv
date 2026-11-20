export interface CountryInfo {
  name: string;
  dialCode: string;
  currency: 'XOF' | 'XAF' | 'EUR' | 'GBP' | 'CHF' | 'MAD' | 'TND' | 'EGP' | 'GHS' | 'NGN' | 'KES' | 'MUR' | 'RWF' | 'ZAR' | 'UGX' | 'ZMW' | 'DZD' | 'AOA' | 'BWP' | 'CVE' | 'CDF' | 'ERN' | 'SZL' | 'ETB' | 'GMD' | 'GNF' | 'LRD' | 'LYD' | 'LSL' | 'MGA' | 'MWK' | 'MRU' | 'MZN' | 'NAD' | 'STN' | 'SCR' | 'SLE' | 'SOS' | 'SSP' | 'SDG' | 'TZS' | 'ZWL' | 'BIF';
  locale: string;
  cities: string[];
}

export const countries: CountryInfo[] = [
  { name: 'Afrique du Sud', dialCode: '+27', currency: 'ZAR', locale: 'en-ZA', cities: ['Pretoria', 'Johannesburg', 'Le Cap', 'Durban'] },
  { name: 'Algérie', dialCode: '+213', currency: 'DZD', locale: 'fr-DZ', cities: ['Alger', 'Oran', 'Constantine'] },
  { name: 'Allemagne', dialCode: '+49', currency: 'EUR', locale: 'de-DE', cities: ['Berlin', 'Hambourg', 'Munich', 'Francfort'] },
  { name: 'Angola', dialCode: '+244', currency: 'AOA', locale: 'pt-AO', cities: ['Luanda', 'Huambo', 'Lobito'] },
  { name: 'Autriche', dialCode: '+43', currency: 'EUR', locale: 'de-AT', cities: ['Vienne', 'Graz', 'Linz', 'Salzbourg'] },
  { name: 'Belgique', dialCode: '+32', currency: 'EUR', locale: 'fr-BE', cities: ['Bruxelles', 'Anvers', 'Liège', 'Gand'] },
  { name: 'Bénin', dialCode: '+229', currency: 'XOF', locale: 'fr-FR', cities: ['Cotonou', 'Porto-Novo', 'Abomey-Calavi', 'Parakou'] },
  { name: 'Botswana', dialCode: '+267', currency: 'BWP', locale: 'en-BW', cities: ['Gaborone', 'Francistown', 'Maun'] },
  { name: 'Burkina Faso', dialCode: '+226', currency: 'XOF', locale: 'fr-FR', cities: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou'] },
  { name: 'Burundi', dialCode: '+257', currency: 'BIF', locale: 'fr-BI', cities: ['Gitega', 'Bujumbura', 'Ngozi'] },
  { name: 'Cameroun', dialCode: '+237', currency: 'XAF', locale: 'fr-FR', cities: ['Yaoundé', 'Douala', 'Bafoussam', 'Garoua'] },
  { name: 'Cap-Vert', dialCode: '+238', currency: 'CVE', locale: 'pt-CV', cities: ['Praia', 'Mindelo', 'Santa Maria'] },
  { name: 'Comores', dialCode: '+269', currency: 'XAF', locale: 'fr-FR', cities: ['Moroni', 'Mutsamudu', 'Fomboni'] },
  { name: 'Congo', dialCode: '+242', currency: 'XAF', locale: 'fr-FR', cities: ['Brazzaville', 'Pointe-Noire', 'Dolisie'] },
  { name: 'Côte d’Ivoire', dialCode: '+225', currency: 'XOF', locale: 'fr-FR', cities: ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro'] },
  { name: 'Danemark', dialCode: '+45', currency: 'EUR', locale: 'da-DK', cities: ['Copenhague', 'Aarhus', 'Odense'] },
  { name: 'Djibouti', dialCode: '+253', currency: 'XAF', locale: 'fr-FR', cities: ['Djibouti', 'Ali Sabieh', 'Tadjourah'] },
  { name: 'Égypte', dialCode: '+20', currency: 'EGP', locale: 'ar-EG', cities: ['Le Caire', 'Alexandrie', 'Gizeh', 'Louxor'] },
  { name: 'Érythrée', dialCode: '+291', currency: 'ERN', locale: 'en-ER', cities: ['Asmara', 'Keren', 'Massawa'] },
  { name: 'Espagne', dialCode: '+34', currency: 'EUR', locale: 'es-ES', cities: ['Madrid', 'Barcelone', 'Valence', 'Séville'] },
  { name: 'Eswatini', dialCode: '+268', currency: 'SZL', locale: 'en-SZ', cities: ['Mbabane', 'Manzini', 'Lobamba'] },
  { name: 'Éthiopie', dialCode: '+251', currency: 'ETB', locale: 'am-ET', cities: ['Addis-Abeba', 'Dire Dawa', 'Mekele'] },
  { name: 'Finlande', dialCode: '+358', currency: 'EUR', locale: 'fi-FI', cities: ['Helsinki', 'Espoo', 'Tampere'] },
  { name: 'France', dialCode: '+33', currency: 'EUR', locale: 'fr-FR', cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Bordeaux'] },
  { name: 'Gabon', dialCode: '+241', currency: 'XAF', locale: 'fr-FR', cities: ['Libreville', 'Port-Gentil', 'Franceville'] },
  { name: 'Gambie', dialCode: '+220', currency: 'GMD', locale: 'en-GM', cities: ['Banjul', 'Serekunda', 'Brikama'] },
  { name: 'Ghana', dialCode: '+233', currency: 'GHS', locale: 'en-GH', cities: ['Accra', 'Kumasi', 'Tamale', 'Takoradi'] },
  { name: 'Grèce', dialCode: '+30', currency: 'EUR', locale: 'el-GR', cities: ['Athènes', 'Thessalonique', 'Patras'] },
  { name: 'Guinée', dialCode: '+224', currency: 'GNF', locale: 'fr-GN', cities: ['Conakry', 'Nzérékoré', 'Kankan'] },
  { name: 'Guinée-Bissau', dialCode: '+245', currency: 'XOF', locale: 'pt-PT', cities: ['Bissau', 'Bafatá', 'Gabú'] },
  { name: 'Guinée équatoriale', dialCode: '+240', currency: 'XAF', locale: 'es-GQ', cities: ['Malabo', 'Bata', 'Ebebiyín'] },
  { name: 'Irlande', dialCode: '+353', currency: 'EUR', locale: 'en-IE', cities: ['Dublin', 'Cork', 'Galway', 'Limerick'] },
  { name: 'Italie', dialCode: '+39', currency: 'EUR', locale: 'it-IT', cities: ['Rome', 'Milan', 'Naples', 'Turin'] },
  { name: 'Kenya', dialCode: '+254', currency: 'KES', locale: 'en-KE', cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'] },
  { name: 'Lesotho', dialCode: '+266', currency: 'LSL', locale: 'en-LS', cities: ['Maseru', 'Teyateyaneng', 'Mafeteng'] },
  { name: 'Liberia', dialCode: '+231', currency: 'LRD', locale: 'en-LR', cities: ['Monrovia', 'Gbarnga', 'Buchanan'] },
  { name: 'Libye', dialCode: '+218', currency: 'LYD', locale: 'ar-LY', cities: ['Tripoli', 'Benghazi', 'Misrata'] },
  { name: 'Luxembourg', dialCode: '+352', currency: 'EUR', locale: 'fr-LU', cities: ['Luxembourg', 'Esch-sur-Alzette', 'Differdange'] },
  { name: 'Madagascar', dialCode: '+261', currency: 'MGA', locale: 'fr-MG', cities: ['Antananarivo', 'Toamasina', 'Antsirabe'] },
  { name: 'Malawi', dialCode: '+265', currency: 'MWK', locale: 'en-MW', cities: ['Lilongwe', 'Blantyre', 'Mzuzu'] },
  { name: 'Mali', dialCode: '+223', currency: 'XOF', locale: 'fr-FR', cities: ['Bamako', 'Sikasso', 'Mopti', 'Ségou'] },
  { name: 'Maroc', dialCode: '+212', currency: 'MAD', locale: 'fr-FR', cities: ['Rabat', 'Casablanca', 'Marrakech', 'Tanger'] },
  { name: 'Maurice', dialCode: '+230', currency: 'MUR', locale: 'fr-FR', cities: ['Port-Louis', 'Beau-Bassin', 'Curepipe'] },
  { name: 'Mauritanie', dialCode: '+222', currency: 'MRU', locale: 'ar-MR', cities: ['Nouakchott', 'Nouadhibou', 'Kiffa'] },
  { name: 'Mozambique', dialCode: '+258', currency: 'MZN', locale: 'pt-MZ', cities: ['Maputo', 'Matola', 'Nampula'] },
  { name: 'Namibie', dialCode: '+264', currency: 'NAD', locale: 'en-NA', cities: ['Windhoek', 'Walvis Bay', 'Swakopmund'] },
  { name: 'Niger', dialCode: '+227', currency: 'XOF', locale: 'fr-FR', cities: ['Niamey', 'Maradi', 'Zinder', 'Agadez'] },
  { name: 'Nigeria', dialCode: '+234', currency: 'NGN', locale: 'en-NG', cities: ['Abuja', 'Lagos', 'Kano', 'Port Harcourt'] },
  { name: 'Norvège', dialCode: '+47', currency: 'EUR', locale: 'nb-NO', cities: ['Oslo', 'Bergen', 'Trondheim'] },
  { name: 'Ouganda', dialCode: '+256', currency: 'UGX', locale: 'en-UG', cities: ['Kampala', 'Entebbe', 'Jinja'] },
  { name: 'Pays-Bas', dialCode: '+31', currency: 'EUR', locale: 'nl-NL', cities: ['Amsterdam', 'Rotterdam', 'La Haye', 'Utrecht'] },
  { name: 'Pologne', dialCode: '+48', currency: 'EUR', locale: 'pl-PL', cities: ['Varsovie', 'Cracovie', 'Wrocław'] },
  { name: 'Portugal', dialCode: '+351', currency: 'EUR', locale: 'pt-PT', cities: ['Lisbonne', 'Porto', 'Braga', 'Coimbra'] },
  { name: 'République centrafricaine', dialCode: '+236', currency: 'XAF', locale: 'fr-FR', cities: ['Bangui', 'Bimbo', 'Berbérati'] },
  { name: 'République démocratique du Congo', dialCode: '+243', currency: 'CDF', locale: 'fr-CD', cities: ['Kinshasa', 'Lubumbashi', 'Goma'] },
  { name: 'Roumanie', dialCode: '+40', currency: 'EUR', locale: 'ro-RO', cities: ['Bucarest', 'Cluj-Napoca', 'Timișoara'] },
  { name: 'Royaume-Uni', dialCode: '+44', currency: 'GBP', locale: 'en-GB', cities: ['Londres', 'Manchester', 'Birmingham', 'Liverpool'] },
  { name: 'Rwanda', dialCode: '+250', currency: 'RWF', locale: 'fr-FR', cities: ['Kigali', 'Butare', 'Gisenyi'] },
  { name: 'Sao Tomé-et-Principe', dialCode: '+239', currency: 'STN', locale: 'pt-ST', cities: ['Sao Tomé', 'Santo António', 'Neves'] },
  { name: 'Sénégal', dialCode: '+221', currency: 'XOF', locale: 'fr-FR', cities: ['Dakar', 'Thiès', 'Saint-Louis', 'Touba'] },
  { name: 'Seychelles', dialCode: '+248', currency: 'SCR', locale: 'fr-SC', cities: ['Victoria', 'Beau Vallon', 'Anse Royale'] },
  { name: 'Sierra Leone', dialCode: '+232', currency: 'SLE', locale: 'en-SL', cities: ['Freetown', 'Bo', 'Kenema'] },
  { name: 'Somalie', dialCode: '+252', currency: 'SOS', locale: 'so-SO', cities: ['Mogadiscio', 'Hargeisa', 'Kismayo'] },
  { name: 'Soudan', dialCode: '+249', currency: 'SDG', locale: 'ar-SD', cities: ['Khartoum', 'Omdourman', 'Port-Soudan'] },
  { name: 'Soudan du Sud', dialCode: '+211', currency: 'SSP', locale: 'en-SS', cities: ['Djouba', 'Wau', 'Malakal'] },
  { name: 'Suède', dialCode: '+46', currency: 'EUR', locale: 'sv-SE', cities: ['Stockholm', 'Göteborg', 'Malmö'] },
  { name: 'Suisse', dialCode: '+41', currency: 'CHF', locale: 'fr-CH', cities: ['Berne', 'Genève', 'Zurich', 'Lausanne'] },
  { name: 'Tanzanie', dialCode: '+255', currency: 'TZS', locale: 'sw-TZ', cities: ['Dodoma', 'Dar es Salaam', 'Arusha'] },
  { name: 'Tchad', dialCode: '+235', currency: 'XAF', locale: 'fr-FR', cities: ['N’Djamena', 'Moundou', 'Abéché'] },
  { name: 'Togo', dialCode: '+228', currency: 'XOF', locale: 'fr-FR', cities: ['Lomé', 'Sokodé', 'Kara', 'Atakpamé'] },
  { name: 'Tunisie', dialCode: '+216', currency: 'TND', locale: 'fr-FR', cities: ['Tunis', 'Sfax', 'Sousse', 'Djerba'] },
  { name: 'Zambie', dialCode: '+260', currency: 'ZMW', locale: 'en-ZM', cities: ['Lusaka', 'Kitwe', 'Ndola'] },
  { name: 'Zimbabwe', dialCode: '+263', currency: 'ZWL', locale: 'en-ZW', cities: ['Harare', 'Bulawayo', 'Mutare'] },
];

export const plans = [
  { name: 'Standard', fcfa: 7500, euro: 11.43, gbp: 9.85, chf: 10.75, withdrawalLimit: 2500000 },
  { name: 'Premium', fcfa: 12500, euro: 19.05, gbp: 16.40, chf: 17.90, withdrawalLimit: 500000 },
  { name: 'MasterClass', fcfa: 15000, euro: 22.86, gbp: 19.70, chf: 21.45, withdrawalLimit: 10000000 },
];

export function getPlanRewardAmount(planName: string | null | undefined) {
  return plans.find((plan) => plan.name === planName?.trim())?.fcfa ?? plans[0].fcfa;
}

export function getPlanWithdrawalLimit(planName: string | null | undefined) {
  return plans.find((plan) => plan.name === planName?.trim())?.withdrawalLimit ?? plans[0].withdrawalLimit;
}

export const paymentMethodsByCountry: Record<string, string[]> = {
  'Bénin': ['MTN MoMo', 'Moov Money', 'Celtiis Cash', 'ID Money'],
  'Togo': ['Mixx by Yas', 'Flooz', 'TMoney'],
  'Côte d’Ivoire': ['Wave', 'Orange Money', 'MTN MoMo', 'Moov Money'],
  'Sénégal': ['Wave', 'Orange Money', 'Free Money', 'Mixx'],
  'Burkina Faso': ['Orange Money', 'Moov Money', 'Wave'],
  'Mali': ['Orange Money', 'Moov Money', 'Wave'],
  'Niger': ['Airtel Money', 'Moov Flooz', 'Zamani Cash'],
  'Nigeria': ['OPay', 'PalmPay', 'MTN MoMo', 'Cartes bancaires'],
  'Ghana': ['MTN MoMo', 'Telecel Cash', 'Zeepay'],
  'Guinée': ['Orange Money', 'MTN MoMo'],
  'Gambie': ['Afrimoney', 'Wave', 'QMoney'],
  'Liberia': ['MTN MoMo', 'Orange Money'],
  'Sierra Leone': ['Orange Money', 'Afrimoney'],
  'Cameroun': ['MTN MoMo', 'Orange Money'],
  'Congo': ['MTN MoMo', 'Airtel Money'],
  'République démocratique du Congo': ['M-Pesa', 'Airtel Money', 'Orange Money'],
  'Gabon': ['Airtel Money'],
  'Tchad': ['Airtel Money', 'Transferts bancaires'],
  'République centrafricaine': ['Orange Money', 'Transferts bancaires'],
  'Guinée équatoriale': ['Mobile Money', 'Transferts bancaires'],
  'Kenya': ['M-Pesa', 'Airtel Money'],
  'Ouganda': ['MTN MoMo', 'Airtel Money'],
  'Tanzanie': ['M-Pesa', 'Tigo Pesa', 'Airtel Money'],
  'Rwanda': ['MTN MoMo', 'Airtel Money'],
  'Burundi': ['Lumicash', 'EcoCash'],
  'Éthiopie': ['Telebirr', 'M-Pesa'],
  'Djibouti': ['D-Money', 'Waafi'],
  'Somalie': ['EVC Plus', 'Autres portefeuilles mobiles'],
  'Érythrée': ['Cartes bancaires', 'Virements'],
  'Soudan du Sud': ['MTN MoMo', 'm-Gurush'],
  'Soudan': ['Bankak', 'Applications bancaires'],
};

export function getCountry(name: string) {
  return countries.find((country) => country.name === name) ?? null;
}

export function getPaymentMethods(countryName: string) {
  return [...(paymentMethodsByCountry[countryName] ?? []), 'Compte bancaire'];
}

export function formatPlanPrice(planName: string, countryName: string) {
  const plan = plans.find((item) => item.name === planName) ?? plans[0];
  const country = getCountry(countryName);
  if (!country || country.currency === 'XOF' || country.currency === 'XAF') return `${plan.fcfa.toLocaleString('fr-FR')} FCFA`;
  if (country.currency === 'EUR') return new Intl.NumberFormat(country.locale, { style: 'currency', currency: 'EUR' }).format(plan.euro);
  if (country.currency === 'GBP') return new Intl.NumberFormat(country.locale, { style: 'currency', currency: 'GBP' }).format(plan.gbp);
  if (country.currency === 'CHF') return new Intl.NumberFormat(country.locale, { style: 'currency', currency: 'CHF' }).format(plan.chf);
  const converted = plan.euro * 655.957 / (country.currency === 'MAD' ? 10.8 : country.currency === 'TND' ? 3.4 : country.currency === 'EGP' ? 53 : 1);
  return `${Math.round(converted).toLocaleString(country.locale)} ${country.currency}`;
}
