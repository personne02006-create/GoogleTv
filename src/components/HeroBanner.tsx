import { ArrowRight, Info, Play, Plus, Sparkles } from 'lucide-react';
import type { Show } from '@/data/content';

interface HeroBannerProps {
  show: Show;
  isFavorite: boolean;
  onOpen: (show: Show) => void;
  onDetails: () => void;
  onToggleFavorite: (title: string) => void;
}

export default function HeroBanner({ show, isFavorite, onOpen, onDetails, onToggleFavorite }: HeroBannerProps) {
  return (
    <section className="hero relative isolate overflow-hidden">
      <img src={show.image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07101c_0%,rgba(7,16,28,.86)_34%,rgba(7,16,28,.2)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#07101c_0%,transparent_35%,rgba(7,16,28,.2)_100%)]" />

      <div className="mx-auto flex min-h-[700px] max-w-7xl items-end px-6 pb-16 pt-32 sm:min-h-[760px] sm:px-10 lg:min-h-[720px] lg:pb-24">
        <div className="max-w-3xl">
          <div className="mb-7 flex flex-wrap items-center gap-3 text-sm font-semibold">
            <span className="recommend-pill inline-flex items-center gap-2 rounded-full border border-blue-400/60 bg-blue-500/10 px-4 py-2 text-blue-300">
              <Sparkles className="h-4 w-4" /> Recommandé pour vous
            </span>
            <span className="rounded-full border border-white/25 bg-black/20 px-4 py-2 text-slate-300">{show.genre}</span>
            <span className="rounded-full border border-white/25 bg-black/20 px-4 py-2 text-slate-300">{show.year}</span>
          </div>

          <h1 className="hero-title mb-6 text-6xl font-black leading-[.88] tracking-[-.06em] text-white sm:text-8xl">
            <span>Ombres</span>
            <span className="hero-gradient block">de la Nuit</span>
          </h1>
          <p className="mb-8 max-w-2xl text-base leading-7 text-slate-300 sm:text-2xl sm:leading-10">
            Une enquête secrète révèle une vérité que personne n'osait imaginer. Découvrez le nouveau thriller exclusif propulsé par Google TV.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => onOpen(show)} className="primary-button inline-flex items-center gap-3 rounded-2xl px-6 py-4 text-base font-bold sm:px-8 sm:text-lg">
              <Play className="h-5 w-5 fill-current" /> Regarder maintenant
            </button>
            <button onClick={() => onToggleFavorite(show.title)} className={`secondary-button inline-flex items-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold ${isFavorite ? 'is-active' : ''}`}>
              <Plus className="h-5 w-5" /> {isFavorite ? 'Dans ma liste' : 'Ma liste'}
            </button>
            <button onClick={onDetails} className="detail-link inline-flex items-center gap-2 px-2 py-4 text-base font-semibold text-slate-300">
              <Info className="h-5 w-5 text-blue-400" /> Détails <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
