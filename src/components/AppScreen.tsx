import { useAppTheme, useThemeStyles } from '../hooks/use-app-theme';
import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurTargetView, BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Home, Heart, Plus, CalendarHeart, UsersRound, type LucideIcon } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { Heading, IconButton } from './ui';
import { NotificationBell } from './NotificationBell';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useNavigationExpansion, useNavigationHighlight } from '../hooks/use-navigation-highlight';
import { spacing } from '../constants/theme';

const items: { path: '/' | '/wishes' | '/memories' | '/us'; label: string; icon: LucideIcon }[] = [
  { path: '/', label: 'Trang chủ', icon: Home }, { path: '/wishes', label: 'Điều ước', icon: Heart },
  { path: '/memories', label: 'Kỷ niệm', icon: CalendarHeart }, { path: '/us', label: 'Của chúng ta', icon: UsersRound },
];
export function BottomNavigation({ blurTarget }: { blurTarget?: RefObject<View | null> }) {
  const s = useThemeStyles(baseStyles);
  const { colors } = useAppTheme();
  const position = useNavigationHighlight();
  const { expansion, expand } = useNavigationExpansion();
  const sizeStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.8 + expansion.value * 0.2 }] }));
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
    return <View key={path} style={s.navSlot}><Pressable hitSlop={6} onPress={() => { expand(); if (!selected) router.replace(path); }} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} style={s.navItem}>
      <Icon size={27} strokeWidth={1.9} color={selected ? '#FFFFFF' : colors.burgundy} fill={selected && path === '/' ? '#FFFFFF' : 'transparent'} />
    </Pressable></View>;
  }
  return <Animated.View testID="bottom-navigation" style={[s.nav, { bottom: Math.max(insets.bottom, 0) + 16 }, sizeStyle]}>
    <View style={s.navGlass}>
      <BlurView pointerEvents="none" blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={45} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.15)']} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={s.navRow} onLayout={event => setRowWidth(event.nativeEvent.layout.width)}>
      {rowWidth > 0 && <Animated.View pointerEvents="none" style={[s.navHighlight, { width: slotWidth, backgroundColor: colors.primary }, highlightStyle]} />}
      {item(0)}{item(1)}
      <View style={s.navSlot}><Pressable hitSlop={6} accessibilityRole="button" accessibilityLabel="Thêm điều ước" onPress={() => { expand(); router.push('/wish/new'); }} style={s.navItem}><Plus color={colors.burgundy} size={30} strokeWidth={2} /></Pressable></View>
      {item(2)}{item(3)}
      </View>
    </View>
  </Animated.View>;
}
export interface AppHeaderProps { title: string; back?: boolean; onBack?: () => void; backLabel?: string; right?: ReactNode }

export function AppScreen({ children, navigation = false, contentStyle, home = false, bottomAction, header }: {
  children: ReactNode; navigation?: boolean; contentStyle?: StyleProp<ViewStyle>; home?: boolean; bottomAction?: ReactNode; header?: AppHeaderProps;
}) {
  const { colors, t } = useAppTheme();
  const s = useThemeStyles(baseStyles);
  const insets = useSafeAreaInsets();

  const blurTarget = useRef<View | null>(null);
  const { expand } = useNavigationExpansion();
  const scrollY = useRef(0);
  const downwardTravel = useRef(0);
  const touchY = useRef<number | null>(null);
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
    <LinearGradient colors={home ? [t('#FCE5DC'), t('#F9E6DE'), t('#FBF1EE')] : [t('#FCF5F2'), t('#F9ECEB'), t('#FBF1EE')]} style={StyleSheet.absoluteFill} />
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {header ? <AppHeader {...header} /> : null}
      <ScrollView testID="screen-scroll" style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        scrollEventThrottle={32}
        onTouchStart={navigation ? event => { touchY.current = event.nativeEvent.pageY; } : undefined}
        onTouchEnd={navigation ? event => { if (touchY.current !== null && event.nativeEvent.pageY - touchY.current > 35) expand(); touchY.current = null; } : undefined}
        onScroll={navigation ? event => {
          const nextY = event.nativeEvent.contentOffset.y;
          downwardTravel.current = nextY < scrollY.current ? downwardTravel.current + scrollY.current - nextY : 0;
          if (downwardTravel.current > 24) { expand(); downwardTravel.current = 0; }
          scrollY.current = nextY;
        } : undefined}
        contentContainerStyle={[s.content, header && { paddingTop: 12 }, contentStyle, navigation && { paddingBottom: 110 }]}>{children}</ScrollView>
    </SafeAreaView>
    </BlurTargetView>
    {navigation && <BottomNavigation blurTarget={blurTarget} />}
    {bottomAction && <View style={[s.actionBar, { bottom: Math.max(insets.bottom, 0) + 16 }]}>
      <View style={[s.navGlass, s.actionGlass]}>
        <BlurView pointerEvents="none" blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={45} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.15)']} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={{ gap: 8 }}>{bottomAction}</View>
      </View>
    </View>}
  </View>;
}
export function AppHeader({ title, back = true, onBack, backLabel = 'Quay lại', right }: AppHeaderProps) {
  const s = useThemeStyles(baseStyles);

  return <View testID="subpage-header" style={s.header}>
    <View style={s.headerAction}>{back && <IconButton icon={ChevronLeft} label={backLabel} onPress={onBack ?? (() => router.canGoBack() ? router.back() : router.replace('/'))} />}</View>
    <Heading numberOfLines={1} ellipsizeMode="tail" style={s.headerTitle}>{title}</Heading>
    <View style={s.headerAction}>{right}</View>
  </View>;
}
export function ScreenTitle({ title, right }: { title: string; right?: ReactNode }) {
  return <View style={baseStyles.screenTitle}>
    <Heading style={{ flex: 1, minWidth: 0, fontSize: 27, lineHeight: 44 }}>{title}</Heading>
    <View style={baseStyles.titleActions}><NotificationBell />{right}</View>
  </View>;
}
const baseStyles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: 18, paddingBottom: spacing.lg },
  // All subpage headers share these metrics and sit outside the ScrollView.
  header: { height: 64, flexShrink: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, gap: 8, backgroundColor: '#FBF1EE', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0E0DD' },
  headerAction: { width: 44, minHeight: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, minWidth: 0, fontSize: 20, lineHeight: 34, paddingVertical: 0, paddingHorizontal: 0, textAlign: 'center',
    includeFontPadding: false, textAlignVertical: 'center',
    // Pacifico's iOS glyph baseline sits below the visual center of the line box.
    ...Platform.select({ ios: { transform: [{ translateY: -4 }] }, default: {} }),
  },
  nav: { position: 'absolute', left: 16, right: 16, borderRadius: 32, shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 10 },
  navGlass: { height: 62, paddingHorizontal: 6, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
  actionBar: { position: 'absolute', left: 16, right: 16, borderRadius: 999, boxShadow: '0px 6px 16px rgba(130,40,65,0.22)' },
  actionGlass: { height: 'auto', paddingHorizontal: 0, paddingVertical: 0, borderWidth: 0, borderRadius: 999 },
  navRow: { flexDirection: 'row', height: 50, alignItems: 'center' },
  screenTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  titleActions: { flexShrink: 0, alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  navSlot: { width: '20%', height: 50, alignItems: 'center', justifyContent: 'center' },
  navItem: { width: '100%', height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 26 },
  navHighlight: { position: 'absolute', left: 0, top: 0, height: 50, borderRadius: 26 },
});
