import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Gift, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { AppHeader, AppScreen } from '../components/AppScreen';
import { Body, EmptyState, Heading, SecondaryButton } from '../components/ui';
import { useWishStore } from '../hooks/use-wish-store';
import { useAppTheme } from '../hooks/use-app-theme';
import { registerPush, scheduleTestNotification } from '../services/push';

export default function NotificationsScreen() {
  const store = useWishStore();
  const { colors } = useAppTheme();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testing, setTesting] = useState(false);
  async function testNotification() {
    if (testing) return;
    setTesting(true);
    setTestMessage('');
    try {
      await scheduleTestNotification();
      setTestMessage('Sau 5 giây sẽ có thông báo quà mô phỏng trên điện thoại này. Đưa app xuống nền rồi chạm thông báo để mở hộp quà.');
    } catch (error) {
      setTestMessage(error instanceof Error ? error.message : 'Chưa gửi được thông báo thử.');
    } finally { setTesting(false); }
  }
  async function enable() {
    if (busy) return;
    setBusy(true);
    try { await registerPush(); setMessage('Đã bật thông báo trên điện thoại này ♡'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Chưa bật được thông báo.'); }
    finally { setBusy(false); }
  }
  return <AppScreen>
    <AppHeader back title="Thông báo" />
    <Heading>Một chút bất ngờ ♡</Heading>
    <Body style={{ color: colors.muted, marginTop: 8, marginBottom: 24 }}>Những điều người ấy đã dành riêng cho bạn.</Body>
    {__DEV__ && Platform.OS !== 'web' ? <View style={{ gap: 8, marginBottom: 20 }}>
      <SecondaryButton onPress={() => void testNotification()}>{testing ? 'Đang hẹn…' : 'Thử nhận quà từ người ấy 🎁'}</SecondaryButton>
      <SecondaryButton onPress={() => router.push({ pathname: '/gift/[id]', params: { id: 'test-preview', preview: '1' } })}>Xem thử hiệu ứng hộp quà</SecondaryButton>
      {testMessage ? <Body accessibilityRole="alert" style={{ color: colors.primary }}>{testMessage}</Body> : null}
    </View> : null}
    {store.cloudEnabled && Platform.OS !== 'web' ? <View style={{ gap: 8, marginBottom: 20 }}><SecondaryButton onPress={() => void enable()}>{busy ? 'Đang bật…' : 'Bật thông báo trên điện thoại'}</SecondaryButton>{message ? <Body accessibilityRole="alert" style={{ color: colors.primary }}>{message}</Body> : null}</View> : null}
    {store.notifications.length === 0 ? <EmptyState title="Bất ngờ đang trên đường đến" description="Khi người ấy hoàn thành một điều ước của bạn, thông báo và hộp quà sẽ xuất hiện ở đây." /> : store.notifications.map(gift => {
      const sender = store.couple.members.find(member => member.id === gift.sender)?.name ?? 'Người ấy';
      return <Pressable key={gift.id} accessibilityRole="button" accessibilityLabel={`${gift.readAt ? 'Đã đọc' : 'Chưa đọc'}. ${sender} đã hoàn thành ${gift.title}. Mở hộp quà`} onPress={() => router.push({ pathname: '/gift/[id]', params: { id: gift.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 17, borderRadius: 23, backgroundColor: gift.readAt ? colors.surface : colors.rose, marginBottom: 12, borderWidth: 1, borderColor: colors.line }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><Gift color={colors.primary} size={23} /></View>
        <View style={{ flex: 1, gap: 5 }}><Body style={{ fontWeight: '600' }}>{sender} đã biến điều ước thành hiện thực 🎁</Body><Body numberOfLines={2} style={{ color: colors.primary }}>{gift.title}</Body><Body style={{ fontSize: 11, color: colors.muted }}>{new Date(gift.createdAt).toLocaleDateString('vi-VN')} · Chạm để mở quà</Body></View>
        {!gift.readAt ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary }} /> : <ChevronRight size={17} color={colors.muted} />}
      </Pressable>;
    })}
    {store.storageError ? <Body accessibilityRole="alert" style={{ color: colors.primary }}>{store.storageError}</Body> : null}
    <SecondaryButton onPress={() => void store.refresh()}>Làm mới thông báo</SecondaryButton>
  </AppScreen>;
}
