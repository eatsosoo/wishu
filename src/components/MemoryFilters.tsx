import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { CalendarHeart, Check, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react-native';
import { Body, BottomSheet } from './ui';
import { useAppTheme } from '../hooks/use-app-theme';
import { fonts } from '../constants/theme';
import type { Category } from '../types/domain';

const categories = [
  { value: 'Tất cả', label: 'Tất cả kỷ niệm' },
  { value: 'Quà tặng', label: 'Quà tặng' },
  { value: 'Du lịch', label: 'Du lịch' },
  { value: 'Trải nghiệm', label: 'Trải nghiệm' },
  { value: 'Khoảnh khắc', label: 'Khoảnh khắc' },
] as const;

export function MemoryFilters({ value, onChange, onLatest }: {
  value: Category[];
  onChange: (value: Category[]) => void;
  onLatest?: () => void;
}) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const filtered = value.length > 0;
  const { height } = useWindowDimensions();
  function toggle(category: typeof categories[number]['value']) {
    if (category === 'Tất cả') onChange([]);
    else onChange(value.includes(category) ? value.filter(item => item !== category) : [...value, category]);
  }
  return <>
    <View style={styles.toolbar}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Bộ lọc kỷ niệm: ${filtered ? value.join(', ') : 'Tất cả'}`} accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.filter, { backgroundColor: filtered ? colors.rose : colors.surface, borderColor: filtered ? colors.primary : colors.line, opacity: pressed ? 0.7 : 1 }]}>
        <SlidersHorizontal size={21} color={colors.primary} />
        {filtered ? <View pointerEvents="none" style={[styles.activeDot, { backgroundColor: colors.primary, borderColor: colors.rose }]} /> : null}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Về tháng có kỷ niệm mới nhất" accessibilityHint="Mở tháng mới nhất trong bộ lọc đang chọn" accessibilityState={{ disabled: !onLatest }} disabled={!onLatest} onPress={onLatest}
        style={({ pressed }) => [styles.latest, { opacity: onLatest ? (pressed ? 0.7 : 1) : 0.4 }]}>
        <View pointerEvents="none" style={[styles.sticker, { backgroundColor: colors.rose, borderColor: colors.line }]}>
          <CalendarHeart size={24} strokeWidth={1.7} color={colors.primary} />
          <View style={[styles.returnBadge, { backgroundColor: colors.surface, borderColor: colors.line }]}><RotateCcw size={11} color={colors.primary} strokeWidth={2.2} /></View>
          <Sparkles size={11} color={colors.primary} style={styles.sparkle} />
        </View>
      </Pressable>
    </View>
    <BottomSheet visible={open} onClose={() => setOpen(false)} title="Lọc kỷ niệm">
      <Body style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>Chọn những kỷ niệm bạn muốn xem</Body>
      <ScrollView style={{ maxHeight: height * 0.4, flexGrow: 0 }} contentContainerStyle={styles.options} showsVerticalScrollIndicator={false}>
        {categories.map(({ value: category, label }) => {
          const selected = category === 'Tất cả' ? !filtered : value.includes(category);
          return <Pressable key={category} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: selected }} aria-checked={selected} onPress={() => toggle(category)}
            style={[styles.optionTarget, category === 'Tất cả' && styles.allTarget]}>
            {({ pressed }) =>
            <View pointerEvents="none" style={[styles.option, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.line, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
              <View style={styles.optionLabel}><Body style={{ color: selected ? colors.onPrimary : colors.burgundy, fontSize: 14, lineHeight: 22, textAlign: 'center', fontFamily: fonts.medium }}>{label}</Body></View>
              <View style={[styles.checkmark, { backgroundColor: selected ? `${colors.onPrimary}26` : 'transparent' }]}>
                {selected ? <Check size={14} color={colors.onPrimary} strokeWidth={2.5} /> : null}
              </View>
            </View>}
          </Pressable>;
        })}
      </ScrollView>
    </BottomSheet>
  </>;
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  filter: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 16 },
  activeDot: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  latest: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  sticker: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  returnBadge: { position: 'absolute', bottom: -3, right: -3, width: 19, height: 19, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute', top: -4, right: -3 },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, paddingVertical: 2 },
  optionTarget: { width: '48%' },
  allTarget: { width: '100%', marginBottom: 2 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 52, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderRadius: 26 },
  optionLabel: { flex: 1, minWidth: 0 },
  checkmark: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
