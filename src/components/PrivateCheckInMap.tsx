import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckInMap } from './CheckInMap';
import { loadPrivatePhoto } from '../services/cloud';
import { useWishStore } from '../hooks/use-wish-store';
import type { CheckInMapProps } from '../features/check-in/map-types';
import type { Photo } from '../types/domain';

export function PrivateCheckInMap({ photos, ...props }: CheckInMapProps & { photos: Record<string, Photo> }) {
  const { session, cloudCouple } = useWishStore();
  const scope = `${session?.user.id}:${cloudCouple?.id}`;
  const [loaded, setLoaded] = useState<Record<string, string>>({});
  const pending = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const request = useCallback((id: string) => {
    const photo = photos[id];
    if (!photo || !('uri' in photo) || !photo.private) return;
    const key = `${scope}:${photo.storagePath}`;
    if (pending.current.has(key) || loaded[key]) return;
    pending.current.add(key);
    void loadPrivatePhoto(photo, 'thumbnail', scope).then(uri => {
      if (mounted.current) setLoaded(current => ({ ...current, [key]: uri }));
    }).catch(() => { /* Keep the pin visible; moving the map can retry. */ })
      .finally(() => pending.current.delete(key));
  }, [photos, scope, loaded]);
  const config = { ...props.config, items: props.config.items.map(item => {
    const photo = photos[item.id];
    return photo && 'uri' in photo && photo.private ? { ...item, uri: loaded[`${scope}:${photo.storagePath}`] ?? '' } : item;
  }) };
  return <CheckInMap {...props} config={config} onPhotoRequest={request} />;
}
