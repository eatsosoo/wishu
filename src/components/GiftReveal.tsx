import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { RotateCcw } from 'lucide-react-native';
import { useAppTheme } from '../hooks/use-app-theme';
import { Body } from './ui';
import { revealArtwork } from './reveal-artwork';
import { useRevealLayers } from '../hooks/use-reveal-layers';

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
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [replay, setReplay] = useState(0);
  const [availableWidth, setAvailableWidth] = useState(320);
  const layers = useRevealLayers();
  const artworkReady = layers.ready && reduceMotion !== null;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => { if (active) setReduceMotion(true); });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; listener.remove(); };
  }, []);
  useEffect(() => {
    animation.current?.stop();
    progress.setValue(reduceMotion ? 1 : 0); wobble.setValue(0);
    if (!artworkReady) return;
    if (reduceMotion) return;
    const shake = (toValue: number) => Animated.timing(wobble, { toValue, duration: 85, useNativeDriver: true });
    animation.current = Animated.sequence([
      Animated.delay(120), shake(-1), shake(1), shake(-0.7), shake(0.7), shake(0),
      Animated.timing(progress, { toValue: 1, duration: 2800, easing: Easing.linear, useNativeDriver: true }),
    ]);
    animation.current.start();
    return () => animation.current?.stop();
  }, [reduceMotion, replay, progress, wobble, artworkReady]);

  return <View onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)} style={styles.wrap}>
    <View key={layers.attempt} accessible accessibilityRole="image" accessibilityState={{ busy: !artworkReady && !layers.error }} accessibilityLabel="Hộp quà 3D màu kem với nơ hồng mở nắp và tua rua nhiều màu bay ra" style={[styles.stage, { transform: [{ scale: Math.min(1, availableWidth / 320) }] }]}>
      {!artworkReady && !layers.error ? <ActivityIndicator color={colors.primary} accessibilityLabel="Đang chuẩn bị hộp quà" style={StyleSheet.absoluteFill} /> : null}
      <Animated.View pointerEvents="none" style={[styles.box, { opacity: artworkReady ? 1 : 0, transform: [{ rotateZ: wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-2deg', '2deg'] }) }] }]}>
        <Image source={revealArtwork.gift.body} contentFit="contain" cachePolicy="memory-disk" loading="eager" priority="high" transition={0} style={[styles.artLayer, styles.bodyLayer]} onLoad={() => layers.loaded(1)} onError={layers.failed} />
        <Animated.View style={[styles.artLayer, styles.lidLayer, {
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 0.1, 0.32, 0.46, 1], outputRange: [0, 0, -114, -104, -108] }) },
            { translateX: progress.interpolate({ inputRange: [0, 0.1, 0.4, 1], outputRange: [0, 0, 18, 12] }) },
            { rotateZ: progress.interpolate({ inputRange: [0, 0.1, 0.36, 1], outputRange: ['0deg', '0deg', '-9deg', '-6deg'] }) },
          ],
        }]}>
          <Image source={revealArtwork.gift.lid} contentFit="contain" cachePolicy="memory-disk" loading="eager" priority="high" transition={0} onLoad={() => layers.loaded(2)} onError={layers.failed} style={styles.layerImage} />
        </Animated.View>
      </Animated.View>
      {artworkReady && reduceMotion === false ? pieces.map((piece, index) => <Animated.View key={index} style={[
        styles.particle,
        { width: piece.ribbon ? 5 : 8, height: piece.ribbon ? 27 : 9, borderRadius: piece.ribbon ? 4 : 2, backgroundColor: t(piece.color),
          opacity: progress.interpolate({ inputRange: [0, 0.17, 0.25, 0.72, 1], outputRange: [0, 0, 1, 1, 0] }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 0.17, 0.6, 1], outputRange: [0, 0, piece.x * 0.8, piece.x] }) },
            { translateY: progress.interpolate({ inputRange: [0, 0.17, 0.48, 1], outputRange: [0, 0, -piece.rise, piece.fall] }) },
            { rotateZ: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.rotation}deg`] }) },
          ],
        },
      ]} />) : null}
      {artworkReady ? <><Body style={[styles.sparkle, { left: 37, top: 104, color: colors.primary }]}>✦</Body>
      <Body style={[styles.sparkle, { right: 29, top: 161, color: '#D8B979', fontSize: 27 }]}>✧</Body></> : null}
    </View>
    {layers.error ? <Body accessibilityRole="alert" style={{ color: colors.muted }}>Chưa tải được hộp quà. Bạn thử lại nhé.</Body> : null}
    {layers.error || (artworkReady && reduceMotion === false) ? <Pressable accessibilityRole="button" accessibilityLabel={layers.error ? 'Tải lại hộp quà' : 'Mở hộp quà lần nữa'} onPress={() => layers.error ? layers.retry() : setReplay(value => value + 1)} style={styles.replay}><RotateCcw size={14} color={colors.muted} /><Body style={{ color: colors.muted, fontSize: 12 }}>{layers.error ? 'Thử tải lại' : 'Mở lại'}</Body></Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  stage: { width: 320, height: 380 },
  box: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 1 },
  // Matching full canvases preserve the perspective and alignment of both image layers.
  artLayer: { position: 'absolute', width: 400, height: 400 / 1.5, left: -40, top: 100 },
  bodyLayer: { zIndex: 1 },
  lidLayer: { zIndex: 2 },
  layerImage: { width: '100%', height: '100%' },
  particle: { position: 'absolute', left: 159, top: 229, zIndex: 2 },
  sparkle: { position: 'absolute', fontSize: 20, zIndex: 3 },
  replay: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
});
