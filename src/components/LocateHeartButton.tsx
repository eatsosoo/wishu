import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAppTheme } from '../hooks/use-app-theme';
import { ButtonSpinner } from './ButtonSpinner';
import { useButtonState } from '../hooks/use-button-state';

export function LocateHeartButton({ onPress, loading, disabled }: { onPress: () => void; loading: boolean; disabled: boolean }) {
  const { colors } = useAppTheme();
  const { unavailable, inactive, disabledStyle, accessibilityState } = useButtonState(disabled, loading);
  const iconColor = unavailable ? inactive.text : colors.primary;
  return <Pressable accessibilityRole="button" accessibilityLabel={loading ? 'Đang lấy vị trí…' : 'Dùng vị trí hiện tại'}
    accessibilityHint="Đưa ghim về vị trí hiện tại của bạn" accessibilityState={accessibilityState}
    disabled={unavailable} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor: colors.surface, borderColor: colors.line, transform: [{ scale: pressed && !unavailable ? 0.94 : 1 }] }, disabledStyle]}>
    <View pointerEvents="none" accessible={false}>
      {loading ? <ButtonSpinner color={iconColor} size={24} /> : <Svg width={30} height={30} viewBox="0 0 32 32" fill="none">
        <Path d="M21 7.5a10 10 0 1 0 4 4" stroke={iconColor} strokeWidth={1.7} strokeLinecap="round" />
        <Path d="M16 3v4M16 25v4M3 16h4M25 16h4" stroke={iconColor} strokeWidth={1.7} strokeLinecap="round" />
        <Path d="M16 21s-6-3.5-6-7a3.2 3.2 0 0 1 6-1.4 3.2 3.2 0 0 1 6 1.4c0 3.5-6 7-6 7Z" fill={colors.rose} stroke={iconColor} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="m26 2 .9 2.6L29.5 5l-2.6.9L26 8.5l-.9-2.6L22.5 5l2.6-.4L26 2Z" fill={iconColor} />
      </Svg>}
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { width: 48, height: 48, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 12px rgba(0,0,0,0.16)' },
});
