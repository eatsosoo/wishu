import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isThemeId, mapThemeColor, themes, type ThemeId } from '../features/theme/palette';
import { WishLoading } from '../components/WishLoading';
export { themes, type ThemeId, type ThemeColors } from '../features/theme/palette';
const defaultColors = themes.rose.colors;


const ThemeContext = createContext({ id: 'rose' as ThemeId, colors: defaultColors, t: (value: string) => value, setTheme: (_id: ThemeId) => {}, error: '' });
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<ThemeId>('rose');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem('ourwish:theme').then(saved => { if (active && isThemeId(saved)) setId(saved); })
      .catch(() => { if (active) setError('Chưa đọc được màu đã lưu trên thiết bị.'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const setTheme = useCallback((next: ThemeId) => {
    setId(next); setError('');
    writes.current = writes.current.then(() => AsyncStorage.setItem('ourwish:theme', next)).catch(() => setError('Màu đã đổi nhưng chưa lưu được trên thiết bị.'));
  }, []);
  const value = useMemo(() => ({ id, colors: themes[id].colors, t: (color: string) => mapThemeColor(color, id), setTheme, error }), [id, setTheme, error]);
  return <ThemeContext.Provider value={value}>{ready ? children : <WishLoading colors={defaultColors} />}</ThemeContext.Provider>;
}
export function useAppTheme() { return useContext(ThemeContext); }

function mapStyles<T>(styles: T, transform: (value: string) => string): T {
  if (typeof styles === 'string') return transform(styles) as T;
  if (Array.isArray(styles)) return styles.map(value => mapStyles(value, transform)) as T;
  if (styles && typeof styles === 'object') return Object.fromEntries(Object.entries(styles).map(([key, value]) => [key, mapStyles(value, transform)])) as T;
  return styles;
}
export function useThemeStyles<T extends object>(styles: T): T {
  const { t } = useAppTheme();
  return useMemo(() => mapStyles(styles, t), [styles, t]);
}
