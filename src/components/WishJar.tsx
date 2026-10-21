import { useAppTheme, useThemeStyles } from '../hooks/use-app-theme';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart } from 'lucide-react-native';
import { ClayObject } from './Artwork';
import { Body } from './ui';
import { fonts } from '../constants/theme';
import type { PersonId } from '../types/domain';

export function WishJar({ owner, name, count, side }: { owner: PersonId; name: string; count: number; side: 'left' | 'right' }) {
  const s = useThemeStyles(baseStyles);

  return <Pressable accessibilityRole="button" accessibilityLabel={`Mở hũ của ${name}, ${count} điều ước`} onPress={() => router.push({ pathname: '/wishes', params: { owner } })} style={[s.jar, side === 'left' ? { left: 0 } : { right: 0 }]}>
    {({ pressed }) => <JarLabel title={`Hũ của ${name}`} subtitle={`${count} điều ước`} pressed={pressed} />}
  </Pressable>;
}

export function JarLabel({ title, subtitle, pressed = false }: { title: string; subtitle: string; pressed?: boolean }) {
  const { colors, t } = useAppTheme();
  const s = useThemeStyles(baseStyles);
  return <View pointerEvents="none" style={[s.label, pressed && s.labelPressed]}>
    <View style={[s.labelDepth, pressed && s.depthPressed]} />
    <LinearGradient colors={[t('#FFF6F0'), t('#F3C8CF')]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={s.labelRim}>
      <LinearGradient colors={[t('#FFFCF6'), t('#FFF2E8')]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.labelFace}>
        <Body numberOfLines={2} ellipsizeMode="tail" style={[s.labelTitle, { color: colors.burgundy }]}>{title}</Body>
        <View style={s.subtitlePill}><Body numberOfLines={1} style={[s.labelSubtitle, { color: colors.burgundy }]}>{subtitle}</Body></View>
      </LinearGradient>
    </LinearGradient>
    <View style={s.labelGlint} />
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.heartCharm}>
      <Heart size={13} color={colors.primary} fill={colors.primary} strokeWidth={1.5} />
    </View>
  </View>;
}
export function CoupleAvatar() { return <ClayObject name="couple" />; }
const baseStyles = StyleSheet.create({
  jar: { position: 'absolute', top: 0, bottom: 0, width: '50%' },
  label: { position: 'absolute', bottom: '5%', left: '9%', width: '82%', borderRadius: 24, boxShadow: '0px 7px 10px rgba(92, 48, 57, 0.18)' },
  labelPressed: { transform: [{ translateY: 3 }], boxShadow: '0px 3px 5px rgba(92, 48, 57, 0.13)' },
  labelDepth: { position: 'absolute', top: 5, bottom: -5, left: 0, right: 0, borderRadius: 24, backgroundColor: '#CE939F', borderWidth: 1, borderColor: '#C08693' },
  depthPressed: { top: 2, bottom: -2 },
  labelRim: { borderRadius: 24, padding: 3, borderWidth: 1, borderColor: '#FFF9F5' },
  labelFace: { minHeight: 68, paddingTop: 12, paddingBottom: 9, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#FFFDFC', gap: 5 },
  heartCharm: { position: 'absolute', left: 12, top: -10, width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 2, borderColor: '#FFF9F5', backgroundColor: '#F9D9DF', transform: [{ rotate: '-12deg' }], boxShadow: '0px 2px 3px rgba(112, 65, 73, 0.14)' },
  labelGlint: { position: 'absolute', top: 3, left: 45, width: 25, height: 2, borderRadius: 2, backgroundColor: '#FFFFFF', opacity: 0.8 },
  subtitlePill: { maxWidth: '100%', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999, backgroundColor: '#F8E5E5' },
  labelTitle: { width: '100%', fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  labelSubtitle: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
