import { ChevronLeft, ChevronRight, Clock3, Star } from 'lucide-react';
import { useRef } from 'react';
import type { Show } from '@/data/content';

interface ContentRowProps {
  title: string;
  subtitle: string;
  items: Show[];
  favorites: string[];
  onToggleFavorite: (title: string) => void;
  onOpen: (show: Show) => void;
  compact?: boolean;
}

export default function ContentRow({ title, subtitle, items, favorites, onToggleFavorite, onOpen, compact = false }: ContentRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => scrollerRef.current?.scrollBy({ left: direction * 420, behavior: 'smooth' });

  return (
    <section className="content-section mx-auto max-w-7xl px-6 sm:px-10">
      <div className="section-heading flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            <span className="section-marker" /> {title}
          </h2>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">{subtitle}</p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button onClick={() => scroll(-1)} aria-label="Précédent" className="scroll-button"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={() => scroll(1)} aria-label="Suivant" className="scroll-button"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>

      <div ref={scrollerRef} className="media-scroller flex gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((show, index) => {
          const isFavorite = favorites.includes(show.title);
          return (
            <article key={show.id} className={`media-card group relative flex-none overflow-hidden rounded-[22px] ${compact ? 'w-[235px] sm:w-[255px]' : 'w-[270px] sm:w-[295px]'}`}>
              <button onClick={() => onOpen(show)} className="block w-full text-left">
                <div className="media-poster relative overflow-hidden">
                  <img src={show.image} alt={show.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <span className={`badge badge-${index % 4} absolute left-4 top-4 rounded-lg px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-white`}>{show.badge}</span>
                  {title === 'Top des tendances' && <span className="rank-badge absolute right-4 top-4">N°{index + 1}</span>}
                </div>
                <div className="media-copy p-5">
                  <h3 className="truncate text-xl font-bold text-white">{show.title}</h3>
                  <div className="mt-3 flex items-center gap-3 text-sm text-slate-400">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-400"><Star className="h-4 w-4 fill-current" /> {show.rating}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" /> {show.duration}</span>
                    <span className="rounded-md bg-white/10 px-2 py-1">{show.year}</span>
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">{show.description}</p>
                </div>
              </button>
              <button onClick={() => onToggleFavorite(show.title)} className={`absolute bottom-5 right-5 rounded-full border px-3 py-1 text-xs font-semibold transition ${isFavorite ? 'border-blue-400 bg-blue-500/20 text-blue-300' : 'border-white/10 bg-black/20 text-slate-400 opacity-0 group-hover:opacity-100'}`}>
                {isFavorite ? 'Ma liste' : '+ Liste'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
