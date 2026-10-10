import { useAppTheme, useThemeStyles } from '../hooks/use-app-theme';
import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurTargetView, BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Home, Heart, Plus, Images, UsersRound, type LucideIcon } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { Heading, IconButton } from './ui';
import { NotificationBell } from './NotificationBell';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useNavigationHighlight } from '../hooks/use-navigation-highlight';

const items: { path: '/' | '/wishes' | '/memories' | '/us'; label: string; icon: LucideIcon }[] = [
  { path: '/', label: 'Trang chủ', icon: Home }, { path: '/wishes', label: 'Điều ước', icon: Heart },
  { path: '/memories', label: 'Kỷ niệm', icon: Images }, { path: '/us', label: 'Của chúng ta', icon: UsersRound },
];
export function BottomNavigation({ blurTarget }: { blurTarget?: RefObject<View | null> }) {
  const s = useThemeStyles(baseStyles);
  const { colors } = useAppTheme();
  const position = useNavigationHighlight();
  const [rowWidth, setRowWidth] = useState(0);
  const slotWidth = rowWidth / 5;
  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * slotWidth }],
  }), [position, slotWidth]);

  const pathname = usePathname().replace(/\/+$/, '') || '/';
  const insets = useSafeAreaInsets();
  function item(index: number) {
    const { path, label, icon: Icon } = items[index];
    const selected = pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));
    return <View key={path} style={s.navSlot}><Pressable onPress={() => { if (!selected) router.replace(path); }} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} style={s.navItem}>
      <Icon size={27} strokeWidth={1.9} color={selected ? '#FFFFFF' : colors.burgundy} fill={selected && path === '/' ? '#FFFFFF' : 'transparent'} />
    </Pressable></View>;
  }
  return <View style={[s.nav, { bottom: Math.max(insets.bottom, 2) }]}>
    <View style={s.navGlass}>
      <BlurView pointerEvents="none" blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={45} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.15)']} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={s.navRow} onLayout={event => setRowWidth(event.nativeEvent.layout.width)}>
      {rowWidth > 0 && <Animated.View pointerEvents="none" style={[s.navHighlight, { width: slotWidth, backgroundColor: colors.primary }, highlightStyle]} />}
      {item(0)}{item(1)}
      <View style={s.navSlot}><Pressable accessibilityRole="button" accessibilityLabel="Thêm điều ước" onPress={() => router.push('/wish/new')} style={s.navItem}><Plus color={colors.burgundy} size={30} strokeWidth={2} /></Pressable></View>
      {item(2)}{item(3)}
      </View>
    </View>
  </View>;
}
export function AppScreen({ children, navigation = false, contentStyle, home = false }: {
  children: ReactNode; navigation?: boolean; contentStyle?: StyleProp<ViewStyle>; home?: boolean;
}) {
  const { colors, t } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  const blurTarget = useRef<View | null>(null);
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
    <LinearGradient colors={home ? [t('#FCE5DC'), t('#F9E6DE'), t('#FBF1EE')] : [t('#FCF5F2'), t('#F9ECEB'), t('#FBF1EE')]} style={StyleSheet.absoluteFill} />
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, contentStyle, navigation && { paddingBottom: 110 }]}>{children}</ScrollView>
    </SafeAreaView>
    </BlurTargetView>
    {navigation && <BottomNavigation blurTarget={blurTarget} />}
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
  nav: { position: 'absolute', left: 16, right: 16, borderRadius: 32, shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 10 },
  navGlass: { height: 62, paddingHorizontal: 6, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
  navRow: { flexDirection: 'row', height: 50, alignItems: 'center' },
  screenTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  navSlot: { width: '20%', height: 50, alignItems: 'center', justifyContent: 'center' },
  navItem: { width: '100%', height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 26 },
  navHighlight: { position: 'absolute', left: 0, top: 0, height: 50, borderRadius: 26 },
});
