import { useId } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import type { ThemeColors } from '../features/theme/palette';
import { useLoadingMotion } from '../hooks/use-loading-motion';

// Vector interpretation of public/icon.png: yellow duck, orange bill, pink
// heart held under its wing. Separate feet make a walk cycle, not a rotation.
export function WalkingDuck({ colors, size = 48, label = 'Đang tải', decorative = false, style }: {
  colors: ThemeColors; size?: number; label?: string; decorative?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { progress } = useLoadingMotion(1100);
  const id = useId().replace(/:/g, '');
  const phase = [0, 0.25, 0.5, 0.75, 1];
  return <View style={[{ width: size, height: size }, style]} accessible={!decorative} accessibilityRole={decorative ? undefined : 'progressbar'}
    accessibilityLabel={decorative ? undefined : label} accessibilityState={decorative ? undefined : { busy: true }} aria-busy={decorative ? undefined : true}
    accessibilityElementsHidden={decorative} importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}>
    <Svg width={size} height={size} viewBox="0 0 160 160" style={StyleSheet.absoluteFill}>
      <Ellipse cx={78} cy={155} rx={44} ry={3} fill={colors.primary} fillOpacity={0.1} />
    </Svg>
    {[0, 1].map(foot => <Animated.View key={foot} pointerEvents="none" style={{ position: 'absolute', left: size * (foot ? 0.52 : 0.36), top: size * 0.775, width: size * 0.22, height: size * 0.205,
      transform: [
        { translateX: progress.interpolate({ inputRange: phase, outputRange: (foot ? [-3, 0, 3, 0, -3] : [3, 0, -3, 0, 3]).map(value => value * size / 160) }) },
        { translateY: progress.interpolate({ inputRange: phase, outputRange: (foot ? [0, -4, 0, 0, 0] : [0, 0, 0, -4, 0]).map(value => value * size / 160) }) },
        { rotate: progress.interpolate({ inputRange: phase, outputRange: foot ? ['18deg', '0deg', '-18deg', '0deg', '18deg'] : ['-18deg', '0deg', '18deg', '0deg', '-18deg'] }) },
      ],
    }}>
      <Svg width="100%" height="100%" viewBox="0 0 35 33"><Path d="M10 1h8l-1 19c4-1 10-1 14 2 4 3 3 8-2 8H5c-4 0-5-5-1-8l5-3 1-18Z" fill={foot ? '#ED963F' : '#F6A64A'} /></Svg>
    </Animated.View>)}
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [
      { translateY: progress.interpolate({ inputRange: phase, outputRange: [0, -2, 0, -2, 0].map(value => value * size / 160) }) },
      { rotate: progress.interpolate({ inputRange: phase, outputRange: ['-1.5deg', '0deg', '1.5deg', '0deg', '-1.5deg'] }) },
    ] }]}>
      <Svg width={size} height={size} viewBox="0 0 160 168" fill="none">
        <Defs>
          <LinearGradient id={`${id}body`} x1="20" y1="38" x2="126" y2="143" gradientUnits="userSpaceOnUse"><Stop stopColor="#FFE486" /><Stop offset={1} stopColor="#FFD25E" /></LinearGradient>
          <LinearGradient id={`${id}heart`} x1="91" y1="80" x2="131" y2="126" gradientUnits="userSpaceOnUse"><Stop stopColor="#CD718A" /><Stop offset={1} stopColor="#BA5A77" /></LinearGradient>
          <LinearGradient id={`${id}wing`} x1="53" y1="91" x2="105" y2="128" gradientUnits="userSpaceOnUse"><Stop stopColor="#FFE58B" /><Stop offset={1} stopColor="#FFCF59" /></LinearGradient>
        </Defs>
        <Path d="M20 87c-9-4-15-11-16-9-5 8 2 21 9 26-7-2-10-5-11-2-3 17 16 35 36 38 24 5 62 5 84-6 17-9 25-30 18-47-3-9-12-14-22-19-12-6-19-8-19-17 20-2 32-18 27-35C121-3 97-7 79 3 59 14 53 36 60 52c7 14 13 20 8 25-6 5-18 4-30 9-8 4-12 4-18 1Z" transform="translate(6 6)" fill={`url(#${id}body)`} />
        <Circle cx={112} cy={42} r={3.8} fill="#543A2C" />
        <Circle cx={113} cy={41} r={0.9} fill="#FFF9E8" fillOpacity={0.65} />
        <Path d="M122 51c-6 7-12 6-13 9-1 4 18 15 28 16 7 1 10-3 6-6-10-6-12-11-13-16-1-4-4-6-8-3Z" fill="#F69B45" />
        <Path d="M110 124c-7-4-32-19-32-35 0-11 14-17 23-6l5 6 5-7c9-11 27-7 28 6 2 17-13 30-29 36Z" fill={`url(#${id}heart)`} />
        <Path d="M45 98c10 10 21 15 33 14 13 0 18-8 23-6 10 4-3 23-17 26-17 4-32-11-39-34Z" fill="#F4BE50" fillOpacity={0.4} />
        <Path d="M44 94c9 10 22 16 34 16 13 0 22-8 25-4 6 9-7 20-15 22-15 5-32-6-44-34Z" fill={`url(#${id}wing)`} />
        <Path d="M70 31c3-8 9-13 17-15" stroke="#FFF0B5" strokeWidth={3} strokeOpacity={0.65} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  </View>;
}
