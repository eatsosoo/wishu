import { useAppTheme, useThemeStyles } from '../hooks/use-app-theme';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Home, Heart, Plus, Images, UsersRound, type LucideIcon } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { Body, Heading, IconButton } from './ui';
import { fonts } from '../constants/theme';
import { NotificationBell } from './NotificationBell';

const items: { path: '/' | '/wishes' | '/memories' | '/us'; label: string; icon: LucideIcon }[] = [
  { path: '/', label: 'Trang chủ', icon: Home }, { path: '/wishes', label: 'Điều ước', icon: Heart },
  { path: '/memories', label: 'Kỷ niệm', icon: Images }, { path: '/us', label: 'Của chúng ta', icon: UsersRound },
];
export function BottomNavigation() {
  const { colors, t } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  const pathname = usePathname();
  function item(index: number) {
    const { path, label, icon: Icon } = items[index];
    const selected = pathname === path;
    return <Pressable key={path} onPress={() => router.replace(path)} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} style={s.navItem}>
      <Icon size={22} strokeWidth={1.6} color={selected ? colors.burgundy : t('#B199A0')} fill={selected && path === '/' ? colors.burgundy : 'transparent'} />
      <Body style={[s.navLabel, { color: selected ? colors.burgundy : colors.muted }]}>{label}</Body>
    </Pressable>;
  }
  return <View style={s.nav}>{item(0)}{item(1)}
    <Pressable accessibilityRole="button" accessibilityLabel="Thêm điều ước" onPress={() => router.push('/wish/new')} style={{ marginHorizontal: 4 }}><LinearGradient colors={[t('#BD647A'), t('#9F435B')]} style={s.add}><Plus color={t("#FFF8F3")} size={27} strokeWidth={1.8} /></LinearGradient></Pressable>
    {item(2)}{item(3)}
  </View>;
}
export function AppScreen({ children, navigation = false, contentStyle, home = false }: {
  children: ReactNode; navigation?: boolean; contentStyle?: StyleProp<ViewStyle>; home?: boolean;
}) {
  const { colors, t } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <LinearGradient colors={home ? [t('#FCE5DC'), t('#F9E6DE'), t('#FBF1EE')] : [t('#FCF5F2'), t('#F9ECEB'), t('#FBF1EE')]} style={StyleSheet.absoluteFill} />
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, contentStyle]}>{children}</ScrollView>
      {navigation && <BottomNavigation />}
    </SafeAreaView>
  </View>;
}
export function AppHeader({ title, back = false, right }: { title?: string; back?: boolean; right?: ReactNode }) {
  const s = useThemeStyles(baseStyles);

  return <View style={s.header}>
    {back ? <IconButton icon={ChevronLeft} label="Quay lại" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /> : <View style={{ width: 41 }} />}
    {!!title && <Heading style={{ flex: 1, fontSize: 20, lineHeight: 27 }}>{title}</Heading>}
    {right ?? <View style={{ width: 41 }} />}
  </View>;
}
export function ScreenTitle({ title, right }: { title: string; right?: ReactNode }) {
  return <View style={baseStyles.screenTitle}>
    <Heading numberOfLines={2} style={{ flex: 1, minWidth: 0, fontSize: 27, lineHeight: 34 }}>{title}</Heading>
    <View style={baseStyles.titleActions}>{right}<NotificationBell /></View>
  </View>;
}
const baseStyles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17, minHeight: 42, gap: 6 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 72, marginHorizontal: 16, marginBottom: 4, paddingHorizontal: 10, paddingTop: 5, paddingBottom: 7, backgroundColor: '#FFFFFF', borderRadius: 28, shadowColor: '#6E3D49', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 10 },
  screenTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  navItem: { flex: 1, gap: 5, alignItems: 'center', paddingVertical: 6 },
  navLabel: { fontSize: 10, lineHeight: 14, fontFamily: fonts.medium },
  add: { width: 53, height: 53, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF9F5' },
});
