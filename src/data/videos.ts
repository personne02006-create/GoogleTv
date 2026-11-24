import { supabase } from '@/lib/supabase';

export interface VideoItem {
  id: string;
  title: string;
  channelName: string;
  youtubeId: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
}

export interface UploadedVideo {
  publicUrl: string;
  path: string;
}

const knownFrenchTitles: Record<string, string> = {
  'Shower Set': 'Ensemble de douche',
  'Seafood with Girls': 'Fruits de mer entre amies',
  'Taste The Difference': 'Goûtez la différence',
  'Fresh From Press': 'Fraîchement sorti de presse',
  'Too focused to panic': 'Trop concentré pour paniquer',
  'Cinnamon Iced Coffee ☕️🤎': 'Café glacé à la cannelle',
  'AI Burger Commercial': 'Publicité pour un burger créée par IA',
  'Restaurant Ad Video Template (Editable)': 'Modèle de publicité de restaurant',
  'Lorenza sans internet : le dernier jour !': 'Lorenza sans internet : le dernier jour !',
};

const frenchWords = /\b(le|la|les|un|une|des|du|de|pour|avec|dans|sur|sans|votre|vous|notre|chaque|comment|quand|et|est|aux|auxquels|l'effet|j'ai|c'est)\b|[àâçéèêëîïôùûüÿœ]/i;

export function toFrenchVideoTitle(title: string): string {
  const cleanTitle = title.trim();
  if (!cleanTitle) return 'Vidéo publiée';
  if (knownFrenchTitles[cleanTitle]) return knownFrenchTitles[cleanTitle];
  if (frenchWords.test(cleanTitle)) return cleanTitle;
  return 'Vidéo publiée sur Google TV';
}

const acceptedVideoTypes = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/ogg',
  'video/mpeg',
  'video/x-matroska',
]);
const maxVideoSize = 500 * 1024 * 1024;

export async function fetchVideos(): Promise<VideoItem[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('id, title, channel_name, youtube_id, video_url, thumbnail_url')
    .order('channel_name', { ascending: true })
    .order('title', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    channelName: row.channel_name,
    youtubeId: row.youtube_id,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url,
  }));
}

export function youtubeIdFromUrl(value: string): string | null {
  const input = value.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (hostname === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      const queryId = url.searchParams.get('v');
      const pathId = url.pathname.split('/').filter(Boolean)[1];
      const id = queryId ?? pathId;
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function uploadVideoFile(file: File): Promise<UploadedVideo> {
  if (!acceptedVideoTypes.has(file.type)) throw new Error('Format vidéo non accepté.');
  if (file.size > maxVideoSize) throw new Error('Fichier vidéo trop volumineux.');

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `admin/${crypto.randomUUID()}_${safeName}`;
  const { error } = await supabase.storage.from('videos').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('videos').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("L'URL du fichier n'a pas pu être obtenue.");
  return { publicUrl: data.publicUrl, path };
}

export async function removeUploadedVideo(path: string): Promise<void> {
  await supabase.storage.from('videos').remove([path]);
}

export async function createVideo(values: { title: string; youtubeId?: string | null; videoUrl?: string | null }): Promise<void> {
  const { error } = await supabase.from('videos').insert({
    channel_id: 'admin-videos',
    channel_name: 'Vidéos',
    youtube_id: values.youtubeId ?? null,
    video_url: values.videoUrl ?? null,
    title: values.title,
  });
  if (error) throw new Error(error.message);
}
