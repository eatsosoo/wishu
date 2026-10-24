import { Pressable, View } from 'react-native';
import { Body } from './ui';
import { useAppTheme } from '../hooks/use-app-theme';
import { useButtonState } from '../hooks/use-button-state';
import type { Gender } from '../types/domain';

export function GenderSelector({ value, onChange, disabled = false }: { value: Gender | null; onChange: (value: Gender) => void; disabled?: boolean }) {
  const { colors } = useAppTheme();
  const state = useButtonState(disabled);
  return <View style={{ gap: 8 }}>
    <Body>Giới tính</Body>
    <View accessibilityRole="radiogroup" accessibilityLabel="Giới tính" style={{ flexDirection: 'row', gap: 8 }}>
      {([['male', 'Nam'], ['female', 'Nữ']] as const).map(([gender, label]) => <Pressable key={gender} disabled={state.unavailable} accessibilityRole="radio" accessibilityLabel={label}
        accessibilityState={{ ...state.accessibilityState, checked: value === gender }} onPress={() => onChange(gender)}
        style={[{ flex: 1, minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: value === gender ? colors.primary : colors.line, backgroundColor: value === gender ? colors.rose : colors.surface, alignItems: 'center', justifyContent: 'center' }, state.disabledStyle]}>
        <Body style={{ color: state.unavailable ? state.inactive.text : value === gender ? colors.primary : colors.ink }}>{label}</Body>
      </Pressable>)}
    </View>
  </View>;
}
