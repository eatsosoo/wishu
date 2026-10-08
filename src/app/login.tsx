import { useAppTheme } from '../hooks/use-app-theme';
import { useState } from 'react';
import { View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { ClayObject } from '../components/Artwork';
import { AppInput, Body, Heading, PrimaryButton, SecondaryButton } from '../components/ui';
import { supabase } from '../services/cloud';
import { useWishStore } from '../hooks/use-wish-store';

export default function Login() {
  const { colors } = useAppTheme();

  const store = useWishStore();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  async function authenticate(signup: boolean) {
    if (busy) return;
    if (!supabase) { setMessage('Chưa cấu hình kết nối Supabase.'); return; }
    setBusy(true); setMessage('');
    try {
      const credentials = { email: email.trim(), password };
      const result = signup ? await supabase.auth.signUp(credentials) : await supabase.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      if (!result.data.session) setMessage('Mở email xác nhận tài khoản, rồi quay lại đăng nhập nhé.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Chưa đăng nhập được.'); }
    finally { setBusy(false); }
  }
  return <AppScreen contentStyle={{ justifyContent: 'center', gap: 24, paddingVertical: 40 }}>
    <Body style={{ textAlign: 'center', color: colors.primary, letterSpacing: 3 }}>OUR WISH ♡</Body>
    <ClayObject name="couple" width={300} style={{ alignSelf: 'center' }} />
    <View style={{ gap: 10 }}><Heading style={{ textAlign: 'center', fontSize: 30 }}>Chào bạn trở lại</Heading><Body style={{ textAlign: 'center', color: colors.muted }}>Những điều ước nhỏ đang chờ hai đứa.</Body></View>
    <View style={{ gap: 12 }}>
      <AppInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <AppInput label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <PrimaryButton disabled={busy || !store.cloudEnabled || !email.trim() || password.length < 6} onPress={() => void authenticate(false)}>{busy ? 'Đang kết nối…' : 'Đăng nhập ♡'}</PrimaryButton>
      <SecondaryButton onPress={() => { if (!busy && store.cloudEnabled) void authenticate(true); }}>Tạo tài khoản</SecondaryButton>
      {message ? <Body accessibilityRole="alert" style={{ color: colors.primary }}>{message}</Body> : null}
    </View>
    {!!store.storageError && <Body accessibilityRole="alert" style={{ color: colors.primary }}>{store.storageError}</Body>}
  </AppScreen>;
}
