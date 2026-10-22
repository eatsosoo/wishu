import type { Gender } from '../../types/domain';

export const avatarOptions = {
  skin: [{ id: 'peach', label: 'Đào', color: '#F4C7A5' }, { id: 'warm', label: 'Ấm', color: '#DFA477' }, { id: 'tan', label: 'Nâu', color: '#B97C56' }, { id: 'deep', label: 'Nâu đậm', color: '#845239' }],
  hair: [{ id: 'short', label: 'Tóc ngắn' }, { id: 'bob', label: 'Tóc dài' }, { id: 'bun', label: 'Búi tóc' }, { id: 'curtains', label: 'Tóc rẽ ngôi' }, { id: 'curls', label: 'Xoăn ngắn' }, { id: 'chinBob', label: 'Bob ngang cằm' }, { id: 'spaceBuns', label: 'Hai búi' }],
  hairColor: [{ id: 'cocoa', label: 'Nâu cacao', color: '#584038' }, { id: 'black', label: 'Đen', color: '#302B36' }, { id: 'caramel', label: 'Caramel', color: '#AA7044' }],
  eyes: [{ id: 'round', label: 'Tròn xoe' }, { id: 'smile', label: 'Mắt cười' }],
  glasses: [{ id: 'none', label: 'Không kính' }, { id: 'round', label: 'Kính tròn' }],
  outfit: [{ id: 'rose', label: 'Áo hồng', color: '#CD8698' }, { id: 'sage', label: 'Áo xanh', color: '#8FA991' }, { id: 'lavender', label: 'Áo tím', color: '#A39AC6' }],
} as const;
export type AvatarCategory = keyof typeof avatarOptions;
export type AvatarConfig = { version: 1 } & { [K in AvatarCategory]: (typeof avatarOptions)[K][number]['id'] };
export const defaultAvatar: AvatarConfig = { version: 1, skin: 'peach', hair: 'bob', hairColor: 'cocoa', eyes: 'round', glasses: 'none', outfit: 'rose' };
/** Only used when no saved customization exists; never infer gender from a name. */
export function defaultAvatarForGender(gender: Gender | null): AvatarConfig {
  if (gender === 'male') return { ...defaultAvatar, hair: 'short', outfit: 'sage' };
  if (gender === 'female') return { ...defaultAvatar, hair: 'bob', outfit: 'rose' };
  return { ...defaultAvatar, hair: 'short', outfit: 'lavender' };
}
export const categoryLabels: Record<AvatarCategory, string> = { skin: 'Màu da', hair: 'Kiểu tóc', hairColor: 'Màu tóc', eyes: 'Đôi mắt', glasses: 'Kính', outfit: 'Trang phục' };
export const avatarCategories = Object.keys(avatarOptions) as AvatarCategory[];
// Missing restrictions mean a shared item. Add restrictions here as gender-specific
// clothing/accessories are introduced; UI, randomization and saved data use one policy.
type ItemAudience = { [K in AvatarCategory]?: Partial<Record<AvatarConfig[K], readonly Gender[]>> };
const itemAudience: ItemAudience = {
  hair: { short: ['male'], bob: ['female'], bun: ['female'], curtains: ['male'], curls: ['male'], chinBob: ['female'], spaceBuns: ['female'] },
};
export function optionsForGender<K extends AvatarCategory>(category: K, gender: Gender | null) {
  return avatarOptions[category].filter(option => {
    if (gender === null || gender === 'other') return true;
    const audience = (itemAudience[category] as Partial<Record<string, readonly Gender[]>> | undefined)?.[option.id];
    return !audience || audience.includes(gender);
  });
}
export function normalizeAvatarForGender(config: AvatarConfig, gender: Gender | null): AvatarConfig {
  const defaults = defaultAvatarForGender(gender);
  return Object.fromEntries([['version', 1], ...avatarCategories.map(key => [
    key, optionsForGender(key, gender).some(option => option.id === config[key]) ? config[key] : defaults[key],
  ])]) as AvatarConfig;
}
export function parseAvatar(raw: string): AvatarConfig {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1) throw new Error('Invalid avatar version');
  for (const key of avatarCategories) {
    if (!(key in value) || !avatarOptions[key].some(option => option.id === (value as Record<string, unknown>)[key])) throw new Error('Invalid avatar option');
  }
  return Object.fromEntries([['version', 1], ...avatarCategories.map(key => [key, (value as Record<string, unknown>)[key]])]) as AvatarConfig;
}
export function randomAvatar(gender: Gender | null = null): AvatarConfig {
  return Object.fromEntries([['version', 1], ...avatarCategories.map(key => {
    const options = optionsForGender(key, gender);
    return [key, options[Math.floor(Math.random() * options.length)].id];
  })]) as AvatarConfig;
}
