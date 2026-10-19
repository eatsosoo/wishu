import { Image } from 'expo-image';
import { Asset } from 'expo-asset';

export const revealArtwork = {
  gift: { body: require('../../assets/artwork/gift-body.webp'), lid: require('../../assets/artwork/gift-lid.webp') },
  jar: { body: require('../../assets/artwork/jar-open.webp'), lid: require('../../assets/artwork/jar-lid.webp') },
};
type Reveal = keyof typeof revealArtwork;
const pending: Partial<Record<Reveal, Promise<boolean>>> = {};

export function prefetchRevealArtwork(reveal: Reveal): Promise<boolean> {
  return pending[reveal] ??= Image.prefetch(Object.values(revealArtwork[reveal]).map(source => Asset.fromModule(source).uri), 'memory-disk')
    .then(success => { if (!success) delete pending[reveal]; return success; })
    .catch(() => { delete pending[reveal]; return false; });
}
