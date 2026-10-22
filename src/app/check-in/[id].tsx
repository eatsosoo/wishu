import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, Pencil } from 'lucide-react-native';
import { AppScreen } from '../../components/AppScreen';
import { Body, BottomSheet, EmptyState, Heading, IconButton, PrimaryButton, SecondaryButton } from '../../components/ui';
import { CheckInMap } from '../../components/CheckInMap';
import { useAppTheme } from '../../hooks/use-app-theme';
import { useWishStore } from '../../hooks/use-wish-store';
import { formatDate } from '../../features/wishes/format';

export default function CheckInDetail() {
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const store = useWishStore();
  const { colors } = useAppTheme();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const item = store.checkIns.find(checkIn => checkIn.id === id);
  if (!item) return <AppScreen header={{ title: 'Kỷ niệm check-in', onBack: () => router.dismissTo('/check-in-map') }}><EmptyState title="Chưa thấy kỷ niệm này" description="Mình quay lại bản đồ để xem các nơi đã đến nhé." action="Về bản đồ" onAction={() => router.replace('/check-in-map')} /></AppScreen>;
  const own = item.createdBy === store.actor;
  async function remove() {
    if (busy) return; setBusy(true);
    try { if (await store.deleteCheckIn(id)) router.dismissTo('/check-in-map'); else setError('Chưa xoá được kỷ niệm. Bạn thử lại nhé.'); }
    finally { setBusy(false); }
  }
  return <AppScreen header={{ title: 'Một nơi, hai chúng ta', onBack: () => saved === 'yes' ? router.dismissTo({ pathname: '/check-in-map', params: { focus: id } }) : router.canGoBack() ? router.back() : router.replace('/check-in-map'), right: own ? <IconButton icon={Pencil} label="Sửa check-in" onPress={() => router.push({ pathname: '/check-in/new', params: { edit: id } })} /> : undefined }}>
    <View style={{ gap: 18 }}>
      {saved === 'yes' ? <Body accessibilityRole="alert" style={{ textAlign: 'center', color: colors.primary }}>Đã lưu một dấu chân của hai đứa ♡</Body> : null}
      {'uri' in item.photo ? <Image source={{ uri: item.photo.uri }} contentFit="contain" style={{ width: '100%', aspectRatio: 1, borderRadius: 25, backgroundColor: colors.rose }} accessibilityLabel={`Ảnh check-in tại ${item.title}`} /> : null}
      <View><Heading style={{ fontSize: 26 }}>{item.title}</Heading><Body style={{ color: colors.muted }}>{formatDate(item.visitedAt)}{item.companion ? ` · Cùng ${item.companion}` : ''}</Body></View>
      {item.note ? <View style={{ padding: 20, backgroundColor: colors.surface, borderRadius: 23 }}><Body style={{ lineHeight: 26 }}>{item.note}</Body></View> : null}
      <View style={{ height: 200, borderRadius: 23, overflow: 'hidden' }}><CheckInMap config={{ colors, items: [{ id: item.id, title: item.title, latitude: item.latitude, longitude: item.longitude, uri: 'uri' in item.photo ? item.photo.uri : '' }], focus: { latitude: item.latitude, longitude: item.longitude, key: item.id } }} /></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><MapPin size={13} color={colors.primary} /><Body style={{ fontSize: 12, color: colors.muted }}>{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Body></View>
      <SecondaryButton onPress={() => { void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`).catch(() => setError('Chưa mở được ứng dụng bản đồ.')); }}>Mở chỉ đường</SecondaryButton>
      {error ? <Body accessibilityRole="alert">{error}</Body> : null}
      {own ? <SecondaryButton onPress={() => setConfirm(true)}>Xoá check-in</SecondaryButton> : null}
    </View>
    <BottomSheet visible={confirm} onClose={() => { if (!busy) setConfirm(false); }} title="Xoá kỷ niệm này?">
      <View style={{ gap: 16 }}><Body>Ảnh ghim, vị trí và lời nhắn sẽ được gỡ khỏi bản đồ của hai người.</Body><PrimaryButton onPress={remove} disabled={busy}>{busy ? 'Đang xoá…' : 'Xoá check-in'}</PrimaryButton><SecondaryButton onPress={() => { if (!busy) setConfirm(false); }}>Giữ lại kỷ niệm</SecondaryButton></View>
    </BottomSheet>
  </AppScreen>;
}
