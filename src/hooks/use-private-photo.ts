import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadPrivatePhoto } from '../services/cloud';
import { useWishStore } from './use-wish-store';
import type { Photo } from '../types/domain';

export function usePrivatePhoto(photo: Photo, variant: 'thumbnail' | 'full', enabled = true) {
  const { session, cloudCouple } = useWishStore();
  const scope = `${session?.user.id}:${cloudCouple?.id}`;
  const path = 'uri' in photo ? photo.storagePath : undefined;
  const [attempt, setAttempt] = useState(0);
  const key = `${scope}:${path}:${variant}:${attempt}`;
  const [result, setResult] = useState<{ key: string; uri?: string; error?: string }>();
  useFocusEffect(useCallback(() => {
    if (!enabled || !path) return;
    let active = true;
    void loadPrivatePhoto({ uri: `storage://${path}`, storagePath: path }, variant, scope)
      .then(uri => { if (active) setResult({ key, uri }); })
      .catch(() => { if (active) setResult({ key, error: 'Chạm để tải lại ảnh' }); });
    return () => { active = false; };
  }, [enabled, path, variant, scope, key]));
  return { uri: result?.key === key ? result.uri : undefined, error: result?.key === key ? result.error : undefined, retry: () => setAttempt(value => value + 1) };
}
