import { useEffect, useState, type ReactNode } from 'react';
import { Bookmark, CheckCircle2, Loader2, Play, ThumbsDown, ThumbsUp } from 'lucide-react';
import { fetchVideos, type VideoItem } from '@/data/videos';

interface Activity { watched: boolean; liked: boolean; disliked: boolean; favorited: boolean; }
type ActivityKey = 'watched' | 'liked' | 'disliked' | 'favorited';

interface VideoTabProps {
  activities: Record<string, Activity>;
  rewardAmount: number;
  onActivity: (contentId: string, key: ActivityKey) => Promise<void>;
  onWatched: (contentId: string) => Promise<void>;
}

export default function VideoTab({ activities, rewardAmount, onActivity, onWatched }: VideoTabProps) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchVideos()
      .then((result) => { if (mounted) setVideos(result); })
      .catch(() => { if (mounted) setLoadError('Impossible de charger les vidéos pour le moment.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-slate-400"><Loader2 className="h-10 w-10 animate-spin text-blue-400" /><p>Chargement des vidéos…</p></div>;
  }

  if (loadError) {
    return <div className="mx-auto mt-16 max-w-md rounded-3xl border border-red-400/30 bg-[#2a1720] p-8 text-center text-red-200">{loadError}</div>;
  }

  return <section className="pb-10 pt-8 sm:pt-12">
    <div className="rounded-[28px] border border-white/10 bg-[#111923] p-5 shadow-2xl sm:p-8">
      <h1 className="text-3xl font-black text-white sm:text-5xl">Vidéos</h1>
      <p className="mt-3 text-lg text-slate-400">{videos.length} vidéo{videos.length > 1 ? 's' : ''} disponible{videos.length > 1 ? 's' : ''}</p>
    </div>
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      {videos.map((video) => <VideoCard key={video.id} video={video} rewardAmount={rewardAmount} isPlaying={playingId === video.id} onPlay={() => { setPlayingId(video.id); void onWatched(video.id); }} activity={activities[video.id]} onActivity={onActivity} />)}
    </div>
    {videos.length === 0 && <div className="mt-8 rounded-3xl border border-dashed border-white/15 p-12 text-center text-slate-400">Aucune vidéo disponible.</div>}
  </section>;
}

function VideoCard({ video, rewardAmount, isPlaying, onPlay, activity, onActivity }: { video: VideoItem; rewardAmount: number; isPlaying: boolean; onPlay: () => void; activity?: Activity; onActivity: (contentId: string, key: ActivityKey) => Promise<void> }) {
  const watched = Boolean(activity?.watched);
  const liked = Boolean(activity?.liked);
  const disliked = Boolean(activity?.disliked);
  const favorited = Boolean(activity?.favorited);
  return <article className="overflow-hidden rounded-[26px] border border-slate-400/20 bg-[#222b3e] shadow-[0_14px_35px_rgba(0,0,0,.2)] transition duration-300 hover:-translate-y-1 hover:border-blue-400/50">
    {isPlaying
      ? <div className="bg-black">
          {video.videoUrl
            ? <video className="aspect-video h-full w-full" src={video.videoUrl} controls playsInline autoPlay title={video.title} />
            : <div className="aspect-video w-full"><iframe className="h-full w-full" src={`https://www.youtube.com/embed/${video.youtubeId ?? ''}?autoplay=1&playsinline=1&rel=0&modestbranding=1`} title={video.title} allow="autoplay; encrypted-media; picture-in-picture; web-share" loading="lazy" allowFullScreen /></div>}
          <p className="border-t border-white/10 px-4 py-3 text-center text-xs font-semibold text-slate-400">Lecture intégrée dans l’application</p>
        </div>
      : <button onClick={onPlay} className="group relative block aspect-video w-full overflow-hidden" aria-label={`Regarder ${video.title}`}>
          <img src={video.thumbnailUrl ?? (video.youtubeId ? `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg` : '')} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d16]/80 via-transparent to-black/10" />
          <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition group-hover:scale-110"><Play className="ml-1 h-6 w-6 fill-current" /></span>
        </button>}
    <div className="p-5 sm:p-6">
      <h2 className="line-clamp-2 text-lg font-bold leading-tight text-white sm:text-xl">{video.title}</h2>
      <p className="mt-4 text-lg font-black text-green-400">{rewardAmount.toLocaleString('fr-FR')} XOF</p>
      <div className="mt-5 grid grid-cols-4 gap-2">
        <VideoAction active={liked} activeClass="border-red-500/70 bg-red-500/10 text-red-400" label="J’aime" onClick={() => void onActivity(video.id, 'liked')}><ThumbsUp className="h-5 w-5" /></VideoAction>
        <VideoAction active={disliked} activeClass="border-slate-400/70 bg-slate-400/10 text-slate-200" label="Je n’aime pas" onClick={() => void onActivity(video.id, 'disliked')}><ThumbsDown className="h-5 w-5" /></VideoAction>
        <VideoAction active={favorited} activeClass="border-amber-400/70 bg-amber-400/10 text-amber-300" label="Favori" onClick={() => void onActivity(video.id, 'favorited')}><Bookmark className="h-5 w-5" fill={favorited ? 'currentColor' : 'none'} /></VideoAction>
        <VideoAction active={watched} activeClass="border-green-400/70 bg-green-400/10 text-green-400" label="Vu" onClick={() => void onActivity(video.id, 'watched')}><CheckCircle2 className="h-5 w-5" /></VideoAction>
      </div>
    </div>
  </article>;
}

function VideoAction({ active, activeClass, label, onClick, children }: { active: boolean; activeClass: string; label: string; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className={`flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition sm:min-h-[76px] sm:text-sm ${active ? activeClass : 'border-white/10 bg-white/[.03] text-slate-400 hover:border-white/25 hover:text-white'}`}>{children}<span>{label}</span></button>;
}
