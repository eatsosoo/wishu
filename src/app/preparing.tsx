import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { AppScreen } from '../components/AppScreen';
import { ClayObject } from '../components/Artwork';
import { Body, EmptyState, Heading, IconButton } from '../components/ui';
import { MemoryCard, WishCard } from '../components/Cards';
import { colors } from '../constants/theme';
import { useWishStore } from '../hooks/use-wish-store';

export default function Preparing() {
  const store = useWishStore();
  const [tab, setTab] = useState<'preparing' | 'completed'>('preparing');
  const preparing = store.preparations.filter(item => item.status === 'preparing');
  return <AppScreen contentStyle={{ paddingHorizontal: 20 }}>
    <View><ClayObject name="gift" width={260} height={153} style={{ alignSelf: 'center' }} /><View style={{ position: 'absolute', top: 0, left: 0 }}><IconButton icon={ChevronLeft} label="Quay lại" onPress={() => router.canGoBack() ? router.back() : router.replace('/wishes')} /></View></View>
    <Heading style={{ textAlign: 'center', marginTop: 18 }}>Đang chuẩn bị</Heading><Body style={{ textAlign: 'center', color: '#915365', marginTop: 8 }}>Những điều bất ngờ đang được{ '\n' }chuẩn bị cho người ấy ♡</Body>
    <View style={{ flexDirection: 'row', marginTop: 25, marginBottom: 17, backgroundColor: '#F0DCDA', borderRadius: 999, padding: 2 }}>
      {([['preparing', `Đang chuẩn bị (${preparing.length})`], ['completed', `Đã hoàn thành (${store.memories.length})`]] as const).map(([value, title]) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={{ flex: 1, borderRadius: 999, paddingVertical: 11, alignItems: 'center', backgroundColor: tab === value ? colors.primary : 'transparent' }}><Body style={{ fontSize: 13, color: tab === value ? '#fff' : '#9B6371' }}>{title}</Body></Pressable>)}
    </View>
    {tab === 'preparing' ? preparing.map(preparation => {
      const wish = store.wishes.find(item => item.id === preparation.wishId);
      return wish ? <WishCard key={preparation.id} wish={wish} preparation={preparation} /> : null;
    }) : <View className="flex-row flex-wrap justify-between">{store.memories.map(memory => <MemoryCard key={memory.id} memory={memory} onFavorite={() => store.toggleMemoryFavorite(memory.id)} />)}</View>}
    {tab === 'preparing' && !preparing.length && <EmptyState title="Một bất ngờ đang chờ bạn" description="Ghé hũ của người ấy, chọn một điều ước để chuẩn bị nhé." action="Mở hũ của người ấy" onAction={() => router.push({ pathname: '/wishes', params: { owner: store.actor === 'minh' ? 'linh' : 'minh' } })} />}
  </AppScreen>;
}
