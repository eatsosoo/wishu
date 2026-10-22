import type { Gender } from '../../types/domain';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Body, PrimaryButton } from '../../components/ui';
import { useAppTheme } from '../../hooks/use-app-theme';
import { fonts } from '../../constants/theme';
import { Avatar } from './Avatar';
import { avatarCategories, optionsForGender, normalizeAvatarForGender, categoryLabels, defaultAvatarForGender, parseAvatar, randomAvatar, type AvatarCategory, type AvatarConfig } from './catalog';

/** Mount with key={`${userId}:${gender}`} so drafts and pending loads never cross accounts. */
export function AvatarStudio({ userId, gender, onCancel }: { userId: string; gender: Gender | null; onCancel: () => void }) {
  const { colors } = useAppTheme();
  const [saved, setSaved] = useState<AvatarConfig>(() => defaultAvatarForGender(gender));
  const [draft, setDraft] = useState<AvatarConfig>(() => defaultAvatarForGender(gender));
  const [ready, setReady] = useState(false);
  const [category, setCategory] = useState<AvatarCategory>('skin');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  const storageKey = `wishu:avatar:v1:${userId}`;
  useEffect(() => {
    mounted.current = true;
    let active = true;
    AsyncStorage.getItem(storageKey).then(raw => {
      if (!active || !raw) return;
      const previous = parseAvatar(raw);
      const config = normalizeAvatarForGender(previous, gender);
      if (JSON.stringify(config) !== JSON.stringify(previous)) setMessage('Một số lựa chọn đã được điều chỉnh theo giới tính trong hồ sơ. Nhấn lưu để cập nhật.');
      setSaved(config); setDraft(config);
    }).catch(() => { if (active) setMessage('Chưa đọc được avatar đã lưu. Bạn có thể tạo và lưu lại.'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; mounted.current = false; };
  }, [storageKey, gender]);
  async function save() {
    if (busy.current || !ready) return;
    busy.current = true; setSaving(true); setMessage('');
    try {
      const config = normalizeAvatarForGender(draft, gender);
      await AsyncStorage.setItem(storageKey, JSON.stringify(config));
      if (mounted.current) { setSaved(config); setDraft(config); setMessage('Đã lưu avatar trên thiết bị này ♡'); }
    } catch { if (mounted.current) setMessage('Chưa lưu được avatar. Bạn thử lại nhé.'); }
    finally { busy.current = false; if (mounted.current) setSaving(false); }
  }
  return <View style={{ backgroundColor: colors.surface, borderRadius: 26, padding: 18, marginBottom: 18, gap: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ flex: 1 }}><Body style={{ fontFamily: fonts.bold, fontSize: 17 }}>Một phiên bản của bạn</Body><Body style={{ color: colors.muted, fontSize: 12 }}>Avatar thử nghiệm · Lưu trên thiết bị</Body></View>
    </View>
    {!ready ? <ActivityIndicator color={colors.primary} /> : <>
      <View style={{ alignItems: 'center' }}><Avatar config={draft} size={260} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {avatarCategories.map(key => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: category === key }} onPress={() => setCategory(key)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 22, backgroundColor: category === key ? colors.primary : colors.rose }}><Body style={{ color: category === key ? '#FFFFFF' : colors.ink }}>{categoryLabels[key]}</Body></Pressable>)}
      </ScrollView>
      <Body style={{ fontFamily: fonts.bold }}>{categoryLabels[category]}</Body>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {optionsForGender(category, gender).map(option => {
          const selected = draft[category] === option.id;
          return <Pressable key={option.id} disabled={saving} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: selected, disabled: saving }} onPress={() => { setDraft(value => ({ ...value, [category]: option.id })); setMessage(''); }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 2, borderColor: selected ? colors.primary : colors.line, backgroundColor: selected ? colors.rose : colors.surface }}>
            {'color' in option && <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: option.color }} />}
            <Body>{option.label}{selected ? ' ✓' : ''}</Body>
          </Pressable>;
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable disabled={saving} accessibilityRole="button" accessibilityState={{ disabled: saving }} onPress={() => { setDraft(randomAvatar(gender)); setMessage(''); }} style={{ flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Body style={{ color: colors.primary }}>Phối ngẫu nhiên</Body></Pressable>
        <Pressable disabled={saving} accessibilityRole="button" accessibilityState={{ disabled: saving }} onPress={() => { setDraft(saved); setMessage(''); onCancel(); }} style={{ flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Body style={{ color: colors.muted }}>Hủy thay đổi</Body></Pressable>
      </View>
      <PrimaryButton disabled={saving} onPress={() => void save()}>{saving ? 'Đang lưu…' : 'Lưu avatar ♡'}</PrimaryButton>
    </>}
    {!!message && <Body accessibilityLiveRegion="polite" style={{ color: colors.primary, fontSize: 12 }}>{message}</Body>}
  </View>;
}
