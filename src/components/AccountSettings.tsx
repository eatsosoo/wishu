import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Body, BottomSheet, PrimaryButton, SecondaryButton } from './ui';
import { useAppTheme } from '../hooks/use-app-theme';
import { useWishStore } from '../hooks/use-wish-store';
import { DateField } from './DateField';
import { formatDate, parseDate } from '../features/wishes/format';
import type { Gender } from '../types/domain';

export function AccountSettings({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const store = useWishStore();
  const { colors } = useAppTheme();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  function close() {
    if (submitting.current) return;
    setConfirming(false); setEditing(false); setError(''); onClose();
  }
  function editProfile() {
    const member = store.couple.members.find(item => item.id === store.actor);
    setBirthDate(member?.birthDate ? formatDate(member.birthDate) : '');
    setGender(member?.gender ?? null); setError(''); setEditing(true);
  }
  async function saveProfile() {
    if (submitting.current) return;
    const iso = birthDate ? parseDate(birthDate) : null;
    if (birthDate && !iso) { setError('Ngày sinh chưa hợp lệ.'); return; }
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (iso && iso > today) { setError('Ngày sinh không thể ở tương lai.'); return; }
    submitting.current = true; setBusy(true); setError('');
    try {
      const success = await store.updatePersonalProfile({ birthDate: iso, gender });
      if (success) setEditing(false);
      else setError('Chưa lưu được thông tin cá nhân. Bạn thử lại nhé.');
    } finally { submitting.current = false; setBusy(false); }
  }
  async function removeAccount() {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      await store.deleteAccount();
      setConfirming(false); onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa xoá được tài khoản. Bạn thử lại nhé.');
    } finally { submitting.current = false; setBusy(false); }
  }
  return <BottomSheet visible={visible} onClose={close} title={confirming ? 'Xoá tài khoản?' : editing ? 'Thông tin cá nhân' : 'Cài đặt'}>
    <ScrollView style={{ maxHeight: 430 }} keyboardShouldPersistTaps="handled">
    <View style={{ gap: 14 }}>
      <Body style={{ color: colors.muted }}>{store.session?.user.email}</Body>
      {editing ? <>
        <Body style={{ color: colors.muted }}>Cập nhật thông tin của bạn để người ấy thấy sinh nhật trên lịch ♡</Body>
        <DateField label="Ngày sinh" value={birthDate} onChange={setBirthDate} optional />
        <Body>Giới tính</Body>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([['male', 'Nam'], ['female', 'Nữ'], ['other', 'Khác']] as const).map(([value, label]) => <Pressable key={value} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: gender === value, disabled: busy }} onPress={() => setGender(value)} style={{ flex: 1, minHeight: 46, borderRadius: 16, borderWidth: 1, borderColor: gender === value ? colors.primary : colors.line, backgroundColor: gender === value ? colors.rose : colors.surface, alignItems: 'center', justifyContent: 'center' }}><Body style={{ color: gender === value ? colors.primary : colors.ink }}>{label}</Body></Pressable>)}
        </View>
        {!!error && <Body accessibilityRole="alert" style={{ color: colors.primary }}>{error}</Body>}
        <PrimaryButton disabled={busy} onPress={() => void saveProfile()}>{busy ? 'Đang lưu…' : 'Lưu thông tin ♡'}</PrimaryButton>
        <SecondaryButton onPress={() => { if (!submitting.current) { setEditing(false); setError(''); } }}>Quay lại</SecondaryButton>
      </> : confirming ? <>
        <Body>Tài khoản của bạn sẽ bị xoá vĩnh viễn. Nếu đã ghép đôi, toàn bộ không gian chung, điều ước, kỷ niệm và ảnh của hai người cũng sẽ bị xoá.</Body>
        <Body style={{ color: colors.muted }}>{store.partnerName === 'người ấy' ? 'Người ấy' : store.partnerName} vẫn giữ tài khoản nhưng sẽ cần tạo hoặc tham gia không gian mới. Thao tác này không thể hoàn tác.</Body>
        {!!error && <Body accessibilityRole="alert" style={{ color: colors.primary }}>{error}</Body>}
        <PrimaryButton disabled={busy} onPress={() => void removeAccount()}>{busy ? 'Đang xoá tài khoản…' : 'Xoá vĩnh viễn'}</PrimaryButton>
        <SecondaryButton onPress={() => { if (!submitting.current) { setConfirming(false); setError(''); } }}>Giữ tài khoản</SecondaryButton>
      </> : <>
        <SecondaryButton onPress={editProfile}>Thông tin cá nhân</SecondaryButton>
        <SecondaryButton onPress={() => { close(); void store.logout(); }}>Đăng xuất</SecondaryButton>
        <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Body style={{ color: colors.primary }}>Xoá tài khoản</Body>
        </Pressable>
      </>}
    </View>
    </ScrollView>
  </BottomSheet>;
}
