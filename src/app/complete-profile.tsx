import { useRef, useState } from 'react';
import { View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { DateField } from '../components/DateField';
import { GenderSelector } from '../components/GenderSelector';
import { Body, Heading, PrimaryButton, SecondaryButton } from '../components/ui';
import { usePopup } from '../components/PopupMessage';
import { useAppTheme } from '../hooks/use-app-theme';
import { useWishStore } from '../hooks/use-wish-store';
import { formatDate, parseDate } from '../features/wishes/format';
import { completeProfile } from '../features/auth/profile';
import type { Gender } from '../types/domain';

export default function CompleteProfile() {
  const store = useWishStore();
  const { colors } = useAppTheme();
  const show = usePopup();
  const [birthDate, setBirthDate] = useState(() => store.personalProfile?.birthDate ? formatDate(store.personalProfile.birthDate) : '');
  const [gender, setGender] = useState<Gender | null>(() => store.personalProfile?.gender === 'other' ? null : store.personalProfile?.gender ?? null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function save() {
    if (submitting.current) return;
    if (!gender) { show('Bạn chọn giới tính trước khi tiếp tục nhé.'); return; }
    if (!birthDate) { show('Bạn chọn ngày sinh trước khi tiếp tục nhé.'); return; }
    const input = { birthDate: parseDate(birthDate), gender };
    if (!completeProfile(input)) { show('Ngày sinh cần hợp lệ, từ năm 1900 và không ở tương lai.'); return; }
    submitting.current = true; setBusy(true);
    try { await store.saveInitialProfile(input); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <AppScreen contentStyle={{ justifyContent: 'center', gap: 24, paddingVertical: 40 }}>
    <Body style={{ textAlign: 'center', color: colors.primary, letterSpacing: 3 }}>OUR WISH ♡</Body>
    <View style={{ gap: 10 }}>
      <Heading style={{ textAlign: 'center' }}>Làm quen một chút nhé ♡</Heading>
      <Body style={{ textAlign: 'center', color: colors.muted }}>Chọn giới tính và ngày sinh để hoàn tất hồ sơ của bạn. Sinh nhật sẽ được ghi nhớ trên lịch của hai đứa.</Body>
    </View>
    <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 16, opacity: busy ? 0.6 : 1 }}>
      <GenderSelector value={gender} onChange={setGender} disabled={busy} />
      <DateField label="Ngày sinh" value={birthDate} onChange={setBirthDate} />
    </View>
    <PrimaryButton loading={busy} disabled={busy} onPress={() => void save()}>{busy ? 'Đang lưu…' : 'Tiếp tục ♡'}</PrimaryButton>
    <SecondaryButton onPress={() => { if (!submitting.current) void store.logout(); }}>Đăng xuất</SecondaryButton>
  </AppScreen>;
}
