import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { AvatarConfig } from './catalog';
import { bodies, eyes, faces, glasses, hair } from './assets';
import rig from '../../../assets/artwork/avatar/rig.json';

// Each independent WebP already occupies the same registered 512 × 700 canvas.
// Render whole images at one scale: no runtime atlas offsets, crops or stretching.
function Layer({ source, tintColor, opacity = 1 }: { source: number; tintColor?: string; opacity?: number }) {
  return <Image source={source} contentFit="contain" cachePolicy="memory" accessible={false}
    pointerEvents="none" tintColor={tintColor} style={[StyleSheet.absoluteFill, { opacity }]} />;
}

export const Avatar = memo(function Avatar({ config, size = 200 }: { config: AvatarConfig; size?: number }) {
  const tint = config.hairColor === 'black' ? '#18131E' : config.hairColor === 'caramel' ? '#DBA45E' : undefined;
  return <View accessible accessibilityRole="image" accessibilityLabel="Avatar đất sét của bạn"
    style={{ width: size, height: size * rig.canvas.height / rig.canvas.width }}>
    <Layer source={bodies[config.outfit][config.skin]} />
    <Layer source={faces[config.skin]} />
    <Layer source={eyes[config.eyes]} />
    <Layer source={hair[config.hair]} />
    {tint && <Layer source={hair[config.hair]} tintColor={tint} opacity={config.hairColor === 'black' ? 0.65 : 0.35} />}
    {config.glasses === 'round' && <Layer source={glasses} />}
  </View>;
});
