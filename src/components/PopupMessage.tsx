import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleAlert, X } from 'lucide-react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../hooks/use-app-theme';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { fonts } from '../constants/theme';

type Notice = { id: number; message: string };
const PopupContext = createContext<{
  notice: Notice | null;
  show: (message: string) => void;
  dismiss: (id: number) => void;
  reduced: boolean;
  hosts: string[];
  register: (id: string) => () => void;
} | null>(null);

export function PopupProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [hosts, setHosts] = useState<string[]>([]);
  const sequence = useRef(0);
  const reduced = useReducedMotion();
  const show = useCallback((message: string) => {
    if (message) setNotice({ id: ++sequence.current, message });
  }, []);
  const dismiss = useCallback((id: number) => setNotice(current => current?.id === id ? null : current), []);
  const register = useCallback((id: string) => {
    setHosts(current => [...current, id]);
    return () => setHosts(current => current.filter(host => host !== id));
  }, []);
  return <PopupContext.Provider value={{ notice, show, dismiss, reduced, hosts, register }}>{children}</PopupContext.Provider>;
}

export function usePopup() {
  const context = useContext(PopupContext);
  if (!context) throw new Error('PopupProvider is required.');
  return context.show;
}

// Declarative adapter for errors already held by a screen or the store.
export function PopupMessage({ message }: { message: string }) {
  const show = usePopup();
  useEffect(() => { if (message) show(message); }, [message, show]);
  return null;
}

// Also mounted inside native modals so messages stay above an open sheet.
export function PopupLayer({ children, modal = false, active = true }: { children: ReactNode; modal?: boolean; active?: boolean }) {
  const blurTarget = useRef<ViewInstance | null>(null);
  return <View style={styles.layer}>
    <BlurTargetView ref={blurTarget} style={styles.layer}>{children}</BlurTargetView>
    <PopupHost modal={modal} active={active} blurTarget={blurTarget} />
  </View>;
}

function PopupHost({ modal, active, blurTarget }: { modal: boolean; active: boolean; blurTarget: RefObject<ViewInstance | null> }) {
  const context = useContext(PopupContext);
  const id = useId();
  const register = context?.register;
  useEffect(() => {
    if (modal && active) return register?.(id);
  }, [modal, active, register, id]);
  if (!context?.notice || !active) return null;
  if (modal ? context.hosts.at(-1) !== id : context.hosts.length > 0) return null;
  return <PopupCard key={context.notice.id} notice={context.notice} dismiss={context.dismiss} reduced={context.reduced} blurTarget={blurTarget} />;
}

function PopupCard({ notice, dismiss, reduced, blurTarget }: { notice: Notice; dismiss: (id: number) => void; reduced: boolean; blurTarget: RefObject<ViewInstance | null> }) {
  const { colors, id } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));
  const closing = useRef(false);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, { toValue: 0, duration: reduced ? 0 : 180, useNativeDriver: true })
      .start(({ finished }) => { if (finished) dismiss(notice.id); });
  }, [dismiss, notice.id, progress, reduced]);
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1, duration: reduced ? 0 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced]);
  useEffect(() => {
    const timer = setTimeout(close, Math.max(6000, notice.message.length * 65));
    return () => clearTimeout(timer);
  }, [close, notice.message]);
  useEffect(() => () => progress.stopAnimation(), [progress]);
  return <View pointerEvents="box-none" style={[styles.position, { top: Math.max(insets.top, 12) + 8 }]}>
    <Animated.View style={[styles.card, { opacity: progress,
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-240, 0] }) }] }]}>
      <View style={[styles.glass, id === 'monochrome' && { backgroundColor: colors.surface, borderColor: colors.line, borderBottomColor: colors.line }]}>
        <BlurView pointerEvents="none" blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={40} tint={id === 'monochrome' ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'} style={StyleSheet.absoluteFill} />
        <LinearGradient pointerEvents="none" colors={id === 'monochrome' ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.52)', 'rgba(255,255,255,0.18)']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <View style={[styles.icon, id === 'monochrome' && { backgroundColor: colors.rose, borderColor: colors.line }]}><CircleAlert size={21} color={colors.primary} strokeWidth={1.7} /></View>
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.message, { color: colors.ink }]}>{notice.message}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={close} style={({ pressed }) => [styles.close, pressed && styles.closePressed]}>
            <X size={18} color={colors.burgundy} strokeWidth={1.7} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  layer: { flex: 1 },
  position: { position: 'absolute', left: 12, right: 12, zIndex: 10000, elevation: 20, alignItems: 'center' },
  card: { width: '100%', maxWidth: 406, borderRadius: 24, boxShadow: '0 6px 20px rgba(50,35,50,0.10), 0 1px 3px rgba(50,35,50,0.06)' },
  glass: { overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', borderBottomColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.12)' },
  content: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12, paddingVertical: 10, paddingRight: 4 },
  icon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)', backgroundColor: 'rgba(255,255,255,0.36)', alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
  close: { width: 44, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  closePressed: { backgroundColor: 'rgba(255,255,255,0.4)' },
});
