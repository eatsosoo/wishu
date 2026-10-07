import { useAppTheme, useThemeStyles } from '../hooks/use-app-theme';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ClayObject } from './Artwork';
import { Body } from './ui';
import { fonts } from '../constants/theme';
import type { PersonId } from '../types/domain';

export function WishJar({ owner, name, count, side }: { owner: PersonId; name: string; count: number; side: 'left' | 'right' }) {
  const { colors } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  return <Pressable accessibilityRole="button" accessibilityLabel={`Mở hũ của ${name}, ${count} điều ước`} onPress={() => router.push({ pathname: '/wishes', params: { owner } })} style={[s.jar, side === 'left' ? { left: 0 } : { right: 0 }]}>
    <View style={[s.label, side === 'left' ? { left: '22%' } : { right: '18%' }]}><Body style={{ fontFamily: fonts.bold, color: colors.burgundy, fontSize: 13 }}>{`Hũ của ${name}`}</Body><Body style={{ color: colors.burgundy, fontSize: 13 }}>{count} điều ước</Body></View>
  </Pressable>;
}
export function CoupleAvatar() { return <ClayObject name="couple" />; }
const baseStyles = StyleSheet.create({
  jar: { position: 'absolute', top: 0, bottom: 0, width: '50%' },
  label: { position: 'absolute', top: '79%', width: '68%', height: '17%', minHeight: 58, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#FFF8F0', gap: 2 },
});
