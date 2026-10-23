import { Platform, Switch, View } from 'react-native';
import { useAppTheme } from '../hooks/use-app-theme';
import { Body } from './ui';

export function WishVisibility({ active, onChange, disabled = false }: { active: boolean; onChange: (active: boolean) => void; disabled?: boolean }) {
  const { colors } = useAppTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
    <View style={{ flex: 1, gap: 4 }}>
      <Body>Hiển thị với người ấy</Body>
      <Body style={{ fontSize: 12, color: colors.muted }}>{active ? 'Người ấy có thể xem điều ước này.' : 'Chỉ mình bạn xem được điều ước này.'}</Body>
    </View>
    <Switch accessibilityLabel="Hiển thị điều ước với người ấy" value={active} onValueChange={onChange} disabled={disabled}
      trackColor={{ true: colors.primary, false: colors.line }}
      thumbColor={active ? colors.onPrimary : colors.muted}
      {...Platform.select({
        web: { activeThumbColor: colors.onPrimary },
        ios: { ios_backgroundColor: colors.line },
      })}
      style={{ opacity: disabled ? 0.45 : 1 }} />
  </View>;
}
