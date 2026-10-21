import { Switch, View } from 'react-native';
import { useAppTheme } from '../hooks/use-app-theme';
import { Body } from './ui';

export function WishVisibility({ active, onChange, disabled = false }: { active: boolean; onChange: (active: boolean) => void; disabled?: boolean }) {
  const { colors } = useAppTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
    <View style={{ flex: 1, gap: 4 }}>
      <Body>Hiển thị với người ấy</Body>
      <Body style={{ fontSize: 12, color: colors.muted }}>{active ? 'Người ấy có thể xem điều ước này.' : 'Chỉ mình bạn xem được điều ước này.'}</Body>
    </View>
    <Switch accessibilityLabel="Hiển thị điều ước với người ấy" value={active} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.primary, false: colors.muted }} />
  </View>;
}
