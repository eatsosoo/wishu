import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'expo-router';
import { Easing, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useReducedMotion } from './use-reduced-motion';

const HighlightContext = createContext<SharedValue<number> | null>(null);
const ExpansionContext = createContext<{ expansion: SharedValue<number>; expand: () => void } | null>(null);
const tabSlots: Record<string, number> = { '/': 0, '/wishes': 1, '/memories': 3, '/us': 4 };

export function NavigationHighlightProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname().replace(/\/+$/, '') || '/';
  const slot = tabSlots[pathname];
  const position = useSharedValue(slot ?? 0);
  const expansion = useSharedValue(0);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const expand = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    expansion.set(withTiming(1, { duration: reducedMotion ? 0 : 460, easing: Easing.out(Easing.cubic) }));
    collapseTimer.current = setTimeout(() => {
      expansion.set(withTiming(0, { duration: reducedMotion ? 0 : 380, easing: Easing.inOut(Easing.cubic) }));
    }, 2200);
  }, [expansion, reducedMotion]);
  useEffect(() => () => { if (collapseTimer.current) clearTimeout(collapseTimer.current); }, []);

  useEffect(() => {
    if (slot !== undefined) {
      position.value = withTiming(slot, { duration: 320, easing: Easing.out(Easing.cubic) });
    }
  }, [position, slot]);

  return <HighlightContext.Provider value={position}><ExpansionContext.Provider value={{ expansion, expand }}>{children}</ExpansionContext.Provider></HighlightContext.Provider>;
}
export function useNavigationExpansion() {
  const context = useContext(ExpansionContext);
  if (!context) throw new Error('NavigationHighlightProvider is required.');
  return context;
}

export function useNavigationHighlight() {
  const position = useContext(HighlightContext);
  if (!position) throw new Error('NavigationHighlightProvider is required.');
  return position;
}
