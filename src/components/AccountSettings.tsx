import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Body, BottomSheet, PrimaryButton, SecondaryButton } from './ui';
import { useAppTheme } from '../hooks/use-app-theme';
import { useWishStore } from '../hooks/use-wish-store';

export function AccountSettings({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const store = useWishStore();
  const { colors } = useAppTheme();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  function close() {
    if (submitting.current) return;
    setConfirming(false); setError(''); onClose();
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
  return <BottomSheet visible={visible} onClose={close} title={confirming ? 'Xoá tài khoản?' : 'Cài đặt'}>
    <View style={{ gap: 14 }}>
      <Body style={{ color: colors.muted }}>{store.session?.user.email}</Body>
      {confirming ? <>
        <Body>Tài khoản của bạn sẽ bị xoá vĩnh viễn. Nếu đã ghép đôi, toàn bộ không gian chung, điều ước, kỷ niệm và ảnh của hai người cũng sẽ bị xoá.</Body>
        <Body style={{ color: colors.muted }}>Người ấy vẫn giữ tài khoản nhưng sẽ cần tạo hoặc tham gia không gian mới. Thao tác này không thể hoàn tác.</Body>
        {!!error && <Body accessibilityRole="alert" style={{ color: colors.primary }}>{error}</Body>}
        <PrimaryButton disabled={busy} onPress={() => void removeAccount()}>{busy ? 'Đang xoá tài khoản…' : 'Xoá vĩnh viễn'}</PrimaryButton>
        <SecondaryButton onPress={() => { if (!submitting.current) { setConfirming(false); setError(''); } }}>Giữ tài khoản</SecondaryButton>
      </> : <>
        <SecondaryButton onPress={() => { close(); void store.logout(); }}>Đăng xuất</SecondaryButton>
        <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Body style={{ color: colors.primary }}>Xoá tài khoản</Body>
        </Pressable>
      </>}
    </View>
  </BottomSheet>;
}
