import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { MockSnapshot, PersonId, Photo, WishCommand } from '../types/domain';
import { photoBytes } from './photo-bytes';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key, {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;

export interface CloudCouple { id: string; actor: PersonId; inviteCode: string | null; snapshot: MockSnapshot }
export async function loadCloudCouple(): Promise<CloudCouple | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_my_couple');
  if (error) throw error;
  return data ? hydratePhotos(data as CloudCouple) : null;
}
async function hydratePhotos(couple: CloudCouple): Promise<CloudCouple> {
  const paths = new Set<string>();
  const allPhotos = [...couple.snapshot.wishes.map(wish => wish.cover), ...couple.snapshot.memories.flatMap(memory => memory.photos)];
  allPhotos.forEach(photo => { if ('uri' in photo && photo.storagePath) paths.add(photo.storagePath); });
  if (!paths.size || !supabase) return couple;
  const { data, error } = await supabase.storage.from('wish-photos').createSignedUrls([...paths], 3600);
  if (error) throw error;
  const urls = new Map(data.map(item => [item.path, item.signedUrl]));
  const hydrate = (photo: Photo): Photo => 'uri' in photo && photo.storagePath ? { ...photo, uri: urls.get(photo.storagePath) || photo.uri } : photo;
  return { ...couple, snapshot: { ...couple.snapshot, wishes: couple.snapshot.wishes.map(wish => ({ ...wish, cover: hydrate(wish.cover) })), memories: couple.snapshot.memories.map(memory => ({ ...memory, photos: memory.photos.map(hydrate) })) } };
}
async function uploadPhoto(photo: Photo): Promise<Photo> {
  if (!supabase || 'art' in photo) return photo;
  if (photo.storagePath) return { ...photo, uri: `storage://${photo.storagePath}` };
  if (/^https:\/\//.test(photo.uri)) return photo;
  const couple = await loadCloudCouple();
  const { data: { user } } = await supabase.auth.getUser();
  if (!couple || !user) throw new Error('Bạn cần đăng nhập và ghép đôi trước.');
  const { bytes, type } = await photoBytes(photo.uri);
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('Ảnh cần nhỏ hơn 10 MB.');
  const extension = ({ 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' } as Record<string, string>)[type] ?? 'jpg';
  const path = `${couple.id}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const { error } = await supabase.storage.from('wish-photos').upload(path, bytes, { contentType: type, upsert: false });
  if (error) throw new Error('Chưa tải được ảnh. Bạn thử lại nhé.');
  return { uri: `storage://${path}`, storagePath: path };
}
export async function cloudCommand(command: WishCommand): Promise<CloudCouple> {
  if (!supabase) throw new Error('Chưa kết nối máy chủ.');
  if (command.kind === 'add') command = { ...command, input: { ...command.input, cover: await uploadPhoto(command.input.cover) } };
  if (command.kind === 'complete') {
    const photos: Photo[] = [];
    // Upload one photo at a time to keep memory bounded on mobile.
    for (const photo of command.input.photos) photos.push(await uploadPhoto(photo));
    command = { ...command, input: { ...command.input, photos } };
  }
  const { data, error } = await supabase.functions.invoke('wish-action', { body: command });
  if (error) {
    // Preserve the server's validation message without exposing internal details.
    const response = 'context' in error ? error.context : null;
    if (response instanceof Response) {
      const details = await response.json().catch(() => null);
      if (details?.error) throw new Error(details.error);
    }
    throw new Error('Chưa kết nối được máy chủ. Bạn thử lại nhé.');
  }
  return hydratePhotos(data as CloudCouple);
}
