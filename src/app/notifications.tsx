import { PopupMessage } from '../components/PopupMessage';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewInstance } from 'react-native';
import { Bell, Gift, MapPin, ChevronRight, RefreshCw, Sparkles } from 'lucide-react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { AppNotification } from '../types/domain';
import { router } from 'expo-router';
import { AppScreen } from '../components/AppScreen';
import { Body, Heading, IconButton, SecondaryButton } from '../components/ui';
import { useWishStore } from '../hooks/use-wish-store';
import { useAppTheme } from '../hooks/use-app-theme';
import { registerPush, scheduleTestNotification } from '../services/push';
import { WebPushControls } from '../components/WebPushControls';
import { prefetchRevealArtwork } from '../components/reveal-artwork';

export default function NotificationsScreen() {
  const store = useWishStore();
  const { colors, id } = useAppTheme();
  const glassTarget = useRef<ViewInstance | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const notifications = [...store.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = notifications.filter(item => !item.readAt).length;
  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try { await store.refresh(); } finally { setRefreshing(false); }
  }
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testing, setTesting] = useState(false);
  useEffect(() => { void prefetchRevealArtwork('gift'); }, []);
  async function testNotification() {
    if (testing) return;
    setTesting(true);
    setTestMessage('');
    try {
      await scheduleTestNotification(store.partnerName);
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
  return <AppScreen header={{ title: 'Thông báo', right: <IconButton icon={RefreshCw} label={refreshing ? 'Đang làm mới thông báo' : 'Làm mới thông báo'} onPress={() => void refresh()} /> }}>
    <View style={{ flex: 1, gap: 20, paddingBottom: 12 }}>
      <BlurTargetView ref={glassTarget} pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ position: 'absolute', top: 20, right: -30, width: 220, height: 220, borderRadius: 110, backgroundColor: colors.rose, opacity: 0.8 }} />
        <View style={{ position: 'absolute', top: 240, left: -70, width: 200, height: 200, borderRadius: 100, backgroundColor: colors.lavender, opacity: 0.65 }} />
      </BlurTargetView>
      <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 8, gap: 9 }}>
        <View style={{ width: 64, height: 64, borderRadius: 24, backgroundColor: id === 'monochrome' ? colors.surface : 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: id === 'monochrome' ? colors.line : 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', marginBottom: 3 }}><Bell size={27} strokeWidth={1.5} color={colors.primary} /><View style={{ position: 'absolute', right: 8, top: 8 }}><Sparkles size={13} color={colors.primary} /></View></View>
        <Heading style={{ fontSize: 27 }}>Lời thương ghé đến</Heading>
        <Body style={{ color: colors.muted, textAlign: 'center', maxWidth: 280 }}>Những bất ngờ nho nhỏ {store.partnerName} dành riêng cho bạn.</Body>
        {unread > 0 && <View style={{ paddingHorizontal: 13, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.rose }}><Body style={{ color: colors.primary, fontSize: 12 }}>{unread} thông báo chưa đọc ♡</Body></View>}
      </View>
      {notifications.length === 0 ? <View style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: id === 'monochrome' ? colors.line : 'rgba(255,255,255,0.85)', backgroundColor: id === 'monochrome' ? colors.surface : 'rgba(255,255,255,0.28)', padding: 26, alignItems: 'center', gap: 12 }}>
        <BlurView pointerEvents="none" blurTarget={glassTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={24} tint={id === 'monochrome' ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'} style={StyleSheet.absoluteFill} />
        <View><Gift size={34} strokeWidth={1.3} color={colors.primary} /></View>
        <Heading style={{ fontSize: 22, textAlign: 'center' }}>Bất ngờ đang trên đường đến</Heading>
        <Body style={{ color: colors.muted, textAlign: 'center' }}>Khi {store.partnerName} hoàn thành điều ước hoặc thêm check-in, bạn sẽ nhận được thông báo ở đây.</Body>
      </View> : <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}><Body style={{ fontSize: 13, color: colors.burgundy }}>Hộp thư của hai đứa</Body><Body style={{ fontSize: 12, color: colors.muted }}>{notifications.length} lời thương</Body></View>
        {notifications.map(gift => <NotificationCard key={gift.id} gift={gift} sender={store.couple.members.find(member => member.id === gift.sender)?.name.trim() || store.partnerName} blurTarget={glassTarget} />)}
      </View>}
      <View style={{ gap: 12 }}>
    {store.cloudEnabled ? <WebPushControls /> : null}
    {__DEV__ && Platform.OS !== 'web' ? <View style={{ gap: 8, marginBottom: 20 }}>
      <SecondaryButton loading={testing} onPress={() => void testNotification()}>{testing ? 'Đang hẹn…' : `Thử nhận quà từ ${store.partnerName} 🎁`}</SecondaryButton>
      <SecondaryButton onPress={() => router.push({ pathname: '/gift/[id]', params: { id: 'test-preview', preview: '1' } })}>Xem thử hiệu ứng hộp quà</SecondaryButton>
      {testMessage ? <PopupMessage message={testMessage} /> : null}
    </View> : null}
    {store.cloudEnabled && Platform.OS !== 'web' ? <View style={{ gap: 8, marginBottom: 20 }}><SecondaryButton loading={busy} onPress={() => void enable()}>{busy ? 'Đang bật…' : 'Bật thông báo trên điện thoại'}</SecondaryButton>{message ? <PopupMessage message={message} /> : null}</View> : null}
      </View>
      <Body style={{ textAlign: 'center', fontSize: 12, color: colors.muted }}>Một điều ước được nhớ đến, một niềm vui được gửi đi ♡</Body>
    </View>
  </AppScreen>;
}

