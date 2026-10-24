import { useAppTheme } from '../hooks/use-app-theme';
import { useCallback, useState } from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { Body, BottomSheet, IconButton, SecondaryButton } from './ui';
import { formatDate, parseDate } from '../features/wishes/format';
import { CalendarSwipe } from './CalendarSwipe';
import { CalendarWeekdays } from './CalendarWeekdays';
import { calendarMonth } from '../features/calendar/month';
import { shiftCalendarMonth } from '../features/calendar/swipe';

export function DateField({ label, value, onChange, optional = false }: { label: string; value: string; onChange: (value: string) => void; optional?: boolean }) {
  const { colors, t } = useAppTheme();

  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(new Date());
  const [mode, setMode] = useState<'days' | 'months' | 'years'>('days');
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const days = calendarMonth(year, month);
  const swipeMonth = useCallback((direction: -1 | 1) => {
    setCursor(current => shiftCalendarMonth(current, direction));
  }, []);
  function show() { const iso = parseDate(value); setCursor(iso ? new Date(`${iso}T12:00:00`) : new Date()); setMode('days'); setOpen(true); }
  function select(day: number) { onChange(formatDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)); setOpen(false); }
  return <View style={{ gap: 7 }}>
    <Body style={{ color: t('#967784') }}>{label}</Body>
    <View style={{ minHeight: 45, borderRadius: 17, backgroundColor: t('#FFF9F7'), borderWidth: 1, borderColor: t('#F1E3E1'), paddingLeft: 14, paddingRight: 7, flexDirection: 'row', alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Chọn ${label.toLowerCase()}`} onPress={show} style={{ flex: 1, minHeight: 43, flexDirection: 'row', alignItems: 'center' }}><Body style={{ flex: 1, color: value ? t('#704654') : colors.muted }}>{value || 'Chọn ngày'}</Body><CalendarDays size={19} color={colors.primary} /></Pressable>
      {optional && !!value && <Pressable accessibilityRole="button" accessibilityLabel={`Xóa ${label.toLowerCase()}`} onPress={() => onChange('')} hitSlop={9} style={{ width: 26, height: 26, marginLeft: 10, marginRight: 3, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: t('#F7EDEE') }}><X size={12} color={t('#987E87')} strokeWidth={2} /></Pressable>}
    </View>
    <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <IconButton icon={ChevronLeft} label="Tháng trước" onPress={() => setCursor(new Date(year, month - 1, 1))} />
        <Pressable accessibilityRole="button" accessibilityLabel="Chọn tháng" onPress={() => setMode(mode === 'months' ? 'days' : 'months')}><Body style={{ color: colors.primary }}>Tháng {month + 1}</Body></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Chọn năm" onPress={() => setMode(mode === 'years' ? 'days' : 'years')}><Body style={{ color: colors.primary }}>{year}</Body></Pressable>
        <IconButton icon={ChevronRight} label="Tháng sau" onPress={() => setCursor(new Date(year, month + 1, 1))} />
      </View>
      {mode === 'days' ? <CalendarSwipe onMonthChange={swipeMonth} monthKey={year * 12 + month}>
        <CalendarWeekdays textStyle={{ marginBottom: 8 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{days.map((day, i) => {
          if (day === null) return <View key={i} style={{ width: '14.2857%', height: 44 }} />;
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const selected = parseDate(value) === iso;
          return <View key={i} style={{ width: '14.2857%', height: 44, padding: 2 }}><Pressable accessibilityRole="button" accessibilityLabel={formatDate(iso)} accessibilityState={{ selected }} onPress={() => select(day)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: selected ? colors.primary : 'transparent' }}><Body style={{ color: selected ? colors.onPrimary : colors.ink }}>{day}</Body></Pressable></View>;
        })}</View>
      </CalendarSwipe> : <ScrollView style={{ maxHeight: 280 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{(mode === 'months' ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 201 }, (_, i) => 1900 + i)).map(number => <Pressable key={number} accessibilityRole="button" onPress={() => { setCursor(new Date(mode === 'years' ? number : year, mode === 'months' ? number - 1 : month, 1)); setMode('days'); }} style={{ width: '25%', minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Body>{mode === 'months' ? `Tháng ${number}` : number}</Body></Pressable>)}</View></ScrollView>}
      {optional && <View style={{ marginTop: 16 }}><SecondaryButton onPress={() => { onChange(''); setOpen(false); }}>Bỏ ngày đã chọn</SecondaryButton></View>}
    </BottomSheet>
  </View>;
}
