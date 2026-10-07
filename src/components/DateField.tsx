import { useAppTheme } from '../hooks/use-app-theme';
import { useState } from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Body, BottomSheet, IconButton, SecondaryButton } from './ui';
import { formatDate, parseDate } from '../features/wishes/format';

export function DateField({ label, value, onChange, optional = false }: { label: string; value: string; onChange: (value: string) => void; optional?: boolean }) {
  const { colors, t } = useAppTheme();

  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(new Date());
  const [mode, setMode] = useState<'days' | 'months' | 'years'>('days');
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  function show() { const iso = parseDate(value); setCursor(iso ? new Date(`${iso}T12:00:00`) : new Date()); setMode('days'); setOpen(true); }
  function select(day: number) { onChange(formatDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)); setOpen(false); }
  return <View style={{ gap: 7 }}>
    <Body style={{ color: t('#967784') }}>{label}</Body>
    <Pressable accessibilityRole="button" accessibilityLabel={`Chọn ${label.toLowerCase()}`} onPress={show} style={{ minHeight: 45, borderRadius: 17, backgroundColor: t('#FFF9F7'), borderWidth: 1, borderColor: t('#F1E3E1'), paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Body style={{ color: value ? t('#704654') : colors.muted }}>{value || 'Chọn ngày'}</Body><CalendarDays size={19} color={colors.primary} /></Pressable>
    <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <IconButton icon={ChevronLeft} label="Tháng trước" onPress={() => setCursor(new Date(year, month - 1, 1))} />
        <Pressable accessibilityRole="button" accessibilityLabel="Chọn tháng" onPress={() => setMode(mode === 'months' ? 'days' : 'months')}><Body style={{ color: colors.primary }}>Tháng {month + 1}</Body></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Chọn năm" onPress={() => setMode(mode === 'years' ? 'days' : 'years')}><Body style={{ color: colors.primary }}>{year}</Body></Pressable>
        <IconButton icon={ChevronRight} label="Tháng sau" onPress={() => setCursor(new Date(year, month + 1, 1))} />
      </View>
      {mode === 'days' ? <View>
        <View style={{ flexDirection: 'row' }}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <Body key={day} style={{ width: '14.2857%', textAlign: 'center', color: colors.muted, marginBottom: 8 }}>{day}</Body>)}</View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{Array.from({ length: offset + count }, (_, i) => {
          const day = i - offset + 1;
          if (day < 1) return <View key={i} style={{ width: '14.2857%', height: 44 }} />;
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const selected = parseDate(value) === iso;
          return <Pressable key={i} accessibilityRole="button" accessibilityLabel={formatDate(iso)} accessibilityState={{ selected }} onPress={() => select(day)} style={{ width: '14.2857%', height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: selected ? colors.primary : 'transparent' }}><Body style={{ color: selected ? t('#fff') : colors.ink }}>{day}</Body></Pressable>;
        })}</View>
      </View> : <ScrollView style={{ maxHeight: 280 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{(mode === 'months' ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 201 }, (_, i) => 1900 + i)).map(number => <Pressable key={number} accessibilityRole="button" onPress={() => { setCursor(new Date(mode === 'years' ? number : year, mode === 'months' ? number - 1 : month, 1)); setMode('days'); }} style={{ width: '25%', minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Body>{mode === 'months' ? `Tháng ${number}` : number}</Body></Pressable>)}</View></ScrollView>}
      {optional && <View style={{ marginTop: 16 }}><SecondaryButton onPress={() => { onChange(''); setOpen(false); }}>Bỏ ngày đã chọn</SecondaryButton></View>}
    </BottomSheet>
  </View>;
}
