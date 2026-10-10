import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { usePathname } from 'expo-router';
import { Easing, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

const HighlightContext = createContext<SharedValue<number> | null>(null);
const tabSlots: Record<string, number> = { '/': 0, '/wishes': 1, '/memories': 3, '/us': 4 };

export function NavigationHighlightProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname().replace(/\/+$/, '') || '/';
  const slot = tabSlots[pathname];
  const position = useSharedValue(slot ?? 0);

  useEffect(() => {
    if (slot !== undefined) {
      position.value = withTiming(slot, { duration: 320, easing: Easing.out(Easing.cubic) });
    }
  }, [position, slot]);

  return <HighlightContext.Provider value={position}>{children}</HighlightContext.Provider>;
}

export function useNavigationHighlight() {
  const position = useContext(HighlightContext);
  if (!position) throw new Error('NavigationHighlightProvider is required.');
  return position;
}
