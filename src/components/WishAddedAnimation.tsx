import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { Artwork } from './Artwork';

export function WishAddedAnimation() {
  const [star] = useState(() => new Animated.Value(0));
  const [lid] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); })
      .catch(() => { if (active) setReduceMotion(true); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    star.setValue(0); lid.setValue(0);
    if (reduceMotion !== false) return;
    const animation = Animated.sequence([
      Animated.timing(lid, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(160),
      Animated.timing(star, { toValue: 1, duration: 720, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay(160),
      Animated.timing(lid, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, star, lid]);

  return <View style={styles.stage} accessible accessibilityRole="image" accessibilityLabel="Điều ước được thả vào hũ, nắp mở lên rồi đóng lại">
    <Artwork name="jarOpen" width={208} height={208} style={styles.jar} />
    <Animated.View pointerEvents="none" style={[styles.star, {
      opacity: star.interpolate({ inputRange: [0, 0.1, 0.65, 0.9, 1], outputRange: [0, 1, 1, 0.2, 0] }),
      transform: [
        { translateY: star.interpolate({ inputRange: [0, 1], outputRange: [0, 144] }) },
        { scale: star.interpolate({ inputRange: [0, 1], outputRange: [1.05, 0.55] }) },
        { rotate: star.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '16deg'] }) },
      ],
    }]}><Star size={36} color="#F2B84B" fill="#F9D36F" strokeWidth={1.5} /></Animated.View>
    <Animated.Image source={require('../../assets/artwork/jar-lid.png')} resizeMode="contain" style={[styles.lid, {
      transform: [
        { translateY: lid.interpolate({ inputRange: [0, 1], outputRange: [0, -74] }) },
        { translateX: lid.interpolate({ inputRange: [0, 1], outputRange: [0, 80] }) },
        { rotate: lid.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-18deg'] }) },
      ],
    }]} />
  </View>;
}

const styles = StyleSheet.create({
  stage: { height: 320, width: '100%', maxWidth: 300, overflow: 'visible' },
  jar: { position: 'absolute', top: 96, left: '50%', marginLeft: -104 },
  star: { position: 'absolute', top: 26, left: '50%', marginLeft: -18, zIndex: 2 },
  // Transparent source padding is included: this aligns the ceramic cap with the glass rim.
  lid: { position: 'absolute', top: 72, left: '50%', marginLeft: -73, width: 146, height: 146, zIndex: 3 },
});
