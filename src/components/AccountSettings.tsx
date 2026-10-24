import { PopupMessage } from './PopupMessage';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Body, BottomSheet, DestructiveText, PrimaryButton, SecondaryButton } from './ui';
import { useAppTheme } from '../hooks/use-app-theme';
import { useWishStore } from '../hooks/use-wish-store';
import { DateField } from './DateField';
import { GenderSelector } from './GenderSelector';
import { localDate } from '../features/dates';
import { formatDate, parseDate } from '../features/wishes/format';
import type { Gender } from '../types/domain';
import { completeProfile } from '../features/auth/profile';

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
    const member = store.personalProfile;
    setBirthDate(member?.birthDate ? formatDate(member.birthDate) : '');
    setGender(member?.gender === 'other' ? null : member?.gender ?? null); setError(''); setEditing(true);
  }
  async function saveProfile() {
    if (submitting.current) return;
    if (!birthDate || !gender) { setError('Bạn chọn đủ giới tính và ngày sinh nhé.'); return; }
    const iso = birthDate ? parseDate(birthDate) : null;
    if (birthDate && !iso) { setError('Ngày sinh chưa hợp lệ.'); return; }
    const today = localDate();
    if (iso && iso > today) { setError('Ngày sinh không thể ở tương lai.'); return; }
    if (!completeProfile({ birthDate: iso, gender })) { setError('Ngày sinh chưa hợp lệ.'); return; }
    submitting.current = true; setBusy(true); setError('');
    try {
      const success = await store.saveInitialProfile({ birthDate: iso, gender });
      if (success) setEditing(false);
      else setError('Chưa lưu được thông tin cá nhân. Bạn thử lại nhé.');
    } finally { submitting.current = false; setBusy(false); }
  }
  async function removeAccount() {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      await store.deactivateAccount();
      setConfirming(false); onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa vô hiệu hoá được tài khoản. Bạn thử lại nhé.');
    } finally { submitting.current = false; setBusy(false); }
  }
  return <BottomSheet visible={visible} onClose={close} title={confirming ? 'Vô hiệu hoá tài khoản?' : editing ? 'Thông tin cá nhân' : 'Cài đặt'}>
    <ScrollView style={{ maxHeight: 430 }} keyboardShouldPersistTaps="handled">
    <View style={{ gap: 14 }}>
      <Body style={{ color: colors.muted }}>{store.session?.user.email}</Body>
      {editing ? <>
        <Body style={{ color: colors.muted }}>Cập nhật thông tin của bạn để người ấy thấy sinh nhật trên lịch ♡</Body>
        <DateField label="Ngày sinh" value={birthDate} onChange={setBirthDate} />
        <GenderSelector value={gender} onChange={setGender} disabled={busy} />
        {!!error && <PopupMessage message={error} />}
        <PrimaryButton loading={busy} disabled={busy} onPress={() => void saveProfile()}>{busy ? 'Đang lưu…' : 'Lưu thông tin ♡'}</PrimaryButton>
        <SecondaryButton onPress={() => { if (!submitting.current) { setEditing(false); setError(''); } }}>Quay lại</SecondaryButton>
      </> : confirming ? <>
        <Body>Tài khoản sẽ chuyển sang trạng thái không hoạt động và bạn sẽ được đăng xuất. Thông tin tài khoản, ảnh, điều ước và kỷ niệm vẫn được giữ lại.</Body>
        <Body style={{ color: colors.muted }}>{store.partnerName === 'người ấy' ? 'Người ấy' : store.partnerName} vẫn sử dụng không gian chung bình thường. Tài khoản của bạn cần được quản trị viên kích hoạt lại để tiếp tục sử dụng.</Body>
        {!!error && <PopupMessage message={error} />}
        <PrimaryButton destructive loading={busy} disabled={busy} onPress={() => void removeAccount()}>{busy ? 'Đang vô hiệu hoá…' : 'Vô hiệu hoá tài khoản'}</PrimaryButton>
        <SecondaryButton onPress={() => { if (!submitting.current) { setConfirming(false); setError(''); } }}>Giữ tài khoản</SecondaryButton>
      </> : <>
        <View style={{ gap: 4 }}>
          <Body>Gói {store.plan === 'premium' ? 'Premium' : 'Normal'}</Body>
          <Body style={{ color: colors.muted, fontSize: 12 }}>{store.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</Body>
        </View>
        <SecondaryButton onPress={editProfile}>Thông tin cá nhân</SecondaryButton>
        <SecondaryButton onPress={() => { close(); void store.logout(); }}>Đăng xuất</SecondaryButton>
        <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <DestructiveText>Vô hiệu hoá tài khoản</DestructiveText>
        </Pressable>
      </>}
    </View>
    </ScrollView>
  </BottomSheet>;
}
