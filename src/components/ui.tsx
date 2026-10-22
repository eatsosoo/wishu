import { useAppTheme, useThemeStyles } from '../hooks/use-app-theme';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps, type TextProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, Heart, X, type LucideIcon } from 'lucide-react-native';
import { colors, fonts } from '../constants/theme';
import type { Category, CategoryFilter } from '../types/domain';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { PopupLayer } from './PopupMessage';

export function Body({ style, ...props }: TextProps) {
  const { colors } = useAppTheme();

  return <Text {...props} style={[{ fontFamily: fonts.body, color: colors.ink, fontSize: 14, lineHeight: 21 }, style]} />;
}
export function Heading({ style, ...props }: TextProps) {
  const { colors } = useAppTheme();

  return <Text {...props} accessibilityRole="header" style={[{ fontFamily: fonts.heading, color: colors.burgundy, fontSize: 27, lineHeight: 44, paddingVertical: 4, paddingHorizontal: 3 }, style]} />;
}
export function PrimaryButton({ children, onPress, disabled }: { children: ReactNode; onPress: () => void; disabled?: boolean }) {
  const { t, colors } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} style={({ pressed }) => ({ opacity: disabled ? 0.45 : pressed ? 0.8 : 1 })}>
    <LinearGradient colors={[t('#BB607D'), t('#A04B64')]} start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 1 }} style={s.primary}>
      <Body style={{ color: colors.onPrimary, fontFamily: fonts.body, fontSize: 16 }}>{children}</Body>
    </LinearGradient>
  </Pressable>;
}
export function SecondaryButton({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  const { colors } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  return <Pressable accessibilityRole="button" onPress={onPress} style={s.secondary}><Body style={{ color: colors.primary, fontFamily: fonts.medium }}>{children}</Body></Pressable>;
}
export function IconButton({ icon: Icon, onPress, label, filled = false, color, backgroundColor }: { icon: LucideIcon; onPress: () => void; label: string; filled?: boolean; color?: string; backgroundColor?: string }) {
  const { colors } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={5} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
    <View pointerEvents="none" style={[s.icon, filled && { backgroundColor: colors.primary }, backgroundColor !== undefined && { backgroundColor }]}>
      <Icon size={22} color={color ?? (filled ? colors.onPrimary : colors.burgundy)} strokeWidth={1.7} />
    </View>
  </Pressable>;
}
export function CategoryChip({ category }: { category: Category }) {
  const { colors } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  return <View style={s.tag}><Body style={{ fontSize: 12, color: colors.primary, lineHeight: 18 }}>{category}</Body></View>;
}
export function FilterChips({ value, onChange, options = ['Tất cả', 'Quà tặng', 'Du lịch', 'Ăn uống', 'Trải nghiệm'] }: { value: CategoryFilter; onChange: (value: CategoryFilter) => void; options?: CategoryFilter[] }) {
  const { colors, t } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
    {options.map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: value === option }} onPress={() => onChange(option)} style={[s.filter, value === option && { backgroundColor: colors.primary }]}>
      <Body style={{ fontSize: 13, color: value === option ? colors.onPrimary : t('#9A626F') }}>{option}</Body>
    </Pressable>)}
  </ScrollView>;
}
export function AppInput({ label, error, trailing, style, multiline, clearable = true, value, onChangeText, editable, secureTextEntry, ...props }: TextInputProps & { label?: string; error?: string; trailing?: ReactNode; clearable?: boolean }) {
  const { colors, t } = useAppTheme();
  const s = useThemeStyles(baseStyles);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const showClear = !secureTextEntry && clearable && !!value && !!onChangeText && editable !== false;
  const PasswordIcon = passwordVisible ? EyeOff : Eye;

  return <View style={{ gap: 7 }}>
    {!!label && <Body style={s.label}>{label}</Body>}
    <View style={[s.inputWrap, !!error && { borderColor: t('#C85D73') }]}>
      <TextInput accessibilityLabel={label} placeholderTextColor={t("#B1969F")} {...props} value={value} onChangeText={onChangeText} editable={editable} multiline={multiline} secureTextEntry={secureTextEntry ? !passwordVisible : secureTextEntry} style={[s.input, multiline && { minHeight: 78, textAlignVertical: 'top', paddingTop: 12 }, style]} />
      {(showClear || secureTextEntry || trailing) && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 10 }}>
        {showClear && <Pressable accessibilityRole="button" accessibilityLabel={`Xóa ${label ?? 'nội dung'}`} onPress={() => onChangeText?.('')} hitSlop={9} style={s.clearButton}><X size={12} color={t('#987E87')} strokeWidth={2} /></Pressable>}
        {secureTextEntry && <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} accessibilityState={{ disabled: editable === false }} disabled={editable === false} onPress={() => setPasswordVisible(visible => !visible)} hitSlop={9} style={s.passwordButton}><PasswordIcon size={19} color={t('#987E87')} strokeWidth={1.8} /></Pressable>}
        {trailing}
      </View>}
    </View>
    {!!error && <Body accessibilityRole="alert" style={{ color: colors.primary, fontSize: 12 }}>{error}</Body>}
  </View>;
}
export function AppTextarea(props: Parameters<typeof AppInput>[0]) { return <AppInput {...props} multiline />; }
export function PrioritySelector({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { t } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  return <View className="flex-row items-center justify-between">
    <Body style={s.label}>Độ ưu tiên</Body>
    <View className="flex-row" style={{ gap: 5 }}>{[1, 2, 3, 4, 5].map(n => <Pressable key={n} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Ưu tiên ${n} trên 5`} accessibilityState={{ selected: n === value }} onPress={() => onChange(n)}>
      <Heart size={23} strokeWidth={1.5} color={n <= value ? t('#B54765') : t('#E8A9B9')} fill={n <= value ? t('#BD526F') : 'transparent'} />
    </Pressable>)}</View>
  </View>;
}
export function BottomSheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { id } = useAppTheme();
  const s = useThemeStyles(baseStyles);
  const reducedMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const [presented, setPresented] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));
  // Keep the native modal mounted until its exit animation finishes.
  if (visible && !presented) setPresented(true);
  useEffect(() => {
    if (!presented) return;
    let active = true;
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reducedMotion ? 0 : visible ? 280 : 220,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (active && finished && !visible) setPresented(false);
    });
    return () => { active = false; animation.stop(); };
  }, [visible, presented, progress, reducedMotion]);

  return <Modal transparent visible={visible || presented} animationType="none" onRequestClose={onClose}>
    <PopupLayer modal active={visible || presented}>
    <View style={s.overlay}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: id === 'monochrome' ? 'rgba(0,0,0,0.55)' : 'rgba(73,37,47,0.25)', opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} disabled={!visible} />
      </Animated.View>
      <Animated.View accessibilityViewIsModal pointerEvents={visible ? 'auto' : 'none'} style={[s.sheet, { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] }]}>
        <View style={s.handle} />
        <View className="flex-row items-center justify-between" style={{ marginBottom: 18, gap: 12 }}><Heading style={{ flex: 1, minWidth: 0, fontSize: 24, lineHeight: 38 }}>{title}</Heading><IconButton icon={X} label="Đóng" onPress={onClose} /></View>
        {children}
      </Animated.View>
    </View>
    </PopupLayer>
  </Modal>;
}
export const ConfirmDialog = BottomSheet;
export function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  const { colors, t } = useAppTheme();

  return <View style={{ paddingVertical: 40, alignItems: 'center', gap: 16 }}><Heart size={40} color={t("#C8889B")} strokeWidth={1.2} /><Heading style={{ fontSize: 24, textAlign: 'center' }}>{title}</Heading><Body style={{ color: colors.muted, textAlign: 'center' }}>{description}</Body>{action && onAction && <PrimaryButton onPress={onAction}>{action}</PrimaryButton>}</View>;
}
export function LoadingState() {
  const { colors } = useAppTheme();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>;
}
const baseStyles = StyleSheet.create({
  primary: { borderRadius: 999, minHeight: 59, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(130,40,65,0.14)' },
  secondary: { borderRadius: 999, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#F5E5E5' },
  icon: { height: 41, width: 41, borderRadius: 999, backgroundColor: '#FFF9F5', alignItems: 'center', justifyContent: 'center' },
  tag: { alignSelf: 'flex-start', backgroundColor: '#F7E0E5', paddingHorizontal: 11, paddingVertical: 2, borderRadius: 999 },
  filter: { borderRadius: 999, backgroundColor: '#F5E7E7', paddingVertical: 8, paddingHorizontal: 16 },
  label: { color: '#967784', fontSize: 14, lineHeight: 21 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9F7', borderWidth: 1, borderColor: '#F1E3E1', borderRadius: 17, minHeight: 45 },
  input: { flex: 1, minWidth: 0, minHeight: 43, paddingHorizontal: 14, paddingVertical: 9, fontFamily: fonts.body, fontSize: 16, color: '#704654' },
  clearButton: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7EDEE' },
  passwordButton: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 430, padding: 24, paddingBottom: 38, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 999, backgroundColor: '#DBC7CB', marginBottom: 18 },
});
