import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight, ChevronDown, Heart } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppScreen, ScreenTitle } from '../components/AppScreen';
import { PhotoView } from '../components/Artwork';
import { Body, BottomSheet, EmptyState, FilterChips, Heading, IconButton, SecondaryButton } from '../components/ui';
import { fonts } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';
import { useWishStore } from '../hooks/use-wish-store';
import type { CategoryFilter, Memory } from '../types/domain';

export default function Memories() {
  const { colors } = useAppTheme();
  const store = useWishStore();
  const { giftCreated } = useLocalSearchParams<{ giftCreated?: string }>();
  const latestDate = store.memories.reduce((latest, memory) => memory.completedAt > latest ? memory.completedAt : latest, '');
  const [month, setMonth] = useState(() => new Date(`${latestDate || new Date().toISOString().slice(0, 10)}T12:00:00`));
  const [filter, setFilter] = useState<CategoryFilter>('Tất cả');
  const [picker, setPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(month.getFullYear());
  const [emptyDay, setEmptyDay] = useState<number | null>(null);
  const year = month.getFullYear(), monthIndex = month.getMonth();
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const byDate = useMemo(() => {
    const groups = new Map<string, Memory[]>();
    for (const memory of store.memories) {
      if (filter !== 'Tất cả' && memory.category !== filter) continue;
      const group = groups.get(memory.completedAt) ?? [];
      group.push(memory); groups.set(memory.completedAt, group);
    }
    return groups;
  }, [store.memories, filter]);
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const slots = Math.ceil((offset + count) / 7) * 7;
  const monthGroups = [...byDate.entries()].filter(([date]) => date.startsWith(prefix));
  const photoCount = monthGroups.reduce((sum, [, memories]) => sum + memories.reduce((n, memory) => n + memory.photos.length, 0), 0);
  function changeMonth(next: Date) { setMonth(next); setEmptyDay(null); }
  function openDay(day: number) {
    const date = `${prefix}-${String(day).padStart(2, '0')}`;
    if (!byDate.has(date)) { setEmptyDay(day); return; }
    setEmptyDay(null);
    router.push({ pathname: '/memory-day/[date]', params: { date, category: filter } });
  }
  return <AppScreen navigation contentStyle={{ paddingHorizontal: 20 }}>
    {giftCreated === 'yes' ? <View accessibilityRole="alert" style={{ padding: 16, backgroundColor: colors.rose, borderRadius: 18, marginBottom: 18 }}><Body style={{ color: colors.primary }}>Đã lưu kỷ niệm và tạo thông báo cho người ấy 🎁</Body><Body style={{ color: colors.muted, fontSize: 12 }}>Push sẽ gửi tới thiết bị người ấy đã bật thông báo.</Body></View> : null}
    <ScreenTitle title="Kỷ niệm" /><Body style={{ color: colors.muted, marginTop: -8, marginBottom: 19 }}>Mỗi ngày, một chút thương để nhớ ♡</Body>
    <FilterChips value={filter} onChange={value => { setFilter(value); setEmptyDay(null); }} options={['Tất cả', 'Quà tặng', 'Du lịch', 'Trải nghiệm', 'Khoảnh khắc']} />
    <View style={{ marginTop: 20, borderRadius: 28, padding: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <IconButton icon={ChevronLeft} label="Tháng trước" onPress={() => changeMonth(new Date(year, monthIndex - 1, 1))} />
        <Pressable accessibilityRole="button" accessibilityLabel="Chọn tháng kỷ niệm" onPress={() => { setPickerYear(year); setPicker(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Heading style={{ fontSize: 20 }}>Tháng {monthIndex + 1}, {year}</Heading><ChevronDown size={16} color={colors.primary} /></Pressable>
        <IconButton icon={ChevronRight} label="Tháng sau" onPress={() => changeMonth(new Date(year, monthIndex + 1, 1))} />
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <Body key={day} style={{ width: '14.2857%', textAlign: 'center', color: colors.muted, fontSize: 12 }}>{day}</Body>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{Array.from({ length: slots }, (_, i) => {
        const day = i - offset + 1;
        if (day < 1 || day > count) return <View key={i} style={{ width: '14.2857%', aspectRatio: 0.78 }} />;
        const date = `${prefix}-${String(day).padStart(2, '0')}`;
        const memories = byDate.get(date) ?? [];
        const photos = memories.reduce((total, memory) => total + memory.photos.length, 0);
        const selected = emptyDay === day;
        return <Pressable key={date} accessibilityRole="button" accessibilityLabel={`Ngày ${day} tháng ${monthIndex + 1} năm ${year}, ${photos} ảnh kỷ niệm`} accessibilityState={{ selected }} onPress={() => openDay(day)} style={{ width: '14.2857%', aspectRatio: 0.78, padding: 3 }}>
          <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: selected ? colors.rose : colors.background, borderWidth: memories.length ? 1.5 : 0, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
            {memories.length > 0 && <View style={{ position: 'absolute', inset: 0 }}><PhotoView photo={memories[0].photos[0]} height={70} /></View>}
            <Body style={{ fontSize: 12, fontFamily: fonts.bold, color: memories.length ? '#fff' : colors.muted, ...(memories.length ? { position: 'absolute', left: 3, bottom: 3, backgroundColor: 'rgba(35,25,30,0.55)', borderRadius: 7, minWidth: 20, textAlign: 'center' as const } : {}) }}>{day}</Body>
            {photos > 1 && <View style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' }} />}
          </View>
        </Pressable>;
      })}</View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 14, paddingBottom: 5 }}><Heart size={13} color={colors.primary} /><Body style={{ color: colors.muted, fontSize: 12 }}>{monthGroups.length} ngày đáng nhớ · {photoCount} ảnh</Body></View>
    </View>
    {emptyDay !== null ? <View style={{ paddingVertical: 23, gap: 5 }}><Body style={{ textAlign: 'center', color: colors.primary }}>Ngày {emptyDay}/{monthIndex + 1} còn chờ một kỷ niệm ♡</Body><Body style={{ textAlign: 'center', color: colors.muted, fontSize: 12 }}>Hoàn thành một điều ước để lưu khoảnh khắc mới.</Body></View> : <Body style={{ textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 20, marginBottom: 15 }}>Chạm vào ngày có ảnh để lướt lại những khoảnh khắc.</Body>}
    {!!latestDate && <SecondaryButton onPress={() => { setFilter('Tất cả'); changeMonth(new Date(`${latestDate}T12:00:00`)); }}>Về tháng có kỷ niệm mới nhất</SecondaryButton>}
    {!store.memories.length && <EmptyState title="Để dành một kỷ niệm" description="Khi điều ước thành hiện thực, khoảnh khắc ấy sẽ ở đây ♡" />}
    <BottomSheet visible={picker} onClose={() => setPicker(false)} title="Chọn tháng kỷ niệm"><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}><IconButton icon={ChevronLeft} label="Năm trước" onPress={() => setPickerYear(value => value - 1)} /><Heading style={{ fontSize: 22 }}>{pickerYear}</Heading><IconButton icon={ChevronRight} label="Năm sau" onPress={() => setPickerYear(value => value + 1)} /></View><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Array.from({ length: 12 }, (_, i) => <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Tháng ${i + 1} năm ${pickerYear}`} onPress={() => { changeMonth(new Date(pickerYear, i, 1)); setPicker(false); }} style={{ width: '30%', minHeight: 48, borderRadius: 15, backgroundColor: i === monthIndex && pickerYear === year ? colors.rose : colors.surface, alignItems: 'center', justifyContent: 'center' }}><Body style={{ color: colors.primary }}>Tháng {i + 1}</Body></Pressable>)}</View></BottomSheet>
  </AppScreen>;
}
