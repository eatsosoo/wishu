import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight, ChevronDown, Heart } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppScreen, ScreenTitle } from '../components/AppScreen';
import { PhotoView } from '../components/Artwork';
import { HolidayDecoration } from '../components/HolidayDecoration';
import { CalendarSwipe } from '../components/CalendarSwipe';
import { shiftCalendarMonth } from '../features/calendar/swipe';
import { getCalendarEvents, getCalendarQuote } from '../features/calendar/holidays';
import { Body, BottomSheet, FilterChips, Heading, IconButton, SecondaryButton } from '../components/ui';
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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
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
  function changeMonth(next: Date) { setMonth(next); setSelectedDay(null); }
  const swipeMonth = useCallback((direction: -1 | 1) => {
    setMonth(current => shiftCalendarMonth(current, direction));
    setSelectedDay(null);
  }, []);
  const selectedDate = selectedDay === null ? '' : `${prefix}-${String(selectedDay).padStart(2, '0')}`;
  const selectedEvents = selectedDay === null ? [] : getCalendarEvents(monthIndex + 1, selectedDay, store.couple.members, { year, anniversaryDate: store.couple.anniversaryDate });
  return <AppScreen navigation>
    {giftCreated === 'yes' ? <View accessibilityRole="alert" style={{ padding: 16, backgroundColor: colors.rose, borderRadius: 18, marginBottom: 18 }}><Body style={{ color: colors.primary }}>Một khoảnh khắc đã thành kỷ niệm, một lời thương gửi đến {store.partnerName} 🎁</Body></View> : null}
    <ScreenTitle title="Kỷ niệm" />
    <FilterChips value={filter} onChange={value => { setFilter(value); setSelectedDay(null); }} options={['Tất cả', 'Quà tặng', 'Du lịch', 'Trải nghiệm', 'Khoảnh khắc']} />
    <View style={{ marginTop: 20, borderRadius: 28, padding: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <IconButton icon={ChevronLeft} label="Tháng trước" onPress={() => changeMonth(new Date(year, monthIndex - 1, 1))} />
        <Pressable accessibilityRole="button" accessibilityLabel="Chọn tháng kỷ niệm" onPress={() => { setPickerYear(year); setPicker(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Heading style={{ fontSize: 20 }}>Tháng {monthIndex + 1}, {year}</Heading><ChevronDown size={16} color={colors.primary} /></Pressable>
        <IconButton icon={ChevronRight} label="Tháng sau" onPress={() => changeMonth(new Date(year, monthIndex + 1, 1))} />
      </View>
      <CalendarSwipe onMonthChange={swipeMonth} monthKey={year * 12 + monthIndex}>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <Body key={day} style={{ width: '14.2857%', textAlign: 'center', color: colors.muted, fontSize: 12 }}>{day}</Body>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{Array.from({ length: slots }, (_, i) => {
        const day = i - offset + 1;
        if (day < 1 || day > count) return <View key={i} style={{ width: '14.2857%', aspectRatio: 1 }} />;
        const date = `${prefix}-${String(day).padStart(2, '0')}`;
        const memories = byDate.get(date) ?? [];
        const photos = memories.reduce((total, memory) => total + memory.photos.length, 0);
        const selected = selectedDay === day;
        const events = getCalendarEvents(monthIndex + 1, day, store.couple.members, { year, anniversaryDate: store.couple.anniversaryDate });
        return <Pressable key={date} accessibilityRole="button" accessibilityLabel={`Ngày ${day} tháng ${monthIndex + 1} năm ${year}${events.length ? `, ${events.map(event => event.name).join(', ')}` : ''}, ${photos} ảnh kỷ niệm`} accessibilityState={{ selected }} onPress={() => setSelectedDay(day)} style={{ width: '14.2857%', aspectRatio: 1, padding: 3 }}>
          <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: selected ? colors.rose : colors.background, justifyContent: 'center', alignItems: 'center' }}>
            {memories.length > 0 && <>
              <View style={{ position: 'absolute', inset: 0 }}><PhotoView photo={memories[0].photos[0]} style={{ height: '100%', aspectRatio: undefined, borderRadius: 0 }} /></View>
              <View pointerEvents="none" style={{ position: 'absolute', inset: 0, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary }} />
            </>}
            <Body style={{ fontSize: 12, fontFamily: fonts.bold, color: memories.length ? '#fff' : colors.muted, ...(memories.length ? { position: 'absolute', left: 3, bottom: 3, backgroundColor: 'rgba(35,25,30,0.55)', borderRadius: 7, minWidth: 20, textAlign: 'center' as const } : {}) }}>{day}</Body>
            {photos > 1 && <View style={{ position: 'absolute', top: 3, left: 3, width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' }} />}
            {events.length > 0 && <HolidayDecoration events={events} />}
          </View>
        </Pressable>;
      })}</View>
      </CalendarSwipe>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 14, paddingBottom: 5 }}><Heart size={13} color={colors.primary} /><Body style={{ color: colors.muted, fontSize: 12 }}>{monthGroups.length} ngày đáng nhớ · {photoCount} ảnh</Body></View>
    </View>
    {selectedDay !== null ? <View accessibilityLiveRegion="polite" style={{ paddingVertical: 23, gap: 10 }}>
      <Body style={{ textAlign: 'center', color: colors.primary, fontFamily: fonts.bold }}>{selectedDay}/{monthIndex + 1}/{year}{selectedEvents.length ? ` · ${selectedEvents.map(event => event.name).join(' · ')}` : ''}</Body>
      <Body style={{ textAlign: 'center', color: colors.burgundy, fontStyle: 'italic' }}>“{getCalendarQuote(selectedEvents)}”</Body>
      {byDate.has(selectedDate) ? <SecondaryButton onPress={() => router.push({ pathname: '/memory-day/[date]', params: { date: selectedDate, category: filter } })}>Xem kỷ niệm ngày này ♡</SecondaryButton> : <Body style={{ textAlign: 'center', color: colors.muted, fontSize: 12 }}>Hoàn thành một điều ước để lưu khoảnh khắc mới.</Body>}
    </View> : null}
    {!!latestDate && <View style={{ marginTop: 20 }}><SecondaryButton onPress={() => { setFilter('Tất cả'); changeMonth(new Date(`${latestDate}T12:00:00`)); }}>Về tháng có kỷ niệm mới nhất</SecondaryButton></View>}
    <BottomSheet visible={picker} onClose={() => setPicker(false)} title="Chọn tháng kỷ niệm"><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}><IconButton icon={ChevronLeft} label="Năm trước" onPress={() => setPickerYear(value => value - 1)} /><Heading style={{ fontSize: 22 }}>{pickerYear}</Heading><IconButton icon={ChevronRight} label="Năm sau" onPress={() => setPickerYear(value => value + 1)} /></View><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Array.from({ length: 12 }, (_, i) => <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Tháng ${i + 1} năm ${pickerYear}`} onPress={() => { changeMonth(new Date(pickerYear, i, 1)); setPicker(false); }} style={{ width: '30%', minHeight: 48, borderRadius: 15, backgroundColor: i === monthIndex && pickerYear === year ? colors.rose : colors.surface, alignItems: 'center', justifyContent: 'center' }}><Body style={{ color: colors.primary }}>Tháng {i + 1}</Body></Pressable>)}</View></BottomSheet>
  </AppScreen>;
}
