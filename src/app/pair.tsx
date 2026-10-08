import { useState } from 'react';
import { View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { AccountSettings } from '../components/AccountSettings';
import { AppInput, Body, Heading, PrimaryButton, SecondaryButton } from '../components/ui';
import { useAppTheme } from '../hooks/use-app-theme';
import { useWishStore } from '../hooks/use-wish-store';
import { supabase } from '../services/cloud';

export default function PairScreen() {
  const store = useWishStore();
  const { colors } = useAppTheme();
  const [name, setName] = useState('');
  const [space, setSpace] = useState('Không gian của hai đứa');
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const validCode = /^[A-Z0-9]{5}$/.test(code.trim());
  async function pair() {
    if (!supabase || busy || !name.trim() || (joining && !validCode)) return;
    setBusy(true); setError('');
    try {
      const result = joining
        ? await supabase.rpc('join_couple', { p_code: code.trim(), p_name: name.trim() })
        : await supabase.rpc('create_couple', { p_name: name.trim(), p_space_name: space.trim() });
      if (result.error) throw result.error;
      await store.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa ghép đôi được.'); }
    finally { setBusy(false); }
  }
  return <AppScreen contentStyle={{ justifyContent: 'center', gap: 20 }}>
    <Heading style={{ textAlign: 'center' }}>Một nơi cho hai đứa ♡</Heading>
    <Body style={{ textAlign: 'center', color: colors.muted }}>Tạo không gian và gửi mã mời cho người ấy,{ '\n' }hoặc nhập mã bạn nhận được.</Body>
    <AppInput label="Tên của bạn" value={name} onChangeText={setName} maxLength={40} />
    {joining ? <AppInput label="Mã mời từ người ấy (5 ký tự chữ và số)" value={code} onChangeText={value => setCode(value.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={5} /> : <AppInput label="Tên không gian" value={space} onChangeText={setSpace} maxLength={60} />}
    {error ? <Body accessibilityRole="alert" style={{ color: colors.primary }}>{error}</Body> : null}
    <PrimaryButton disabled={busy || !name.trim() || (joining ? !validCode : !space.trim())} onPress={() => void pair()}>{busy ? 'Đang kết nối…' : joining ? 'Ghép đôi ♡' : 'Tạo không gian ♡'}</PrimaryButton>
    <SecondaryButton onPress={() => { if (!busy) { setJoining(value => !value); setError(''); } }}>{joining ? 'Mình muốn tạo không gian mới' : 'Mình đã có mã mời'}</SecondaryButton>
    <View><SecondaryButton onPress={() => { if (!busy) setSettingsVisible(true); }}>Cài đặt tài khoản</SecondaryButton></View>
    <AccountSettings visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
  </AppScreen>;
}
