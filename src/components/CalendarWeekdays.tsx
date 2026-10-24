import { View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Body } from './ui';
import { useAppTheme } from '../hooks/use-app-theme';

export function CalendarWeekdays({ style, textStyle }: { style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  const { colors } = useAppTheme();
  return <View style={[{ flexDirection: 'row' }, style]}>
    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <Body key={day} style={[{ width: '14.2857%', textAlign: 'center', color: colors.muted }, textStyle]}>{day}</Body>)}
  </View>;
}
