import { useState } from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ArtName, Photo } from '../types/domain';

const source = require('../../assets/reference-design.png');
// Viewport crops of the user's original artwork; no pixels are regenerated.
const regions: Record<ArtName, readonly [number, number, number, number]> = {
  home: [28, 170, 299, 322], couple: [1034, 815, 244, 153],
  jar: [517, 72, 81, 78], gift: [86, 730, 196, 115],
  openGift: [398, 721, 215, 123], camera: [696, 95, 255, 103],
  bear: [374, 216, 68, 77], bearPortrait: [700, 865, 120, 121],
  bearReference: [1155, 475, 99, 58], travel: [372, 327, 72, 78],
  travelMemory: [842, 865, 121, 121], photobooth: [372, 442, 73, 77],
  concert: [700, 1057, 120, 127], photoMemory: [843, 1057, 121, 126],
  memoryOne: [374, 1032, 55, 52], memoryTwo: [445, 1032, 55, 52], memoryThree: [511, 1032, 55, 52],
};
export function ReferenceArt({ name, width, height, style, label }: {
  name: ArtName; width?: number; height?: number; style?: StyleProp<ViewStyle>; label?: string;
}) {
  const [measured, setMeasured] = useState(width ?? 0);
  const [x, y, w, h] = regions[name];
  const displayWidth = width ?? measured;
  const displayHeight = height ?? displayWidth * h / w;
  const scale = Math.max(displayWidth / w, displayHeight / h);
  return <View accessibilityLabel={label} accessibilityRole={label ? 'image' : undefined}
    onLayout={event => { if (!width) setMeasured(event.nativeEvent.layout.width); }}
    style={[{ width: width ?? '100%', height, aspectRatio: height ? undefined : w / h, overflow: 'hidden' }, style]}>
    {displayWidth > 0 && <Image source={source} resizeMode="stretch" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', width: 1312 * scale, height: 1199 * scale, left: -x * scale + (displayWidth - w * scale) / 2, top: -y * scale + (displayHeight - h * scale) / 2 }} />}
  </View>;
}
export function PhotoView({ photo, width, height, style, label }: { photo: Photo; width?: number; height?: number; style?: StyleProp<ViewStyle>; label?: string }) {
  if ('art' in photo) return <ReferenceArt name={photo.art} width={width} height={height} style={style} label={label} />;
  return <View style={[{ width: width ?? '100%', height, aspectRatio: height ? undefined : 1, borderRadius: 15, overflow: 'hidden' }, style]}><Image source={{ uri: photo.uri }} accessibilityLabel={label} resizeMode="cover" style={{ width: '100%', height: '100%' }} /></View>;
}
export function BearHero({ height }: { height: number }) {
  const [width, setWidth] = useState(0);
  const scale = width / 293;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: '100%', height, overflow: 'hidden' }}>
    {!!width && <Image source={source} resizeMode="stretch" style={{ position: 'absolute', width: 1312 * scale, height: 1199 * scale, left: -997 * scale, top: -42 * scale }} />}
  </View>;
}

export function ClayObject({ name, width, height, style }: { name: ArtName; width?: number; height?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: width ?? '100%' }, style]}><ReferenceArt name={name} width={width} height={height} />
    <LinearGradient pointerEvents="none" colors={['#FCF3F0', 'rgba(252,243,240,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 16 }} />
    <LinearGradient pointerEvents="none" colors={['rgba(252,243,240,0)', '#FCF3F0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 16 }} />
    <LinearGradient pointerEvents="none" colors={['#FCF3F0', 'rgba(252,243,240,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10 }} />
    <LinearGradient pointerEvents="none" colors={['rgba(252,243,240,0)', '#FCF3F0']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 18 }} />
  </View>;
}
