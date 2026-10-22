import { usePrivatePhoto } from '../hooks/use-private-photo';
import { useAppTheme } from '../hooks/use-app-theme';
import { Body } from './ui';
import { ActivityIndicator, Pressable, View, type ImageResizeMode, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';
import { Asset } from 'expo-asset';
import type { ArtName, Photo } from '../types/domain';

// Each illustration/photo is a standalone asset. Never enlarge or offset a UI screenshot.
const assets: Record<ArtName, { source: number; aspectRatio: number; clay?: boolean }> = {
  categoryGift: { source: require('../../assets/artwork/categories/gift.webp'), aspectRatio: 1, clay: true },
  categoryTravel: { source: require('../../assets/artwork/categories/travel.webp'), aspectRatio: 1, clay: true },
  categoryDining: { source: require('../../assets/artwork/categories/dining.webp'), aspectRatio: 1, clay: true },
  categoryExperience: { source: require('../../assets/artwork/categories/experience.webp'), aspectRatio: 1, clay: true },
  categoryMoments: { source: require('../../assets/artwork/categories/moments.webp'), aspectRatio: 1, clay: true },
  home: { source: require('../../assets/artwork/home.webp'), aspectRatio: 299 / 322, clay: true },
  couple: { source: require('../../assets/artwork/couple.webp'), aspectRatio: 244 / 153, clay: true },
  jar: { source: require('../../assets/artwork/jar.webp'), aspectRatio: 81 / 78, clay: true },
  jarOpen: { source: require('../../assets/artwork/jar-open.webp'), aspectRatio: 1, clay: true },
  gift: { source: require('../../assets/artwork/gift.webp'), aspectRatio: 196 / 115, clay: true },
  openGift: { source: require('../../assets/artwork/openGift.webp'), aspectRatio: 215 / 123, clay: true },
  camera: { source: require('../../assets/artwork/camera.webp'), aspectRatio: 255 / 103, clay: true },
  bear: { source: require('../../assets/artwork/bear.webp'), aspectRatio: 68 / 77 },
  bearPortrait: { source: require('../../assets/artwork/bear.webp'), aspectRatio: 120 / 121 },
  bearReference: { source: require('../../assets/artwork/bear.webp'), aspectRatio: 99 / 58 },
  travel: { source: require('../../assets/artwork/categories/travel.webp'), aspectRatio: 1, clay: true },
  travelMemory: { source: require('../../assets/artwork/categories/travel.webp'), aspectRatio: 1, clay: true },
  photobooth: { source: require('../../assets/artwork/categories/moments.webp'), aspectRatio: 1, clay: true },
  concert: { source: require('../../assets/artwork/concert.webp'), aspectRatio: 120 / 127 },
  photoMemory: { source: require('../../assets/artwork/categories/moments.webp'), aspectRatio: 1, clay: true },
  memoryOne: { source: require('../../assets/artwork/bear.webp'), aspectRatio: 55 / 52 },
  memoryTwo: { source: require('../../assets/artwork/categories/travel.webp'), aspectRatio: 1, clay: true },
  memoryThree: { source: require('../../assets/artwork/categories/moments.webp'), aspectRatio: 1, clay: true },
};

const categoryArtNames: ArtName[] = ['categoryGift', 'categoryTravel', 'categoryDining', 'categoryExperience', 'categoryMoments'];
let categoryPrefetch: Promise<boolean> | undefined;

// Warm just the five small covers, not the entire illustration library.
export function prefetchCategoryArtwork(): Promise<boolean> {
  if (!categoryPrefetch) {
    const urls = categoryArtNames.map(name => Asset.fromModule(assets[name].source).uri);
    categoryPrefetch = Image.prefetch(urls, 'memory-disk').then(success => {
      if (!success) categoryPrefetch = undefined;
      return success;
    }).catch(() => { categoryPrefetch = undefined; return false; });
  }
  return categoryPrefetch;
}

function contentFit(fit: ImageResizeMode): ImageContentFit {
  if (fit === 'stretch') return 'fill';
  if (fit === 'center') return 'scale-down';
  return fit === 'contain' ? 'contain' : 'cover';
}

export function Artwork({ name, width, height, style, label, fit }: {
  name: ArtName; width?: number; height?: number; style?: StyleProp<ViewStyle>; label?: string; fit?: ImageResizeMode;
}) {
  const asset = assets[name];
  return <View style={[{ width: width ?? '100%', height, aspectRatio: height === undefined ? asset.aspectRatio : undefined, overflow: 'hidden' }, style]}>
    <Image source={asset.source} contentFit={contentFit(fit ?? (asset.clay ? 'contain' : 'cover'))} accessibilityLabel={label}
      cachePolicy="memory-disk" transition={100}
      accessible={!!label} accessibilityElementsHidden={!label} importantForAccessibility={label ? 'auto' : 'no-hide-descendants'}
      style={{ width: '100%', height: '100%' }} />
  </View>;
}

export function PhotoView({ photo, width, height, style, label, fit, variant = 'full', enabled = true }: { photo: Photo; width?: number; height?: number; style?: StyleProp<ViewStyle>; label?: string; fit?: ImageResizeMode; variant?: 'thumbnail' | 'full'; enabled?: boolean }) {
  if ('uri' in photo && (photo.private || (variant === 'thumbnail' && photo.storagePath))) return <PrivatePhotoView photo={photo} width={width} height={height} style={style} label={label} fit={fit} variant={variant} enabled={enabled} />;
  if ('art' in photo) return <Artwork name={photo.art} width={width} height={height} style={style} label={label} fit={fit} />;
  return <View style={[{ width: width ?? '100%', height, aspectRatio: height === undefined ? 1 : undefined, borderRadius: 15, overflow: 'hidden' }, style]}><Image source={{ uri: photo.uri }} accessibilityLabel={label} contentFit={contentFit(fit ?? 'cover')} cachePolicy={photo.uri.startsWith('data:') ? 'none' : 'memory-disk'} transition={100} style={{ width: '100%', height: '100%' }} /></View>;
}

export function BearHero({ height }: { height: number }) {
  return <Artwork name="bearPortrait" height={height} label="Gấu bông màu kem với nơ hồng" />;
}

export function ClayObject({ name, width, height, style }: { name: ArtName; width?: number; height?: number; style?: StyleProp<ViewStyle> }) {
  return <Artwork name={name} width={width} height={height} style={style} />;
}

function PrivatePhotoView({ photo, width, height, style, label, fit, variant, enabled }: Parameters<typeof PhotoView>[0]) {
  const { uri, error, retry } = usePrivatePhoto(photo, variant ?? 'full', enabled);
  const { colors } = useAppTheme();
  return <View style={[{ width: width ?? '100%', height, aspectRatio: height === undefined ? 1 : undefined, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' }, style]}>
    {uri ? <Image source={{ uri }} accessibilityLabel={label} contentFit={contentFit(fit ?? 'cover')} cachePolicy="none" transition={150} style={{ width: '100%', height: '100%' }} />
      : error ? <Pressable accessibilityRole="button" accessibilityLabel="Tải lại ảnh kỷ niệm" onPress={retry} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Body style={{ fontSize: 11, color: colors.primary }}>{variant === 'thumbnail' ? '↻' : error}</Body></Pressable>
      : <ActivityIndicator size="small" color={colors.primary} />}
  </View>;
}
