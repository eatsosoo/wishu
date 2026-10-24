import type { ViewStyle } from 'react-native';
import { disabledButtonPalette } from '../constants/theme';
import { useAppTheme } from './use-app-theme';

export function useButtonState(disabled = false, loading = false) {
  const { id } = useAppTheme();
  const unavailable = disabled || loading;
  const inactive = disabledButtonPalette[id === 'monochrome' ? 'dark' : 'light'];
  const disabledStyle: ViewStyle | undefined = unavailable ? { backgroundColor: inactive.background, borderColor: inactive.border } : undefined;
  return { unavailable, inactive, disabledStyle, accessibilityState: { disabled: unavailable, busy: loading } };
}
