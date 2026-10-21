import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleAlert, X } from 'lucide-react-native';
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
export function PopupHost({ modal = false, active = true }: { modal?: boolean; active?: boolean }) {
  const context = useContext(PopupContext);
  const id = useId();
  const register = context?.register;
  useEffect(() => {
    if (modal && active) return register?.(id);
  }, [modal, active, register, id]);
  if (!context?.notice || !active) return null;
  if (modal ? context.hosts.at(-1) !== id : context.hosts.length > 0) return null;
  return <PopupCard key={context.notice.id} notice={context.notice} dismiss={context.dismiss} reduced={context.reduced} />;
}

function PopupCard({ notice, dismiss, reduced }: { notice: Notice; dismiss: (id: number) => void; reduced: boolean }) {
  const { colors } = useAppTheme();
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
    <Animated.View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary, opacity: progress,
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-240, 0] }) }] }]}>
      <CircleAlert size={22} color={colors.primary} />
      <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.message, { color: colors.ink }]}>{notice.message}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={close} style={styles.close}>
        <X size={19} color={colors.muted} />
      </Pressable>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  position: { position: 'absolute', left: 12, right: 12, zIndex: 10000, elevation: 20, alignItems: 'center' },
  card: { width: '100%', maxWidth: 406, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingVertical: 10, paddingRight: 4, borderRadius: 20, borderWidth: 1, boxShadow: '0 8px 26px rgba(112,65,73,0.18)' },
  message: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  close: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
