import { useAppTheme, useThemeStyles } from '../hooks/use-app-theme';
import { Pressable, StyleSheet, View } from 'react-native';
import { Heart, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { Body, CategoryChip } from './ui';
import { PhotoView } from './Artwork';
import { colors, fonts, shadow } from '../constants/theme';
import { formatCost, formatDate } from '../features/wishes/format';
import type { Memory, Preparation, Wish } from '../types/domain';

export function WishCard({ wish, onFavorite, preparation }: { wish: Wish; onFavorite?: () => void; preparation?: Preparation }) {
  const { colors, t } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  return <View style={[s.card, shadow]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem ${wish.title}`} onPress={() => router.push(preparation ? `/wish/${wish.id}/complete` : `/wish/${wish.id}`)} style={s.main}>
      <PhotoView photo={wish.cover} width={preparation ? 78 : 90} height={preparation ? 82 : 100} style={{ borderRadius: 16 }} label={wish.title} />
      <View style={{ flex: 1, gap: 5 }}><Body numberOfLines={2} style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bold, color: t('#282025') }}>{wish.title}</Body><CategoryChip category={wish.category} /><Body numberOfLines={2} style={s.description}>{preparation ? `Bắt đầu: ${formatDate(preparation.startedAt)}` : (wish.shortDescription ?? wish.description)}</Body>{!preparation && <Body style={s.price}>{formatCost(wish.estimatedCost)}</Body>}</View>
    </Pressable>
    {preparation ? <ChevronRight size={18} color={colors.muted} /> : <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={`${wish.favorite ? 'Bỏ yêu thích' : 'Yêu thích'} ${wish.title}`} accessibilityState={{ selected: wish.favorite }} onPress={onFavorite} style={s.favorite}><Heart size={21} color={wish.favorite ? t('#EE6C8C') : t('#A08791')} fill={wish.favorite ? t('#EE6C8C') : 'transparent'} strokeWidth={1.5} /></Pressable>}
  </View>;
}
export function MemoryCard({ memory, onFavorite }: { memory: Memory; onFavorite: () => void }) {
  const { colors, t } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  return <View style={[s.memory, shadow]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem kỷ niệm ${memory.title}`} onPress={() => router.push(`/memory/${memory.id}`)}><PhotoView photo={memory.photos[0]} style={{ borderRadius: 18 }} label={memory.title} /><Body numberOfLines={2} style={{ fontSize: 13, lineHeight: 19, fontFamily: fonts.bold, paddingHorizontal: 9, marginTop: 9 }}>{memory.title}</Body></Pressable>
    <View style={s.footer}><Body style={{ fontSize: 12, color: colors.muted }}>{formatDate(memory.completedAt)}</Body><Pressable onPress={onFavorite} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${memory.favorite ? 'Bỏ yêu thích' : 'Yêu thích'} kỷ niệm ${memory.title}`}><Heart size={16} color={t("#E796AC")} fill={memory.favorite ? t('#E796AC') : 'transparent'} strokeWidth={1.5} /></Pressable></View>
  </View>;
}
const baseStyles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 7, alignItems: 'center', borderRadius: 24, padding: 13, backgroundColor: 'rgba(255,250,247,0.84)', marginBottom: 13 },
  main: { flex: 1, flexDirection: 'row', gap: 13, alignItems: 'center' },
  description: { fontSize: 13, lineHeight: 18, color: colors.muted },
  price: { fontSize: 13, lineHeight: 18, color: '#856A74' },
  favorite: { width: 25, minHeight: 32, alignSelf: 'flex-start', marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  memory: { width: '48%', borderRadius: 22, padding: 4, backgroundColor: '#FFF9F6', marginBottom: 15 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 9, paddingTop: 3, paddingBottom: 8 },
});
