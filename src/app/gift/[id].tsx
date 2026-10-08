import { useEffect, useEffectEvent, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, AppScreen } from '../../components/AppScreen';
import { GiftReveal } from '../../components/GiftReveal';
import { EmptyState, Heading, LoadingState, PrimaryButton } from '../../components/ui';
import { useWishStore } from '../../hooks/use-wish-store';
import { useAppTheme } from '../../hooks/use-app-theme';

export default function GiftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useWishStore();
  const { refresh, markGiftRead } = store;
  const { colors } = useAppTheme();
  const gift = store.notifications.find(item => item.id === id);
  const giftId = gift?.id;
  const readAt = gift?.readAt;
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const markRead = useEffectEvent((giftId: string) => { void markGiftRead(giftId); });
  useEffect(() => {
    let active = true;
    void refresh().finally(() => { if (active) setLoadedId(id); });
    return () => { active = false; };
  }, [id, refresh]);
  useEffect(() => {
    if (giftId && !readAt) markRead(giftId);
  }, [giftId, readAt]);
  if (!gift) return loadedId !== id ? <LoadingState /> : <AppScreen><AppHeader back /><EmptyState title="Chưa tìm thấy hộp quà" description="Hộp quà chỉ dành cho tài khoản người nhận. Bạn có thể làm mới hộp thư để thử lại." action="Về thông báo" onAction={() => router.replace('/notifications')} /></AppScreen>;
  const sender = store.couple.members.find(member => member.id === gift.sender)?.name ?? 'Người ấy';
  const memory = store.memories.find(item => item.id === gift.memoryId);
  return <AppScreen contentStyle={{ paddingHorizontal: 22 }}>
    <AppHeader back title={`Quà từ ${sender} ♡`} />
    <GiftReveal key={gift.id} />
    <View style={{ padding: 16, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginTop: 4 }}>
      <Heading style={{ textAlign: 'center', fontSize: 21 }}>{gift.title}</Heading>
    </View>
    <View style={{ marginTop: 18 }}><PrimaryButton onPress={() => memory ? router.push({ pathname: '/memory/[id]', params: { id: memory.id } }) : router.replace('/memories')}>Xem kỷ niệm ♡</PrimaryButton></View>
  </AppScreen>;
}
