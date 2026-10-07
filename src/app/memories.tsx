import { useState } from 'react';
import { View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { Body, EmptyState, FilterChips, Heading } from '../components/ui';
import { MemoryCard } from '../components/Cards';
import { colors } from '../constants/theme';
import { useWishStore } from '../hooks/use-wish-store';
import type { CategoryFilter } from '../types/domain';

export default function Memories() {
  const store = useWishStore();
  const [filter, setFilter] = useState<CategoryFilter>('Tất cả');
  const memories = store.memories.filter(memory => filter === 'Tất cả' || memory.category === filter);
  return <AppScreen navigation>
    <Heading>Kỷ niệm</Heading><Body style={{ color: '#915365', marginTop: 5, marginBottom: 22 }}>Những điều ước đã trở thành hiện thực</Body>
    <FilterChips value={filter} onChange={setFilter} options={['Tất cả', 'Quà tặng', 'Du lịch', 'Trải nghiệm', 'Khoảnh khắc']} />
    <View className="flex-row flex-wrap justify-between" style={{ marginTop: 19 }}>{memories.map(memory => <MemoryCard key={memory.id} memory={memory} onFavorite={() => store.toggleMemoryFavorite(memory.id)} />)}</View>
    {!memories.length && <EmptyState title="Để dành một kỷ niệm" description="Khi điều ước thành hiện thực, khoảnh khắc ấy sẽ ở đây ♡" />}
    <Body style={{ color: colors.muted, textAlign: 'center', fontSize: 12, marginTop: 7 }}>Những điều nhỏ, hạnh phúc thật lâu ♡</Body>
  </AppScreen>;
}
