import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { AppScreen } from '../components/AppScreen';
import { Body, IconButton } from '../components/ui';
import { PrivateCheckInMap } from '../components/PrivateCheckInMap';
import { useAppTheme } from '../hooks/use-app-theme';
import { useWishStore } from '../hooks/use-wish-store';
import type { MapViewport } from '../features/check-in/map-types';

export default function CheckInMapScreen() {
  // Release the viewed area with the screen/session instead of sharing a module
  // variable that could reveal the previous account's map center after logout.
  const [viewport, setViewport] = useState<MapViewport>();
  const { colors } = useAppTheme();
  const { checkIns } = useWishStore();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const target = checkIns.find(item => item.id === focus);
  const config = useMemo(() => ({ colors, viewport, items: checkIns.map(item => ({ id: item.id, title: item.title, latitude: item.latitude, longitude: item.longitude, uri: 'uri' in item.photo ? item.photo.uri : '' })), focus: target ? { latitude: target.latitude, longitude: target.longitude, key: target.id } : undefined }), [colors, checkIns, target, viewport]);
  return <AppScreen contentStyle={{ flex: 1, paddingHorizontal: 16 }} header={{ title: 'Bản đồ kỷ niệm', right: <IconButton icon={Plus} label="Thêm check-in" filled onPress={() => router.push('/check-in/new')} /> }}>
    <Body style={{ textAlign: 'center', color: colors.muted, marginBottom: 16 }}>{checkIns.length ? `${checkIns.length} nơi đã đến · những dấu chân của hai đứa` : 'Cùng nhau đi, cùng nhau giữ lại ♡'}</Body>
    <View style={{ flex: 1, minHeight: 340, borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
      <PrivateCheckInMap photos={Object.fromEntries(checkIns.map(item => [item.id, item.photo]))} config={config} onOpen={id => router.push({ pathname: '/check-in/[id]', params: { id } })} onMove={setViewport} />
    </View>
    <View style={{ gap: 12, paddingTop: 16 }}>
      <Body style={{ textAlign: 'center', color: colors.muted, fontSize: 12 }}>{checkIns.length ? 'Chạm ảnh để mở kỷ niệm · chạm cụm số để phóng to' : 'Thêm một tấm ảnh và ghim nơi hai đứa đã đến.'}</Body>
    </View>
  </AppScreen>;
}
