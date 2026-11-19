export interface Show {
  id: string;
  title: string;
  badge: string;
  rating: string;
  duration: string;
  year: string;
  genre: string;
  description: string;
  image: string;
  kind: 'Film' | 'Série';
}

export const heroShow: Show = {
  id: 'ombres-de-la-nuit',
  title: 'Ombres de la Nuit',
  badge: 'Exclusif',
  rating: '9.2',
  duration: '2h 14min',
  year: '2026',
  genre: 'Thriller · Sci-Fi',
  description: "Un détective découvre un complot dans une ville où chaque ombre cache un mensonge.",
  image: 'https://images.pexels.com/photos/37474329/pexels-photo-37474329.jpeg?auto=compress&cs=tinysrgb&h=1200&w=1800',
  kind: 'Film',
};

export const recommended: Show[] = [
  heroShow,
  {
    id: 'astronaute-perdant',
    title: "L'Astronaute Perdant",
    badge: 'Populaire',
    rating: '8.7',
    duration: '1h 58min',
    year: '2025',
    genre: 'Sci-Fi · Drame',
    description: "Dans un voyage solitaire vers les confins de l'espace, un astronaute fait face à la vérité.",
    image: 'https://images.pexels.com/photos/7662943/pexels-photo-7662943.jpeg?auto=compress&cs=tinysrgb&h=1200&w=1800',
    kind: 'Film',
  },
  {
    id: 'lumiere-automne',
    title: "Lumière d'Automne",
    badge: 'Tendance',
    rating: '8.9',
    duration: '2h 05min',
    year: '2026',
    genre: 'Drame romantique',
    description: "Une histoire d'amour inattendue dans une petite ville en automne.",
    image: 'https://images.pexels.com/photos/19238222/pexels-photo-19238222.jpeg?auto=compress&cs=tinysrgb&h=1200&w=1800',
    kind: 'Film',
  },
  {
    id: 'dernier-entrepot',
    title: 'Le Dernier Entrepôt',
    badge: 'Révélation',
    rating: '9.0',
    duration: '2h 31min',
    year: '2026',
    genre: 'Mystère · Thriller',
    description: "Un entrepôt abandonné révèle un secret qui change tout pour ceux qui y entrent.",
    image: 'https://images.pexels.com/photos/9769974/pexels-photo-9769974.jpeg?auto=compress&cs=tinysrgb&h=1200&w=1800',
    kind: 'Film',
  },
];

export const series: Show[] = [
  {
    id: 'justicier-masque',
    title: 'Le Justicier Masqué',
    badge: 'Série',
    rating: '8.4',
    duration: '3 Saisons',
    year: '2023–2026',
    genre: 'Action · Drame',
    description: 'Un héros anonyme défend la ville, mais ses actions ont des conséquences inattendues.',
    image: 'https://images.pexels.com/photos/10833993/pexels-photo-10833993.jpeg?auto=compress&cs=tinysrgb&h=1200&w=1800',
    kind: 'Série',
  },
  {
    id: 'chroniques-futur',
    title: 'Chroniques du Futur',
    badge: 'Sci-Fi',
    rating: '9.1',
    duration: '2 Saisons',
    year: '2025–2026',
    genre: 'Sci-Fi · Aventure',
    description: 'Dans un monde où la mémoire peut être transférée, la vérité devient relative.',
    image: 'https://images.pexels.com/photos/32862970/pexels-photo-32862970.jpeg?auto=compress&cs=tinysrgb&h=1200&w=1800',
    kind: 'Série',
  },
  {
    id: 'appel-silence',
    title: "L'Appel du Silence",
    badge: 'Drame',
    rating: '8.6',
    duration: '4 Saisons',
    year: '2022–2026',
    genre: 'Drame · Famille',
    description: "Une famille traverse les épreuves du temps dans un village isolé au bord de l'océan.",
    image: 'https://images.pexels.com/photos/6151864/pexels-photo-6151864.jpeg?auto=compress&cs=tinysrgb&h=1200&w=1800',
    kind: 'Série',
  },
  {
    id: 'nuit-blanche',
    title: 'Nuit Blanche',
    badge: 'Thriller',
    rating: '7.9',
    duration: '1 Saison',
    year: '2026',
    genre: 'Thriller · Horreur',
    description: "Une nuit sans fin dans une ville où le temps s'arrête et l'horreur s'éveille.",
    image: 'https://images.pexels.com/photos/19949819/pexels-photo-19949819.jpeg?auto=compress&cs=tinysrgb&h=1200&w=1800',
    kind: 'Série',
  },
];

export const allShows = [...recommended, ...series];
