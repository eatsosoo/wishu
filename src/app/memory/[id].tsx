import { ScrollView, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, AppScreen } from '../../components/AppScreen';
import { PhotoView } from '../../components/Artwork';
import { Body, CategoryChip, EmptyState, Heading, IconButton } from '../../components/ui';
import { colors } from '../../constants/theme';
import { useWishStore } from '../../hooks/use-wish-store';
import { formatDate } from '../../features/wishes/format';

export default function MemoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useWishStore();
  const memory = store.memories.find(item => item.id === id);
  if (!memory) return <AppScreen><EmptyState title="Kỷ niệm chưa có ở đây" description="Mình về xem những khoảnh khắc khác nhé." action="Về kỷ niệm" onAction={() => router.replace('/memories')} /></AppScreen>;
  return <AppScreen><AppHeader back title="Kỷ niệm của hai đứa" right={<IconButton icon={Heart} label="Yêu thích kỷ niệm" color={memory.favorite ? '#E97092' : colors.primary} onPress={() => store.toggleMemoryFavorite(memory.id)} />} />
    <PhotoView photo={memory.photos[0]} style={{ borderRadius: 26 }} label={memory.title} />
    <Heading style={{ marginTop: 21 }}>{memory.title}</Heading><View className="flex-row items-center" style={{ gap: 12, marginTop: 12 }}><CategoryChip category={memory.category} /><Body style={{ color: colors.muted }}>{formatDate(memory.completedAt)}</Body></View>
    <Body style={{ color: '#875C6A', marginTop: 20, lineHeight: 25 }}>{memory.note}</Body>
    {memory.photos.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 23 }} contentContainerStyle={{ gap: 12 }}>{memory.photos.slice(1).map((photo, index) => <PhotoView key={index} photo={photo} width={110} height={125} style={{ borderRadius: 17 }} />)}</ScrollView>}
  </AppScreen>;
}