function NotificationCard({ gift, sender, blurTarget }: { gift: AppNotification; sender: string; blurTarget: RefObject<ViewInstance | null> }) {
  const { colors, id } = useAppTheme();
  const checkIn = gift.kind === 'checkIn';
  const Icon = checkIn ? MapPin : Gift;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${gift.readAt ? 'Đã đọc' : 'Chưa đọc'}. ${sender} ${checkIn ? 'vừa thêm check-in' : 'đã hoàn thành'} ${gift.title}. ${checkIn ? 'Xem trên bản đồ' : 'Mở hộp quà'}`} onPress={() => checkIn ? router.push({ pathname: '/check-in-map', params: { focus: gift.checkInId } }) : router.push({ pathname: '/gift/[id]', params: { id: gift.id } })} style={({ pressed }) => ({ borderRadius: 26, backgroundColor: id === 'monochrome' ? colors.surface : 'rgba(255,255,255,0.24)', borderWidth: 1, borderColor: id === 'monochrome' ? colors.line : 'rgba(255,255,255,0.85)', boxShadow: '0px 5px 18px rgba(112,65,73,0.06)', opacity: pressed ? 0.78 : 1 })}>
    <View style={{ borderRadius: 25, overflow: 'hidden' }}>
      <BlurView pointerEvents="none" blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={30} tint={id === 'monochrome' ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'} style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={id === 'monochrome' ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.58)', 'rgba(255,255,255,0.14)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ padding: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 13 }}>
        <View style={{ width: 46, height: 46, borderRadius: 17, backgroundColor: gift.readAt ? (id === 'monochrome' ? colors.surface : 'rgba(255,255,255,0.55)') : colors.rose, borderWidth: 1, borderColor: id === 'monochrome' ? colors.line : 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' }}><Icon size={22} strokeWidth={1.6} color={colors.primary} /></View>
        <View style={{ flex: 1, gap: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Body style={{ flex: 1, fontSize: 12, color: colors.muted }}>Từ {sender}</Body>{!gift.readAt && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary }} />}</View>
          <Body style={{ fontWeight: '600', color: colors.burgundy }}>{sender} {checkIn ? 'vừa thêm một check-in' : 'đã hoàn thành một điều ước'}</Body>
          <Body numberOfLines={2} style={{ color: colors.primary, fontSize: 16, lineHeight: 24 }}>{gift.title}</Body>
          <Body style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{new Date(gift.createdAt).toLocaleDateString('vi-VN')}</Body>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}><Body style={{ fontSize: 12, color: colors.primary }}>{checkIn ? 'Xem trên bản đồ' : gift.readAt ? 'Mở lại món quà' : 'Mở món quà của bạn'}</Body><ChevronRight size={13} color={colors.primary} /></View>
        </View>
      </View>
    </View>
  </Pressable>;
}
