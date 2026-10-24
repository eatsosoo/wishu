import { Animated, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { fonts } from '../constants/theme';
import type { ThemeColors } from '../features/theme/palette';
import { useLoadingMotion } from '../hooks/use-loading-motion';
import { WalkingDuck } from './WalkingDuck';

interface SpinnerProps {
  colors: ThemeColors;
  size?: number;
  label?: string;
  decorative?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function WishSpinner(props: SpinnerProps) { return <WalkingDuck {...props} />; }

export interface WishLoadingProps {
  colors: ThemeColors;
  title?: string;
  message?: string;
  fontsReady?: boolean;
}
export function WishLoading({ colors, title = 'Yêu thương đang đến', message = 'Bạn chờ vịt một chút nhé…', fontsReady = false }: WishLoadingProps) {
  const { progress, reducedMotion } = useLoadingMotion(1500);
  return <View style={[styles.screen, { backgroundColor: colors.background }]} accessible accessibilityRole="progressbar"
    accessibilityLabel={`${title}. ${message}`} accessibilityState={{ busy: true }} aria-busy>
    <View style={styles.content}>
      <Text style={[styles.brand, { color: colors.primary, fontFamily: fontsReady ? fonts.bold : undefined }]}>OUR WISH</Text>
      <WishSpinner colors={colors} size={164} decorative />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.burgundy, fontFamily: fontsReady ? fonts.heading : undefined }]}>{title}</Text>
        <Text style={[styles.message, { color: colors.muted, fontFamily: fontsReady ? fonts.body : undefined }]}>{message}</Text>
      </View>
      <View style={styles.dots} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {[0, 1, 2].map(index => <View key={index} style={styles.dot}>
          <View style={[StyleSheet.absoluteFill, styles.dot, { backgroundColor: colors.primary, opacity: 0.3 }]} />
          <Animated.View style={[StyleSheet.absoluteFill, styles.dot, { backgroundColor: '#FFFFFF', opacity: reducedMotion ? 0.6 : progress.interpolate({
            inputRange: [index / 3, (index + 0.3) / 3, (index + 0.7) / 3, (index + 1) / 3],
            outputRange: [0, 1, 1, 0],
            extrapolate: 'clamp',
          }) }]} />
        </View>)}
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 32 },
  content: { width: '100%', maxWidth: 320, alignItems: 'center', gap: 24 },
  brand: { fontSize: 10, fontWeight: '600', letterSpacing: 4, marginBottom: 2 },
  copy: { width: '100%', gap: 10, alignItems: 'center' },
  title: { fontSize: 23, lineHeight: 38, textAlign: 'center' },
  message: { fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 250 },
  dots: { flexDirection: 'row', gap: 6, paddingTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
