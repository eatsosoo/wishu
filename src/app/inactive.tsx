import { useState } from 'react';
import { AppScreen } from '../components/AppScreen';
import { Body, Heading, SecondaryButton } from '../components/ui';
import { useWishStore } from '../hooks/use-wish-store';

export default function InactiveAccount() {
  const { logout } = useWishStore();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    if (busy) return;
    setBusy(true);
    try { await logout(); } finally { setBusy(false); }
  }
  return <AppScreen contentStyle={{ justifyContent: 'center', gap: 20 }}>
    <Heading>Tài khoản đã vô hiệu hoá</Heading>
    <Body>Thông tin và kỷ niệm của bạn vẫn được giữ lại. Bạn cần liên hệ quản trị viên để kích hoạt lại tài khoản trước khi tiếp tục sử dụng.</Body>
    <SecondaryButton loading={busy} disabled={busy} onPress={() => void signOut()}>Về đăng nhập</SecondaryButton>
  </AppScreen>;
}
