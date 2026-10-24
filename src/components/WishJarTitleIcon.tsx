import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Platform } from 'react-native';
import { useAppTheme } from '../hooks/use-app-theme';

export function WishJarTitleIcon() {
  const { colors } = useAppTheme();
  return <Svg width={36} height={42} viewBox="0 0 36 42" fill="none" pointerEvents="none"
    accessible={Platform.OS === 'web' ? undefined : false} aria-hidden={true}>
    <Path d="M10 15v3c-3 2-4 4-4 7v9a5 5 0 0 0 5 5h14a5 5 0 0 0 5-5v-9c0-3-1-5-4-7v-3" fill={colors.rose} stroke={colors.burgundy} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <Rect x={8} y={10} width={20} height={6} rx={2.5} fill={colors.surface} stroke={colors.burgundy} strokeWidth={1.6} />
    <Path d="M13 12.5h10M9 25v6" stroke={colors.surface} strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M18 33s-6-3.6-6-7a3.2 3.2 0 0 1 6-1.3 3.2 3.2 0 0 1 6 1.3c0 3.4-6 7-6 7Z" fill={colors.primary} />
    <Path d="m27 1 1.2 3.3L31.5 5.5l-3.3 1.2L27 10l-1.2-3.3-3.3-1.2 3.3-1.2L27 1Z" fill={colors.primary} />
    <Path d="M10 3v4M8 5h4" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" />
    <Circle cx={33} cy={17} r={1.3} fill={colors.primary} />
  </Svg>;
}
