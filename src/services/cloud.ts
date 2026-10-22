import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { WishSnapshot, PersonId, Photo, WishCommand } from '../types/domain';
import { photoBytes } from './photo-bytes';
import { PHOTO_LIMITS } from '../features/photos/limits';
import { checkInThumbnailPath, createPrivatePhotoCache, privateCheckInPath } from '../features/check-in/privacy';

import { createCheckInThumbnail } from './check-in-thumbnail';

let readPrivate: ((path: string, download: () => Promise<string>) => Promise<string>) | null = null;
let activePhotoScope = '';
const privatePhotos = createPrivatePhotoCache();
export function clearPrivatePhotos() { activePhotoScope = ''; readPrivate = null; privatePhotos.clear(); }

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key, {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;

export interface CloudCouple { id: string; actor: PersonId; inviteCode: string | null; snapshot: WishSnapshot }
export async function deleteCloudAccount(): Promise<void> {
  if (!supabase) throw new Error('Chưa kết nối máy chủ.');
  const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirmation: 'DELETE' } });
  if (error || data?.deleted !== true) {
    const response = error && 'context' in error ? error.context : null;
    if (response instanceof Response) {
      const details = await response.json().catch(() => null);
      if (typeof details?.error === 'string') throw new Error(details.error);
    }
    throw new Error('Chưa xác nhận được việc xoá tài khoản. Bạn kiểm tra kết nối rồi thử lại nhé.');
  }
}
export async function loadCloudCouple(): Promise<CloudCouple | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_my_couple');
  if (error) throw error;
  if (!data) clearPrivatePhotos();
  return data ? hydratePhotos(data as CloudCouple) : null;
}
async function hydratePhotos(couple: CloudCouple): Promise<CloudCouple> {
  if (!supabase) return couple;
  const client = supabase;
  const { data: { session } } = await client.auth.getSession();
  if (!session) { clearPrivatePhotos(); throw new Error('Bạn cần đăng nhập để xem kỷ niệm.'); }
  const checkIns = couple.snapshot.checkIns ?? [];
  const privatePaths = new Set<string>();
  for (const item of checkIns) {
    const path = privateCheckInPath(item.photo, couple.id);
    if (!path) throw new Error('Ảnh check-in cũ cần được chọn lại từ thư viện để lưu riêng tư.');
    privatePaths.add(path);
  }
  const allPhotos = [...couple.snapshot.wishes.map(wish => wish.cover), ...couple.snapshot.memories.flatMap(memory => memory.photos)];
  const storedPaths = new Set([...privatePaths, ...allPhotos.map(photo => privateCheckInPath(photo, couple.id)).filter((path): path is string => !!path)]);
  const allowedPaths = new Set([...storedPaths].flatMap(path => [path, checkInThumbnailPath(path)]));
  activePhotoScope = `${session.user.id}:${couple.id}`;
  readPrivate = privatePhotos.begin(activePhotoScope, allowedPaths);
  const paths = new Set<string>();
  allPhotos.forEach(photo => { if ('uri' in photo && photo.storagePath && !privatePaths.has(photo.storagePath)) paths.add(photo.storagePath); });
  const { data, error } = paths.size ? await client.storage.from('wish-photos').createSignedUrls([...paths], 3600) : { data: [], error: null };
  if (error) throw error;
  const urls = new Map(data.map(item => [item.path, item.signedUrl] as const));
  const hydrate = (photo: Photo): Photo => 'uri' in photo && photo.storagePath
    ? privatePaths.has(photo.storagePath) ? { ...photo, uri: `storage://${photo.storagePath}`, private: true }
      : { ...photo, uri: urls.get(photo.storagePath) || photo.uri } : photo;
  return { ...couple, snapshot: { ...couple.snapshot, checkIns: (couple.snapshot.checkIns ?? []).map(item => ({ ...item, photo: 'uri' in item.photo ? { ...item.photo, uri: `storage://${item.photo.storagePath}`, private: true } : item.photo })), wishes: couple.snapshot.wishes.map(wish => ({ ...wish, cover: hydrate(wish.cover) })), memories: couple.snapshot.memories.map(memory => ({ ...memory, photos: memory.photos.map(hydrate) })) } };
}
async function uploadPhoto(photo: Photo): Promise<Photo> {
  if (!supabase || 'art' in photo) return photo;
  if (photo.storagePath) return { uri: `storage://${photo.storagePath}`, storagePath: photo.storagePath };
  if (/^https:\/\//.test(photo.uri)) return photo;
  const couple = await loadCloudCouple();
  const { data: { user } } = await supabase.auth.getUser();
  if (!couple || !user) throw new Error('Bạn cần đăng nhập và ghép đôi trước.');
  const { bytes, type } = await photoBytes(photo.uri);
  if (bytes.byteLength > PHOTO_LIMITS.uploadBytes) throw new Error('Ảnh sau tối ưu cần nhỏ hơn 2 MB.');
  const extension = ({ 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' } as Record<string, string>)[type] ?? 'jpg';
  const path = `${couple.id}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const { error } = await supabase.storage.from('wish-photos').upload(path, bytes, { contentType: type, upsert: false });
  if (error) throw new Error('Chưa tải được ảnh. Bạn thử lại nhé.');
  {
    const thumbnail = await photoBytes(await createCheckInThumbnail(photo.uri));
    const { error: thumbnailError } = await supabase.storage.from('wish-photos').upload(checkInThumbnailPath(path), thumbnail.bytes, { contentType: 'image/jpeg', cacheControl: '0', upsert: false });
    if (thumbnailError) throw new Error('Chưa tải được ảnh xem trước. Bạn thử lưu lại nhé.');
  }
  return { uri: `storage://${path}`, storagePath: path };
}
export async function cloudCommand(command: WishCommand): Promise<CloudCouple> {
  if (!supabase) throw new Error('Chưa kết nối máy chủ.');
  if (command.kind === 'checkIn') command = { ...command, input: { ...command.input, photo: await uploadPhoto(command.input.photo) } };
  if (command.kind === 'add') command = { ...command, input: { ...command.input, cover: await uploadPhoto(command.input.cover) } };
  if (command.kind === 'complete') {
    if (command.input.photos.length > PHOTO_LIMITS.memoryCount) throw new Error(`Mỗi kỷ niệm có tối đa ${PHOTO_LIMITS.memoryCount} ảnh.`);
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

// Downloads start only when a visible photo requests them, independently of RPCs.
let activeDownloads = 0;
const waitingDownloads: (() => void)[] = [];
async function limitedDownload<T>(task: () => Promise<T>, priority = false): Promise<T> {
  if (activeDownloads < 3) activeDownloads++;
  else await new Promise<void>(resolve => { if (priority) waitingDownloads.unshift(resolve); else waitingDownloads.push(resolve); });
  try { return await task(); }
  finally { const next = waitingDownloads.shift(); if (next) next(); else activeDownloads--; }
}
function imageData(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Chưa đọc được ảnh.'));
    reader.onerror = reader.onabort = () => reject(new Error('Chưa đọc được ảnh.'));
    reader.readAsDataURL(blob);
  });
}
export async function loadPrivatePhoto(photo: Photo, variant: 'thumbnail' | 'full', scope: string): Promise<string> {
  if (!supabase || !readPrivate || activePhotoScope !== scope || !('uri' in photo) || !photo.storagePath) throw new Error('Phiên xem ảnh đã thay đổi.');
  const client = supabase;
  const read = readPrivate;
  const path = variant === 'thumbnail' ? checkInThumbnailPath(photo.storagePath) : photo.storagePath;
  return read(path, () => limitedDownload(async () => {
    if (activePhotoScope !== scope) throw new Error('Phiên xem ảnh đã thay đổi.');
    const { data, error } = await client.storage.from('wish-photos').download(path, {}, { cache: 'no-store' });
    if (error || !data) {
      // Older clients may have uploaded a full image without its derivative.
      // Only a missing object can fall back; permission/network errors do not.
      if (variant === 'thumbnail' && error && (String(error.statusCode) === '404' || /object not found/i.test(error.message))) {
        const original = await client.storage.from('wish-photos').download(photo.storagePath!, {}, { cache: 'no-store' });
        if (original.error || !original.data) throw new Error('Chưa tải được ảnh riêng tư.');
        return createCheckInThumbnail(await imageData(original.data), true);
      }
      throw new Error('Chưa tải được ảnh riêng tư. Chạm để thử lại.');
    }
    return imageData(data);
  }, variant === 'full'));
}
