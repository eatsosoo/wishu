import tokens from '../../constants/design-tokens.cjs';

const defaultColors = { ...tokens.colors, onPrimary: '#FFFFFF' };

export type ThemeId = 'rose' | 'lavender' | 'sage' | 'ocean' | 'monochrome';
export type ThemeColors = typeof defaultColors;
export const themes: Record<ThemeId, { name: string; description: string; colors: ThemeColors }> = {
  rose: { name: 'Chớm thương', description: 'Hồng ấm như lần đầu rung động', colors: defaultColors },
  lavender: { name: 'Chiều mộng mơ', description: 'Tím dịu như một chiều bên nhau', colors: { onPrimary: '#FFFFFF', background: '#F2EFF9', surface: '#FCFAFF', primary: '#8062AE', burgundy: '#503A73', rose: '#E4DCF2', lavender: '#DCD5F0', ink: '#352F43', muted: '#80738F', line: '#E3DDED' } },
  sage: { name: 'Vườn bình yên', description: 'Xanh lá nhẹ như buổi sớm trong lành', colors: { onPrimary: '#FFFFFF', background: '#EEF4EE', surface: '#FAFDF8', primary: '#62846C', burgundy: '#345A42', rose: '#DCE9D9', lavender: '#DDE8E0', ink: '#2F3D32', muted: '#758477', line: '#DBE6DA' } },
  ocean: { name: 'Hẹn bên biển', description: 'Xanh biển mát như làn gió ngày hẹn', colors: { onPrimary: '#FFFFFF', background: '#EEF5FC', surface: '#F9FCFF', primary: '#3275A5', burgundy: '#245477', rose: '#D8EAF6', lavender: '#D7E4F5', ink: '#283D50', muted: '#5D758A', line: '#D5E3EF' } },
  monochrome: { name: 'Dưới ánh trăng', description: 'Đen trắng, lặng yên một góc trời đêm', colors: { background: '#101010', surface: '#1C1C1C', primary: '#E8E8E8', onPrimary: '#151515', burgundy: '#F4F4F4', rose: '#2A2A2A', lavender: '#343434', ink: '#F2F2F2', muted: '#AAAAAA', line: '#3D3D3D' } },
};

function rgb(hex: string) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(char => char + char).join('') : value;
  return [0, 2, 4].map(offset => parseInt(full.slice(offset, offset + 2), 16));
}
const baseEntries = Object.entries(tokens.colors).map(([key, hex]) => ({ key: key as keyof ThemeColors, rgb: rgb(hex) }));
export function mapThemeColor(value: string, id: ThemeId): string {
  if (id === 'rose') return value;
  if (/^#[a-f\d]{3}(?:[a-f\d]{3})?$/i.test(value)) {
    const channels = rgb(value);
    // Preserve white photo overlays; adapt other neutral UI colors in the dark theme.
    if (Math.max(...channels) - Math.min(...channels) < 8) {
      if (id !== 'monochrome' || channels.every(channel => channel === 255)) return value;
      const brightness = channels.reduce((sum, channel) => sum + channel, 0) / 3;
      return brightness > 240 ? themes[id].colors.surface : brightness < 100 ? themes[id].colors.ink : themes[id].colors.muted;
    }
    const closest = baseEntries.reduce((best, entry) => {
      const distance = entry.rgb.reduce((sum, channel, i) => sum + (channel - channels[i]) ** 2, 0);
      return distance < best.distance ? { key: entry.key, distance } : best;
    }, { key: 'primary' as keyof ThemeColors, distance: Infinity });
    return themes[id].colors[closest.key];
  }
  return value.replace(/rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)/g, (_, red, green, blue, alpha) => {
    if (id === 'monochrome' && Math.max(Number(red), Number(green), Number(blue)) < 128) return `rgba(0,0,0,${alpha})`;
    const hex = '#' + [red, green, blue].map(channel => Number(channel).toString(16).padStart(2, '0')).join('');
    return `rgba(${rgb(mapThemeColor(hex, id)).join(',')},${alpha})`;
  });
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && Object.hasOwn(themes, value);
}
