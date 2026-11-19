import { Clock3, Heart, Play, Star, X } from 'lucide-react';
import type { Show } from '@/data/content';

interface DetailModalProps {
  show: Show;
  isFavorite: boolean;
  onToggleFavorite: (title: string) => void;
  onClose: () => void;
}

export default function DetailModal({ show, isFavorite, onToggleFavorite, onClose }: DetailModalProps) {
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="relative h-72 sm:h-96">
          <img src={show.image} alt={show.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101827] to-transparent" />
          <button onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white"><X className="h-5 w-5" /></button>
          <div className="absolute bottom-5 left-6 right-6">
            <span className="badge badge-0 rounded-lg px-3 py-1 text-xs font-bold uppercase text-white">{show.badge}</span>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">{show.title}</h2>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-1 font-bold text-amber-400"><Star className="h-4 w-4 fill-current" /> {show.rating}</span>
            <span>{show.year}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" /> {show.duration}</span><span>{show.genre}</span>
          </div>
          <p className="leading-8 text-slate-300">{show.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button className="primary-button inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold"><Play className="h-4 w-4 fill-current" /> Regarder</button>
            <button onClick={() => onToggleFavorite(show.title)} className="secondary-button inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold"><Heart className={`h-4 w-4 ${isFavorite ? 'fill-current text-blue-400' : ''}`} /> {isFavorite ? 'Dans ma liste' : 'Ma liste'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
