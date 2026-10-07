import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Plus, Gift, ChevronDown } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppScreen } from '../components/AppScreen';
import { Body, BottomSheet, EmptyState, FilterChips, Heading, IconButton } from '../components/ui';
import { WishCard } from '../components/Cards';
import { ClayObject } from '../components/Artwork';
import { useWishStore } from '../hooks/use-wish-store';
import { colors } from '../constants/theme';
import type { CategoryFilter, PersonId } from '../types/domain';

export default function WishesScreen() {
  const { owner: requestedOwner } = useLocalSearchParams<{ owner?: string }>();
  const store = useWishStore();
  const owner: PersonId = requestedOwner === 'minh' ? 'minh' : 'linh';
  const [filter, setFilter] = useState<CategoryFilter>('Tất cả');
  const [chooseJar, setChooseJar] = useState(false);
  const name = store.couple.members.find(member => member.id === owner)!.name;
  const wishes = store.wishes.filter(wish => wish.createdBy === owner && (filter === 'Tất cả' || wish.category === filter));
  return <AppScreen navigation contentStyle={{ paddingHorizontal: 17 }}>
    <View className="flex-row items-start justify-between" style={{ marginBottom: 17, paddingHorizontal: 6 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Chọn hũ điều ước" onPress={() => setChooseJar(true)} style={{ paddingTop: 13, flex: 1 }}><Heading style={{ color: '#261D24', fontSize: 28 }}>Hũ điều ước{ '\n' }của {name} ♡</Heading><ChevronDown size={13} color={colors.muted} style={{ marginTop: 3 }} /></Pressable>
      <ClayObject name="jar" width={94} height={101} />
      <IconButton icon={Plus} filled label="Thêm điều ước mới" onPress={() => router.push('/wish/new')} />
    </View>
    <View style={{ marginHorizontal: 5, marginBottom: 15 }}><FilterChips value={filter} onChange={setFilter} /></View>
    {wishes.map(wish => <WishCard key={wish.id} wish={wish} onFavorite={() => store.toggleWishFavorite(wish.id)} />)}
    {!wishes.length && <EmptyState title="Hũ đang chờ một điều ước" description="Những điều nhỏ cũng đáng được mong chờ." action="Thêm vào hũ ✨" onAction={() => router.push('/wish/new')} />}
    <Pressable accessibilityRole="button" onPress={() => router.push('/preparing')} style={{ flexDirection: 'row', gap: 9, justifyContent: 'center', paddingVertical: 16 }}><Gift size={18} color={colors.primary} /><Body style={{ color: colors.primary }}>Những điều mình đang chuẩn bị</Body></Pressable>
    <BottomSheet visible={chooseJar} onClose={() => setChooseJar(false)} title="Hai hũ điều ước">{store.couple.members.map(member => <Pressable key={member.id} accessibilityRole="button" onPress={() => { router.setParams({ owner: member.id }); setFilter('Tất cả'); setChooseJar(false); }} style={{ paddingVertical: 16 }}><Body style={{ color: member.id === owner ? colors.primary : colors.ink }}>Hũ của {member.name} ♡ · {store.wishes.filter(wish => wish.createdBy === member.id).length} điều ước</Body></Pressable>)}</BottomSheet>
  </AppScreen>;
}
