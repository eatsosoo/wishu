import { usePopup } from '../components/PopupMessage';
import { useAppTheme } from '../hooks/use-app-theme';
import { useState } from 'react';
import { View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { ClayObject } from '../components/Artwork';
import { AppInput, Body, Heading, PrimaryButton, SecondaryButton } from '../components/ui';
import { supabase } from '../services/cloud';
import { useWishStore } from '../hooks/use-wish-store';
import { authErrorMessage, validateCredentials } from '../features/auth/messages';

export default function Login() {
  const { colors } = useAppTheme();

  const store = useWishStore();
  const [authAction, setAuthAction] = useState<'login' | 'signup' | null>(null);
  const busy = authAction !== null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setMessage = usePopup();
  async function authenticate(signup: boolean) {
    if (busy) return;
    const validation = validateCredentials(email, password, signup);
    if (validation) { setMessage(validation); return; }
    if (!supabase) { setMessage('Chưa cấu hình kết nối Supabase.'); return; }
    setAuthAction(signup ? 'signup' : 'login'); setMessage('');
    try {
      const credentials = { email: email.trim(), password };
      const result = signup ? await supabase.auth.signUp(credentials) : await supabase.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      if (!result.data.session) setMessage('Mở email xác nhận tài khoản, rồi quay lại đăng nhập nhé.');
    } catch (error) { setMessage(authErrorMessage(error)); }
    finally { setAuthAction(null); }
  }
  return <AppScreen contentStyle={{ justifyContent: 'center', gap: 24, paddingVertical: 40 }}>
    <Body style={{ textAlign: 'center', color: colors.primary, letterSpacing: 3 }}>OUR WISH ♡</Body>
    <ClayObject name="couple" width={300} style={{ alignSelf: 'center' }} />
    <View style={{ gap: 10 }}><Heading style={{ textAlign: 'center', fontSize: 30 }}>Chào bạn trở lại</Heading><Body style={{ textAlign: 'center', color: colors.muted }}>Những điều ước nhỏ đang chờ hai đứa.</Body></View>
    <View style={{ gap: 12 }}>
      <AppInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={254} />
      <AppInput label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" maxLength={1024} />
      <PrimaryButton loading={authAction === 'login'} disabled={busy || !store.cloudEnabled} onPress={() => void authenticate(false)}>{authAction === 'login' ? 'Đang kết nối…' : 'Đăng nhập ♡'}</PrimaryButton>
      <SecondaryButton loading={authAction === 'signup'} disabled={busy || !store.cloudEnabled} onPress={() => void authenticate(true)}>Tạo tài khoản</SecondaryButton>
    </View>

  </AppScreen>;
}
