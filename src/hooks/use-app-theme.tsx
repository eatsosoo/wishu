import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as defaultColors } from '../constants/theme';

export type ThemeId = 'rose' | 'lavender' | 'sage';
export type ThemeColors = typeof defaultColors;
export const themes: Record<ThemeId, { name: string; description: string; colors: ThemeColors }> = {
  rose: { name: 'Hồng ấm', description: 'Dịu dàng như một lời thương', colors: defaultColors },
  lavender: { name: 'Lavender', description: 'Một chút mơ màng của hai đứa', colors: { background: '#F2EFF9', surface: '#FCFAFF', primary: '#8062AE', burgundy: '#503A73', rose: '#E4DCF2', lavender: '#DCD5F0', ink: '#352F43', muted: '#80738F', line: '#E3DDED' } },
  sage: { name: 'Xanh sage', description: 'Bình yên như một buổi sớm', colors: { background: '#EEF4EE', surface: '#FAFDF8', primary: '#62846C', burgundy: '#345A42', rose: '#DCE9D9', lavender: '#DDE8E0', ink: '#2F3D32', muted: '#758477', line: '#DBE6DA' } },
};

function rgb(hex: string) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(char => char + char).join('') : value;
  return [0, 2, 4].map(offset => parseInt(full.slice(offset, offset + 2), 16));
}
const baseEntries = Object.entries(defaultColors).map(([key, hex]) => ({ key: key as keyof ThemeColors, rgb: rgb(hex) }));
function mapColor(value: string, id: ThemeId): string {
  if (id === 'rose') return value;
  if (/^#[a-f\d]{3}(?:[a-f\d]{3})?$/i.test(value)) {
    const channels = rgb(value);
    // Preserve white icons/button labels and neutral black text.
    if (Math.max(...channels) - Math.min(...channels) < 8) return value;
    const closest = baseEntries.reduce((best, entry) => {
      const distance = entry.rgb.reduce((sum, channel, i) => sum + (channel - channels[i]) ** 2, 0);
      return distance < best.distance ? { key: entry.key, distance } : best;
    }, { key: 'primary' as keyof ThemeColors, distance: Infinity });
    return themes[id].colors[closest.key];
  }
  return value.replace(/rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)/g, (_, red, green, blue, alpha) => {
    const hex = '#' + [red, green, blue].map(channel => Number(channel).toString(16).padStart(2, '0')).join('');
    return `rgba(${rgb(mapColor(hex, id)).join(',')},${alpha})`;
  });
}

const ThemeContext = createContext({ id: 'rose' as ThemeId, colors: defaultColors, t: (value: string) => value, setTheme: (_id: ThemeId) => {}, error: '' });
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<ThemeId>('rose');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem('ourwish:theme').then(saved => { if (active && (saved === 'rose' || saved === 'lavender' || saved === 'sage')) setId(saved); })
      .catch(() => { if (active) setError('Chưa đọc được màu đã lưu trên thiết bị.'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const setTheme = useCallback((next: ThemeId) => {
    setId(next); setError('');
    writes.current = writes.current.then(() => AsyncStorage.setItem('ourwish:theme', next)).catch(() => setError('Màu đã đổi nhưng chưa lưu được trên thiết bị.'));
  }, []);
  const value = useMemo(() => ({ id, colors: themes[id].colors, t: (color: string) => mapColor(color, id), setTheme, error }), [id, setTheme, error]);
  return <ThemeContext.Provider value={value}>{ready ? children : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: defaultColors.background }}><ActivityIndicator color={defaultColors.primary} /></View>}</ThemeContext.Provider>;
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
