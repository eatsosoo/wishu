import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAppTheme } from '../hooks/use-app-theme';

export function LocateHeartButton({ onPress, loading, disabled }: { onPress: () => void; loading: boolean; disabled: boolean }) {
  const { colors } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={loading ? 'Đang lấy vị trí…' : 'Dùng vị trí hiện tại'}
    accessibilityHint="Đưa ghim về vị trí hiện tại của bạn" accessibilityState={{ busy: loading, disabled: disabled || loading }}
    disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor: colors.surface, borderColor: colors.line, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
    <View pointerEvents="none" accessible={false}>
      {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Svg width={30} height={30} viewBox="0 0 32 32" fill="none">
        <Path d="M21 7.5a10 10 0 1 0 4 4" stroke={colors.primary} strokeWidth={1.7} strokeLinecap="round" />
        <Path d="M16 3v4M16 25v4M3 16h4M25 16h4" stroke={colors.primary} strokeWidth={1.7} strokeLinecap="round" />
        <Path d="M16 21s-6-3.5-6-7a3.2 3.2 0 0 1 6-1.4 3.2 3.2 0 0 1 6 1.4c0 3.5-6 7-6 7Z" fill={colors.rose} stroke={colors.primary} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="m26 2 .9 2.6L29.5 5l-2.6.9L26 8.5l-.9-2.6L22.5 5l2.6-.4L26 2Z" fill={colors.primary} />
      </Svg>}
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { width: 48, height: 48, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 12px rgba(0,0,0,0.16)' },
});
