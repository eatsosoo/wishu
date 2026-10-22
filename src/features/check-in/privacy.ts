import type { Photo } from '../../types/domain';

export const CHECK_IN_THUMBNAIL_SIZE = 144;
export function checkInThumbnailPath(path: string) { return `${path}.thumb-144.jpg`; }

export function privateCheckInPath(photo: Photo, coupleId: string): string | null {
  if (!('uri' in photo) || !photo.storagePath) return null;
  const segments = photo.storagePath.split('/');
  if (segments.length !== 3 || segments[0] !== coupleId || !/^[a-f\d-]{36}$/i.test(segments[1])
    || !segments[2] || segments.some(segment => segment === '.' || segment === '..')
    || /[\\?#\s%]/.test(photo.storagePath)) return null;
  return photo.storagePath;
}

// Cache only in the current account/space, never AsyncStorage or disk. An old
// in-flight download must not survive logout or populate a different session.
export function createPrivatePhotoCache() {
  let scope = '';
  let generation = 0;
  const entries = new Map<string, { expires: number; value: Promise<string> }>();
  function clear() { generation++; scope = ''; entries.clear(); }
  function begin(nextScope: string, paths: Set<string>) {
    if (scope !== nextScope) { clear(); scope = nextScope; }
    for (const path of entries.keys()) if (!paths.has(path)) entries.delete(path);
    const version = generation;
    return async (path: string, download: () => Promise<string>) => {
      if (version !== generation || scope !== nextScope || !paths.has(path)) throw new Error('Phiên xem ảnh đã thay đổi.');
      const cached = entries.get(path);
      if (cached && cached.expires > Date.now()) return cached.value;
      const value = download().then(uri => {
        if (version !== generation || scope !== nextScope) throw new Error('Phiên xem ảnh đã thay đổi.');
        if (!/^data:image\/(jpeg|png|webp|heic|heif);base64,/.test(uri)) throw new Error('Ảnh riêng tư không hợp lệ.');
        return uri;
      });
      const entry = { expires: Date.now() + 60_000, value };
      entries.set(path, entry);
      void value.catch(() => { if (entries.get(path) === entry) entries.delete(path); });
      return value;
    };
  }
  return { begin, clear };
}
