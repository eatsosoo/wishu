import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, AppScreen } from '../../components/AppScreen';
import { Body, EmptyState } from '../../components/ui';
import { MemoryCarousel } from '../../components/MemoryCarousel';
import { useAppTheme } from '../../hooks/use-app-theme';
import { useWishStore } from '../../hooks/use-wish-store';
import { formatDate } from '../../features/wishes/format';

export default function MemoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useWishStore();
  const { colors } = useAppTheme();
  const memory = store.memories.find(item => item.id === id);
  const memories = useMemo(() => memory ? [memory] : [], [memory]);
  if (!memory) return <AppScreen><EmptyState title="Kỷ niệm chưa có ở đây" description="Mình về xem những khoảnh khắc khác nhé." action="Về kỷ niệm" onAction={() => router.replace('/memories')} /></AppScreen>;
  return <AppScreen><AppHeader back title="Kỷ niệm của hai đứa" /><Body style={{ textAlign: 'center', color: colors.muted, marginBottom: 19 }}>{formatDate(memory.completedAt)} ♡</Body><MemoryCarousel memories={memories} /></AppScreen>;
}
