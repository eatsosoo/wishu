import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import { useAppTheme } from '../hooks/use-app-theme';
import { Body } from './ui';

const pieces = Array.from({ length: 36 }, (_, index) => ({
  x: Math.cos(index * 2.399) * (95 + (index % 5) * 15),
  rise: 105 + (index % 7) * 17,
  fall: 120 + (index % 5) * 20,
  rotation: (index % 2 ? 1 : -1) * (180 + index * 29),
  color: ['#EBA6BC', '#C2B1E5', '#E6C67A', '#A6CBBB', '#BF6283'][index % 5],
  ribbon: index % 3 === 0,
}));

export function GiftReveal() {
  const { colors, t } = useAppTheme();
  const [progress] = useState(() => new Animated.Value(0));
  const [wobble] = useState(() => new Animated.Value(0));
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [replay, setReplay] = useState(0);
  const [availableWidth, setAvailableWidth] = useState(320);
  const [loadedLayers, setLoadedLayers] = useState(0);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; listener.remove(); };
  }, []);
  useEffect(() => {
    animation.current?.stop(); progress.setValue(reduceMotion && loadedLayers === 3 ? 1 : 0); wobble.setValue(0);
    if (loadedLayers !== 3) return;
    if (reduceMotion) return;
    const shake = (toValue: number) => Animated.timing(wobble, { toValue, duration: 85, useNativeDriver: true });
    animation.current = Animated.sequence([
      Animated.delay(450), shake(-1), shake(1), shake(-0.7), shake(0.7), shake(0),
      Animated.timing(progress, { toValue: 1, duration: 2800, easing: Easing.linear, useNativeDriver: true }),
    ]);
    animation.current.start();
    return () => animation.current?.stop();
  }, [reduceMotion, replay, progress, wobble, loadedLayers]);

  return <View onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)} style={styles.wrap}>
    <View accessible accessibilityRole="image" accessibilityLabel="Hộp quà 3D màu kem với nơ hồng mở nắp và tua rua nhiều màu bay ra" style={[styles.stage, { transform: [{ scale: Math.min(1, availableWidth / 320) }] }]}>
      <View style={[styles.halo, { backgroundColor: colors.rose }]} />
      <Animated.View style={[styles.glow, { backgroundColor: '#FFF0CB', opacity: progress.interpolate({ inputRange: [0, 0.15, 0.4, 1], outputRange: [0, 0, 0.85, 0.3] }), transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.3] }) }] }]} />
      <Animated.View pointerEvents="none" style={[styles.box, { transform: [{ rotateZ: wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-2deg', '2deg'] }) }] }]}>
        <Image source={require('../../assets/artwork/gift-body.png')} resizeMode="contain" style={styles.artLayer} onLoad={() => setLoadedLayers(value => value | 1)} />
        <Animated.Image source={require('../../assets/artwork/gift-lid.png')} resizeMode="contain" onLoad={() => setLoadedLayers(value => value | 2)} style={[styles.artLayer, {
          transform: [
            { perspective: 800 },
            { translateY: progress.interpolate({ inputRange: [0, 0.1, 0.32, 0.46, 1], outputRange: [0, 0, -114, -104, -108] }) },
            { translateX: progress.interpolate({ inputRange: [0, 0.1, 0.4, 1], outputRange: [0, 0, 18, 12] }) },
            { rotateZ: progress.interpolate({ inputRange: [0, 0.1, 0.36, 1], outputRange: ['0deg', '0deg', '-9deg', '-6deg'] }) },
            { rotateX: progress.interpolate({ inputRange: [0, 0.1, 0.4, 1], outputRange: ['0deg', '0deg', '10deg', '7deg'] }) },
          ],
        }]} />
      </Animated.View>
      {!reduceMotion ? pieces.map((piece, index) => <Animated.View key={index} style={[
        styles.particle,
        { width: piece.ribbon ? 5 : 8, height: piece.ribbon ? 27 : 9, borderRadius: piece.ribbon ? 4 : 2, backgroundColor: t(piece.color),
          opacity: progress.interpolate({ inputRange: [0, 0.17, 0.25, 0.72, 1], outputRange: [0, 0, 1, 1, 0] }),
          transform: [
            { perspective: 500 },
            { translateX: progress.interpolate({ inputRange: [0, 0.17, 0.6, 1], outputRange: [0, 0, piece.x * 0.8, piece.x] }) },
            { translateY: progress.interpolate({ inputRange: [0, 0.17, 0.48, 1], outputRange: [0, 0, -piece.rise, piece.fall] }) },
            { rotateZ: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.rotation}deg`] }) },
            { rotateX: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '150deg', '300deg'] }) },
          ],
        },
      ]} />) : null}
      <Body style={[styles.sparkle, { left: 37, top: 104, color: colors.primary }]}>✦</Body>
      <Body style={[styles.sparkle, { right: 29, top: 161, color: '#D8B979', fontSize: 27 }]}>✧</Body>
    </View>
    {!reduceMotion ? <Pressable accessibilityRole="button" accessibilityLabel="Mở hộp quà lần nữa" onPress={() => setReplay(value => value + 1)} style={styles.replay}><RotateCcw size={14} color={colors.muted} /><Body style={{ color: colors.muted, fontSize: 12 }}>Mở lại</Body></Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  stage: { width: 320, height: 380 },
  halo: { position: 'absolute', width: 290, height: 290, left: 15, top: 54, borderRadius: 145, opacity: 0.48 },
  glow: { position: 'absolute', width: 150, height: 150, borderRadius: 75, top: 147, left: 85 },
  box: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  // Matching full canvases preserve the perspective and alignment of both image layers.
  artLayer: { position: 'absolute', width: 400, height: 400 / 1.5, left: -40, top: 100 },
  particle: { position: 'absolute', left: 159, top: 229 },
  sparkle: { position: 'absolute', fontSize: 20 },
  replay: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
});

