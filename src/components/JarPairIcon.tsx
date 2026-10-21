import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useAppTheme } from '../hooks/use-app-theme';

export function JarPairIcon() {
  const { colors } = useAppTheme();
  return <Svg width={28} height={28} viewBox="0 0 32 32" pointerEvents="none">
    <Path d="M16 8c-5-3-3-7 0-4 3-3 5 1 0 4Z" fill={colors.primary} />
    <G transform="rotate(-9 10 21)" stroke={colors.burgundy} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 14v3c-2 1-2 3-2 5v4c0 2 1 3 3 3h7c2 0 3-1 3-3v-4c0-2 0-4-2-5v-3Z" fill={colors.rose} />
      <Rect x={4} y={11} width={11} height={4} rx={1.5} fill={colors.surface} />
      <Circle cx={7} cy={22} r={0.7} fill={colors.burgundy} stroke="none" />
      <Circle cx={12} cy={22} r={0.7} fill={colors.burgundy} stroke="none" />
      <Path d="M8 25q1.5 1.5 3 0" fill="none" />
    </G>
    <G transform="rotate(9 23 21)" stroke={colors.burgundy} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 14v3c-2 1-2 3-2 5v4c0 2 1 3 3 3h7c2 0 3-1 3-3v-4c0-2 0-4-2-5v-3Z" fill={colors.surface} />
      <Rect x={17} y={11} width={11} height={4} rx={1.5} fill={colors.rose} />
      <Circle cx={20} cy={22} r={0.7} fill={colors.burgundy} stroke="none" />
      <Circle cx={25} cy={22} r={0.7} fill={colors.burgundy} stroke="none" />
      <Path d="M21 25q1.5 1.5 3 0" fill="none" />
    </G>
  </Svg>;
}
