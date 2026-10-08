import { themes, useAppTheme, useThemeStyles, type ThemeId } from '../hooks/use-app-theme';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CalendarDays, Check, ChevronRight, Copy, Gift, Settings, ShoppingBag, UsersRound, type LucideIcon } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { AppScreen, ScreenTitle } from '../components/AppScreen';
import { CoupleAvatar } from '../components/WishJar';
import { AppInput, Body, BottomSheet, PrimaryButton, SecondaryButton } from '../components/ui';
import { fonts } from '../constants/theme';
import { useWishStore } from '../hooks/use-wish-store';
import { DateField } from '../components/DateField';
import { formatDate, parseDate } from '../features/wishes/format';
import { togetherDays } from '../features/couple/selectors';

function SettingRow({ icon: Icon, label, right, onPress }: { icon: LucideIcon; label: string; right?: React.ReactNode; onPress: () => void }) {
  const { t } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.row}><View style={s.icon}><Icon size={23} color={t("#AF4057")} strokeWidth={1.7} /></View><Body style={{ flex: 1, fontFamily: fonts.medium, color: t('#662F3E') }}>{label}</Body>{right}<ChevronRight size={18} color={t("#A8808F")} strokeWidth={1.5} /></Pressable>;
}
export default function CoupleProfile() {
  const { colors, t, id: themeId, setTheme, error: themeError } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  const store = useWishStore();
  const [sheet, setSheet] = useState<'profile' | 'anniversary' | 'theme' | 'settings' | null>(null);
  const [name, setName] = useState(store.couple.name);
  const [date, setDate] = useState(formatDate(store.couple.anniversaryDate));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  async function copyInviteCode() {
    const code = store.cloudCouple?.inviteCode;
    if (!code) return;
    await Clipboard.setStringAsync(code.toUpperCase());
    setCopied(true);
  }
  async function saveProfile() {
    if (saving) return;
    const iso = parseDate(date);
    if (!iso) { setError('Nhập ngày kỷ niệm theo dạng DD/MM/YYYY.'); return; }
    if (!name.trim()) { setError('Mình đặt tên cho không gian của hai đứa nhé.'); return; }
    setSaving(true);
    const success = await store.updateCouple(name.trim(), iso);
    setSaving(false);
    if (success) { setError(''); setSheet(null); }
    else setError('Chưa lưu được thay đổi. Bạn thử lại nhé.');
  }
  function open(value: Exclude<typeof sheet, null>) { setName(store.couple.name); setDate(formatDate(store.couple.anniversaryDate)); setError(''); setSheet(value); }
  return <AppScreen navigation>
    <ScreenTitle title="Của chúng ta" /><Body style={{ color: t('#915365'), marginTop: -8 }}>Cùng nhau viết tiếp những ngày tháng{ '\n' }thật đẹp nhé ♡</Body>
    <View style={{ marginTop: 14, marginBottom: 17 }}><CoupleAvatar /></View>
    {store.cloudCouple?.inviteCode ? <View style={{ padding: 18, borderRadius: 22, backgroundColor: colors.surface, gap: 8, marginTop: 14, marginBottom: 18 }}><Body style={{ color: colors.primary }}>Mời người ấy vào không gian của mình ♡</Body><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><Body selectable style={{ flex: 1, fontSize: 16, letterSpacing: 2, fontFamily: fonts.bold }}>{store.cloudCouple.inviteCode.toUpperCase()}</Body><Pressable accessibilityRole="button" accessibilityLabel={copied ? 'Đã sao chép mã mời' : 'Sao chép mã mời'} onPress={() => void copyInviteCode()} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.rose }}>{copied ? <Check size={18} color={colors.primary} /> : <Copy size={18} color={colors.primary} />}</Pressable></View><Body style={{ color: colors.muted, fontSize: 12 }}>Người ấy đăng nhập trên điện thoại của mình rồi nhập mã này để ghép đôi.</Body></View> : null}
    <View style={s.settings}>
      <SettingRow icon={UsersRound} label="Thông tin cặp đôi" onPress={() => open('profile')} />
      <SettingRow icon={CalendarDays} label="Ngày kỷ niệm" right={<Body style={{ fontSize: 12, color: colors.muted }}>{formatDate(store.couple.anniversaryDate)}</Body>} onPress={() => open('anniversary')} />
      <SettingRow icon={ShoppingBag} label="Giao diện" right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Body style={{ color: colors.muted, fontSize: 12 }}>{themes[themeId].name}</Body><View style={[s.swatch, { backgroundColor: colors.primary }]} /></View>} onPress={() => open('theme')} />
      <SettingRow icon={Settings} label="Cài đặt" onPress={() => open('settings')} />
    </View>
    <Pressable accessibilityRole="button" onPress={() => router.push('/preparing')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 19 }}><Gift size={18} color={colors.primary} /><Body style={{ color: colors.primary }}>Những bất ngờ mình đang chuẩn bị</Body></Pressable>
    <View className="flex-row justify-between" style={{ paddingHorizontal: 13 }}><Body style={s.stat}>{togetherDays(store.couple.anniversaryDate)} ngày bên nhau</Body><Body style={s.stat}>{store.memories.length} kỷ niệm ♡</Body></View>
    {!!store.storageError && <Body accessibilityRole="alert" style={{ color: colors.primary, marginTop: 12 }}>{store.storageError}</Body>}
    <BottomSheet visible={sheet === 'profile' || sheet === 'anniversary'} onClose={() => setSheet(null)} title={sheet === 'anniversary' ? 'Ngày mình bên nhau' : 'Không gian của hai đứa'}><View style={{ gap: 17 }}>{sheet === 'profile' && <AppInput label="Tên cặp đôi" value={name} onChangeText={setName} maxLength={60} />}<DateField label="Ngày kỷ niệm" value={date} onChange={setDate} />{!!error && <Body accessibilityRole="alert" style={{ color: colors.primary }}>{error}</Body>}<PrimaryButton disabled={saving} onPress={() => void saveProfile()}>{saving ? 'Đang lưu…' : 'Lưu lại ♡'}</PrimaryButton></View></BottomSheet>
    <BottomSheet visible={sheet === 'theme'} onClose={() => setSheet(null)} title="Màu của hai đứa"><Body style={{ color: colors.muted, marginBottom: 20 }}>Chọn một sắc màu cho không gian của mình ♡</Body><View style={{ gap: 12, marginBottom: 22 }}>{(Object.keys(themes) as ThemeId[]).map(id => {
      const theme = themes[id], selected = id === themeId;
      return <Pressable key={id} accessibilityRole="radio" accessibilityLabel={theme.name} accessibilityState={{ checked: selected }} onPress={() => setTheme(id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15, borderRadius: 20, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primary : colors.line, backgroundColor: colors.surface }}><View style={{ width: 45, height: 45, borderRadius: 23, backgroundColor: theme.colors.rose, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 25, height: 25, borderRadius: 13, backgroundColor: theme.colors.primary }} /></View><View style={{ flex: 1 }}><Body style={{ fontFamily: fonts.bold }}>{theme.name}</Body><Body style={{ color: colors.muted, fontSize: 12 }}>{theme.description}</Body></View><Body style={{ color: colors.primary, fontSize: 20 }}>{selected ? '✓' : '○'}</Body></Pressable>;
    })}</View>{!!themeError && <Body accessibilityRole="alert" style={{ color: colors.primary, marginBottom: 12 }}>{themeError}</Body>}<PrimaryButton onPress={() => setSheet(null)}>Xong ♡</PrimaryButton></BottomSheet>
    <BottomSheet visible={sheet === 'settings'} onClose={() => setSheet(null)} title="Cài đặt"><Body style={{ color: colors.muted, marginBottom: 12 }}>Hồ sơ đang dùng</Body><View style={{ gap: 10 }}><Body style={{ color: colors.muted }}>{store.session?.user.email}</Body><SecondaryButton onPress={() => { setSheet(null); void store.logout(); }}>Đăng xuất</SecondaryButton></View></BottomSheet>
  </AppScreen>;
}
const baseStyles = StyleSheet.create({
  settings: { borderRadius: 26, backgroundColor: 'rgba(255,250,247,0.76)', paddingHorizontal: 15 },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderColor: 'rgba(237,218,216,0.55)' },
  icon: { height: 42, width: 42, borderRadius: 999, backgroundColor: '#FBE5E1', alignItems: 'center', justifyContent: 'center' },
  swatch: { height: 26, width: 26, borderRadius: 999 },
  stat: { fontSize: 12, color: '#AA8995' },
});
