import { Image, View, type ImageResizeMode, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import type { ArtName, Photo } from '../types/domain';

// Each illustration/photo is a standalone asset. Never enlarge or offset a UI screenshot.
const assets: Record<ArtName, { source: ImageSourcePropType; aspectRatio: number; clay?: boolean }> = {
  home: { source: require('../../assets/artwork/home.png'), aspectRatio: 299 / 322, clay: true },
  couple: { source: require('../../assets/artwork/couple.png'), aspectRatio: 244 / 153, clay: true },
  jar: { source: require('../../assets/artwork/jar.png'), aspectRatio: 81 / 78, clay: true },
  gift: { source: require('../../assets/artwork/gift.png'), aspectRatio: 196 / 115, clay: true },
  openGift: { source: require('../../assets/artwork/openGift.png'), aspectRatio: 215 / 123, clay: true },
  camera: { source: require('../../assets/artwork/camera.png'), aspectRatio: 255 / 103, clay: true },
  bear: { source: require('../../assets/artwork/bear.png'), aspectRatio: 68 / 77 },
  bearPortrait: { source: require('../../assets/artwork/bear.png'), aspectRatio: 120 / 121 },
  bearReference: { source: require('../../assets/artwork/bear.png'), aspectRatio: 99 / 58 },
  travel: { source: require('../../assets/artwork/travel.png'), aspectRatio: 72 / 78 },
  travelMemory: { source: require('../../assets/artwork/travel.png'), aspectRatio: 121 / 121 },
  photobooth: { source: require('../../assets/artwork/photobooth.png'), aspectRatio: 73 / 77 },
  concert: { source: require('../../assets/artwork/concert.png'), aspectRatio: 120 / 127 },
  photoMemory: { source: require('../../assets/artwork/photoMemory.png'), aspectRatio: 121 / 126 },
  memoryOne: { source: require('../../assets/artwork/bear.png'), aspectRatio: 55 / 52 },
  memoryTwo: { source: require('../../assets/artwork/travel.png'), aspectRatio: 55 / 52 },
  memoryThree: { source: require('../../assets/artwork/photobooth.png'), aspectRatio: 55 / 52 },
};

export function Artwork({ name, width, height, style, label, fit }: {
  name: ArtName; width?: number; height?: number; style?: StyleProp<ViewStyle>; label?: string; fit?: ImageResizeMode;
}) {
  const asset = assets[name];
  return <View style={[{ width: width ?? '100%', height, aspectRatio: height === undefined ? asset.aspectRatio : undefined, overflow: 'hidden' }, style]}>
    <Image source={asset.source} resizeMode={fit ?? (asset.clay ? 'contain' : 'cover')} accessibilityLabel={label}
      accessible={!!label} accessibilityElementsHidden={!label} importantForAccessibility={label ? 'auto' : 'no-hide-descendants'}
      style={{ width: '100%', height: '100%' }} />
  </View>;
}

export function PhotoView({ photo, width, height, style, label, fit }: { photo: Photo; width?: number; height?: number; style?: StyleProp<ViewStyle>; label?: string; fit?: ImageResizeMode }) {
  if ('art' in photo) return <Artwork name={photo.art} width={width} height={height} style={style} label={label} fit={fit} />;
  return <View style={[{ width: width ?? '100%', height, aspectRatio: height === undefined ? 1 : undefined, borderRadius: 15, overflow: 'hidden' }, style]}><Image source={{ uri: photo.uri }} accessibilityLabel={label} resizeMode={fit ?? 'cover'} style={{ width: '100%', height: '100%' }} /></View>;
}

export function BearHero({ height }: { height: number }) {
  return <Artwork name="bearPortrait" height={height} label="Gấu bông màu kem với nơ hồng" />;
}

export function ClayObject({ name, width, height, style }: { name: ArtName; width?: number; height?: number; style?: StyleProp<ViewStyle> }) {
  return <Artwork name={name} width={width} height={height} style={style} />;
}
