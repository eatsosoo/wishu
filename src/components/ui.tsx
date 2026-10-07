import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, X, type LucideIcon } from 'lucide-react-native';
import { colors, fonts } from '../constants/theme';
import type { Category, CategoryFilter } from '../types/domain';

export function Body({ style, ...props }: TextProps) {
  return <Text {...props} style={[{ fontFamily: fonts.body, color: colors.ink, fontSize: 14, lineHeight: 21 }, style]} />;
}
export function Heading({ style, ...props }: TextProps) {
  return <Text {...props} accessibilityRole="header" style={[{ fontFamily: fonts.heading, color: colors.burgundy, fontSize: 27, lineHeight: 36 }, style]} />;
}
export function PrimaryButton({ children, onPress, disabled }: { children: ReactNode; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} style={({ pressed }) => ({ opacity: disabled ? 0.45 : pressed ? 0.8 : 1 })}>
    <LinearGradient colors={['#BB607D', '#A04B64']} start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 1 }} style={s.primary}>
      <Body style={{ color: '#fff', fontFamily: fonts.body, fontSize: 16 }}>{children}</Body>
    </LinearGradient>
  </Pressable>;
}
export function SecondaryButton({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={s.secondary}><Body style={{ color: colors.primary, fontFamily: fonts.medium }}>{children}</Body></Pressable>;
}
export function IconButton({ icon: Icon, onPress, label, filled = false, color }: { icon: LucideIcon; onPress: () => void; label: string; filled?: boolean; color?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={5} style={({ pressed }) => [s.icon, filled && { backgroundColor: colors.primary }, { opacity: pressed ? 0.7 : 1 }]}>
    <Icon size={22} color={color ?? (filled ? '#fff' : colors.burgundy)} strokeWidth={1.7} />
  </Pressable>;
}
export function CategoryChip({ category }: { category: Category }) {
  return <View style={s.tag}><Body style={{ fontSize: 12, color: colors.primary, lineHeight: 18 }}>{category}</Body></View>;
}
export function FilterChips({ value, onChange, options = ['Tất cả', 'Quà tặng', 'Du lịch', 'Ăn uống', 'Trải nghiệm'] }: { value: CategoryFilter; onChange: (value: CategoryFilter) => void; options?: CategoryFilter[] }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
    {options.map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: value === option }} onPress={() => onChange(option)} style={[s.filter, value === option && { backgroundColor: colors.primary }]}>
      <Body style={{ fontSize: 13, color: value === option ? '#fff' : '#9A626F' }}>{option}</Body>
    </Pressable>)}
  </ScrollView>;
}
export function AppInput({ label, error, trailing, style, multiline, ...props }: TextInputProps & { label?: string; error?: string; trailing?: ReactNode }) {
  return <View style={{ gap: 7 }}>
    {!!label && <Body style={s.label}>{label}</Body>}
    <View style={[s.inputWrap, !!error && { borderColor: '#C85D73' }]}>
      <TextInput accessibilityLabel={label} placeholderTextColor="#B1969F" {...props} multiline={multiline} style={[s.input, multiline && { minHeight: 78, textAlignVertical: 'top', paddingTop: 12 }, style]} />
      {trailing && <View style={{ paddingRight: 14 }}>{trailing}</View>}
    </View>
    {!!error && <Body accessibilityRole="alert" style={{ color: colors.primary, fontSize: 12 }}>{error}</Body>}
  </View>;
}
export function AppTextarea(props: Parameters<typeof AppInput>[0]) { return <AppInput {...props} multiline />; }
export function PrioritySelector({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <View className="flex-row items-center justify-between">
    <Body style={s.label}>Độ ưu tiên</Body>
    <View className="flex-row" style={{ gap: 5 }}>{[1, 2, 3, 4, 5].map(n => <Pressable key={n} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Ưu tiên ${n} trên 5`} accessibilityState={{ selected: n === value }} onPress={() => onChange(n)}>
      <Heart size={23} strokeWidth={1.5} color={n <= value ? '#B54765' : '#E8A9B9'} fill={n <= value ? '#BD526F' : 'transparent'} />
    </Pressable>)}</View>
  </View>;
}
export function BottomSheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} />
      <View accessibilityViewIsModal style={s.sheet}>
        <View style={s.handle} />
        <View className="flex-row items-center justify-between" style={{ marginBottom: 18 }}><Heading style={{ fontSize: 24 }}>{title}</Heading><IconButton icon={X} label="Đóng" onPress={onClose} /></View>
        {children}
      </View>
    </View>
  </Modal>;
}
export const ConfirmDialog = BottomSheet;
export function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <View style={{ paddingVertical: 40, alignItems: 'center', gap: 16 }}><Heart size={40} color="#C8889B" strokeWidth={1.2} /><Heading style={{ fontSize: 24, textAlign: 'center' }}>{title}</Heading><Body style={{ color: colors.muted, textAlign: 'center' }}>{description}</Body>{action && onAction && <PrimaryButton onPress={onAction}>{action}</PrimaryButton>}</View>;
}
export function LoadingState() { return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator color={colors.primary} /></View>; }
const s = StyleSheet.create({
  primary: { borderRadius: 999, minHeight: 59, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(130,40,65,0.14)' },
  secondary: { borderRadius: 999, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#F5E5E5' },
  icon: { height: 41, width: 41, borderRadius: 999, backgroundColor: '#FFF9F5', alignItems: 'center', justifyContent: 'center' },
  tag: { alignSelf: 'flex-start', backgroundColor: '#F7E0E5', paddingHorizontal: 11, paddingVertical: 2, borderRadius: 999 },
  filter: { borderRadius: 999, backgroundColor: '#F5E7E7', paddingVertical: 8, paddingHorizontal: 16 },
  label: { color: '#967784', fontSize: 14, lineHeight: 21 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9F7', borderWidth: 1, borderColor: '#F1E3E1', borderRadius: 17, minHeight: 45 },
  input: { flex: 1, minHeight: 43, paddingHorizontal: 14, paddingVertical: 9, fontFamily: fonts.body, fontSize: 14, color: '#704654' },
  overlay: { flex: 1, backgroundColor: 'rgba(73,37,47,0.25)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 430, padding: 24, paddingBottom: 38, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 999, backgroundColor: '#DBC7CB', marginBottom: 18 },
});
