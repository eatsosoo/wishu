import { Animated, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useLoadingMotion } from '../hooks/use-loading-motion';

export function ButtonSpinner({ color, size = 20 }: { color: string; size?: number }) {
  const { progress } = useLoadingMotion(850);
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
    <Animated.View style={{ transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9} stroke={color} strokeOpacity={0.22} strokeWidth={2.5} />
        <Path d="M12 3a9 9 0 0 1 9 9" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  </View>;
}
