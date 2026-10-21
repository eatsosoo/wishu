import { PopupMessage } from './PopupMessage';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Body, SecondaryButton } from './ui';
import { useAppTheme } from '../hooks/use-app-theme';
import { registerPush, unregisterPush, webPushUnavailableReason } from '../services/push.web';
import { supabase } from '../services/cloud';

export function WebPushControls() {
  const { colors } = useAppTheme();
  const [reason, setReason] = useState<string | null>('Đang kiểm tra trình duyệt…');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    function inspect() {
      const unavailable = webPushUnavailableReason();
      setReason(unavailable);
      if (unavailable) return;
      void navigator.serviceWorker.getRegistration('/').then(async registration => {
        const subscription = await registration?.pushManager.getSubscription();
        const result = subscription && supabase ? await supabase.rpc('web_push_enabled', { p_endpoint: subscription.endpoint }) : null;
        if (active) setEnabled(Notification.permission === 'granted' && result?.data === true);
      }).catch(() => {});
    }
    inspect();
    window.addEventListener('focus', inspect);
    return () => { active = false; window.removeEventListener('focus', inspect); };
  }, []);
  async function toggle() {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      if (enabled) await unregisterPush();
      else await registerPush();
      setEnabled(!enabled);
      setMessage(enabled ? 'Đã tắt thông báo trên trình duyệt này.' : 'Đã bật thông báo. Bạn có thể nhận quà khi không mở trang ♡');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Chưa cập nhật được thông báo.'); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 8, marginBottom: 20 }}>
    {reason ? <Body style={{ color: colors.muted }}>{reason}</Body> : <SecondaryButton onPress={() => void toggle()}>{busy ? 'Đang cập nhật…' : enabled ? 'Tắt thông báo trên trình duyệt này' : 'Bật thông báo trên trình duyệt này'}</SecondaryButton>}
    {message ? <PopupMessage message={message} /> : null}
  </View>;
}
