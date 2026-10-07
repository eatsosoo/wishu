import { useAppTheme } from '../hooks/use-app-theme';
import { useState } from 'react';
import { View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { ClayObject } from '../components/Artwork';
import { Body, Heading, PrimaryButton, SecondaryButton } from '../components/ui';
import { useWishStore } from '../hooks/use-wish-store';
import type { PersonId } from '../types/domain';

export default function Login() {
  const { colors } = useAppTheme();

  const store = useWishStore();
  const [busy, setBusy] = useState(false);
  async function signIn(person: PersonId) { setBusy(true); await store.login(person); setBusy(false); }
  return <AppScreen contentStyle={{ justifyContent: 'center', gap: 24, paddingVertical: 40 }}>
    <Body style={{ textAlign: 'center', color: colors.primary, letterSpacing: 3 }}>OUR WISH ♡</Body>
    <ClayObject name="couple" width={300} style={{ alignSelf: 'center' }} />
    <View style={{ gap: 10 }}><Heading style={{ textAlign: 'center', fontSize: 30 }}>Chào bạn trở lại</Heading><Body style={{ textAlign: 'center', color: colors.muted }}>Những điều ước nhỏ đang chờ hai đứa.</Body></View>
    <View style={{ gap: 12 }}><PrimaryButton disabled={busy} onPress={() => void signIn('minh')}>Đăng nhập demo — Minh</PrimaryButton><SecondaryButton onPress={() => { if (!busy) void signIn('linh'); }}>Đăng nhập demo — Linh</SecondaryButton></View>
    <Body style={{ textAlign: 'center', fontSize: 12, color: colors.muted }}>Bản xem trước dùng hai hồ sơ mẫu.{ '\n' }Tài khoản thật sẽ được kết nối với Supabase.</Body>
    {!!store.storageError && <Body accessibilityRole="alert" style={{ color: colors.primary }}>{store.storageError}</Body>}
  </AppScreen>;
}
