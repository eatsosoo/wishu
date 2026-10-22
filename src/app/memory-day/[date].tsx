import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { AppScreen } from '../../components/AppScreen';
import { Body, EmptyState, Heading } from '../../components/ui';
import { MemoryCarousel } from '../../components/MemoryCarousel';
import { useWishStore } from '../../hooks/use-wish-store';
import { useAppTheme } from '../../hooks/use-app-theme';
import { calendarMemories, parseMemoryCategories } from '../../features/calendar/memories';
import { formatDate } from '../../features/wishes/format';

export default function MemoryDay() {
  const { date, category } = useLocalSearchParams<{ date: string; category?: string | string[] }>();
  const { memories: allMemories, checkIns } = useWishStore();
  const { colors } = useAppTheme();
  const memories = useMemo(() => calendarMemories(allMemories, checkIns, parseMemoryCategories(category)).filter(memory => memory.completedAt === date), [allMemories, checkIns, date, category]);
  return <AppScreen header={{ onBack: () => router.dismissTo('/memories'), title: /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ? formatDate(date) : 'Kỷ niệm' }}>
    <Heading style={{ textAlign: 'center', marginTop: 5 }}>Ngày hôm ấy</Heading><Body style={{ textAlign: 'center', color: colors.muted, marginTop: 6, marginBottom: 22 }}>{memories.reduce((sum, memory) => sum + memory.photos.length, 0)} ảnh kỷ niệm của hai đứa ♡</Body>
    {memories.length ? <MemoryCarousel memories={memories} /> : <EmptyState title="Một ngày đang chờ kỷ niệm" description="Mình về lịch xem những ngày khác nhé." action="Về lịch kỷ niệm" onAction={() => router.replace('/memories')} />}
  </AppScreen>;
}
