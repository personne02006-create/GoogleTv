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
    .select('id, title, channel_name, youtube_id, video_url, thumbnail_url, display_order')
    .order('display_order', { ascending: true });

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
