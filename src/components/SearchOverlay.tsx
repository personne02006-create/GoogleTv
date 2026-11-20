import { Search, X } from 'lucide-react';

interface SearchOverlayProps {
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
}

export default function SearchOverlay({ query, onQueryChange, onClose }: SearchOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#07101c]/90 p-6 backdrop-blur-md" onClick={onClose}>
      <div className="mx-auto mt-24 max-w-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#172236] px-5 py-4 shadow-2xl">
          <Search className="h-5 w-5 text-blue-300" />
          <input autoFocus value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Rechercher un film ou une série" className="w-full bg-transparent text-lg text-white outline-hidden placeholder:text-slate-500" />
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
      </div>
    </div>
  );
}
