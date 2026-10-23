import { useAppTheme } from '../hooks/use-app-theme';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Gift, SlidersHorizontal, Check } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppScreen, ScreenTitle } from '../components/AppScreen';
import { Body, BottomSheet, EmptyState } from '../components/ui';
import { JarPairIcon } from '../components/JarPairIcon';
import { WishJarTitleIcon } from '../components/WishJarTitleIcon';
import { WishCard } from '../components/Cards';
import { useWishStore } from '../hooks/use-wish-store';
import { categories, type CategoryFilter, type PersonId } from '../types/domain';

export default function WishesScreen() {
  const { colors, t } = useAppTheme();

  const { owner: requestedOwner } = useLocalSearchParams<{ owner?: string }>();
  const store = useWishStore();
  const owner: PersonId = requestedOwner === 'minh' ? 'minh' : 'linh';
  const [filter, setFilter] = useState<CategoryFilter>('Tất cả');
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');
  const [chooseJar, setChooseJar] = useState(false);
  const [chooseCategory, setChooseCategory] = useState(false);
  const completedWishIds = useMemo(() => new Set(store.memories.map(memory => memory.wishId)), [store.memories]);
  const name = store.couple.members.find(member => member.id === owner)!.name;
  const visibleWishes = store.wishes.filter(wish => wish.createdBy === owner && (wish.createdBy === store.actor || wish.active !== false));
  const wishes = visibleWishes.filter(wish => completedWishIds.has(wish.id) === (tab === 'completed') && (filter === 'Tất cả' || wish.category === filter));
  return <AppScreen navigation>
    <ScreenTitle title={`Hũ điều ước của ${name}`} icon={<WishJarTitleIcon />} />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, minWidth: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }} accessibilityRole="tablist">
        {(['pending', 'completed'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: tab === value ? colors.primary : t('#F5E7E7') }}><Body style={{ fontSize: 13, color: tab === value ? colors.onPrimary : t('#9A626F') }}>{value === 'pending' ? 'Mong chờ' : 'Hoàn thành'} · {visibleWishes.filter(wish => completedWishIds.has(wish.id) === (value === 'completed')).length}</Body></Pressable>)}
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel={`Đổi hũ điều ước, đang xem hũ của ${name}`} accessibilityState={{ expanded: chooseJar }} onPress={() => setChooseJar(true)} style={({ pressed }) => ({ width: 44, height: 44, flexShrink: 0, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.rose, opacity: pressed ? 0.7 : 1 })}>
        <JarPairIcon />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Lọc danh mục: ${filter}`} accessibilityState={{ expanded: chooseCategory }} onPress={() => setChooseCategory(true)} style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: filter === 'Tất cả' ? t('#F5E7E7') : colors.primary }}>
        <SlidersHorizontal size={20} color={filter === 'Tất cả' ? t('#9A626F') : colors.onPrimary} />
      </Pressable>
    </View>
    {filter !== 'Tất cả' && <Body style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>Danh mục: {filter}</Body>}
    {wishes.map(wish => <WishCard key={wish.id} wish={wish} completed={completedWishIds.has(wish.id)} onFavorite={() => store.toggleWishFavorite(wish.id)} />)}
    {!wishes.length && (tab === 'completed' ? <EmptyState title={filter === 'Tất cả' ? 'Chưa có điều ước hoàn thành' : 'Chưa có điều ước hoàn thành thuộc loại này'} description="Những điều ước thành hiện thực sẽ nằm ở đây." /> : <EmptyState title={filter === 'Tất cả' ? 'Hũ đang chờ một điều ước' : 'Chưa có điều ước thuộc loại này'} description="Những điều nhỏ cũng đáng được mong chờ." action="Thêm vào hũ ✨" onAction={() => router.push('/wish/new')} />)}
    <Pressable accessibilityRole="button" onPress={() => router.push('/preparing')} style={{ flexDirection: 'row', gap: 9, justifyContent: 'center', paddingVertical: 16 }}><Gift size={18} color={colors.primary} /><Body style={{ color: colors.primary }}>Những điều mình đang chuẩn bị</Body></Pressable>
    <BottomSheet visible={chooseCategory} onClose={() => setChooseCategory(false)} title="Lọc theo danh mục">
      <ScrollView style={{ maxHeight: 340 }}>
        {(['Tất cả', ...categories] as CategoryFilter[]).map(option => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: filter === option }} onPress={() => { setFilter(option); setChooseCategory(false); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, backgroundColor: filter === option ? colors.rose : 'transparent' }}>
          <Body style={{ color: filter === option ? colors.primary : colors.ink }}>{option}</Body>
          {filter === option && <Check size={18} color={colors.primary} />}
        </Pressable>)}
      </ScrollView>
    </BottomSheet>
    <BottomSheet visible={chooseJar} onClose={() => setChooseJar(false)} title="Hai hũ điều ước">{store.couple.members.map(member => <Pressable key={member.id} accessibilityRole="button" onPress={() => { router.setParams({ owner: member.id }); setFilter('Tất cả'); setChooseJar(false); }} style={{ paddingVertical: 16 }}><Body style={{ color: member.id === owner ? colors.primary : colors.ink }}>Hũ của {member.name} ♡ · {store.wishes.filter(wish => wish.createdBy === member.id).length} điều ước</Body></Pressable>)}</BottomSheet>
  </AppScreen>;
}
