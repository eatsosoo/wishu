import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CalendarDays, ChevronRight, Gift, Settings, ShoppingBag, UsersRound, type LucideIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { AppScreen } from '../components/AppScreen';
import { CoupleAvatar } from '../components/WishJar';
import { AppInput, Body, BottomSheet, ConfirmDialog, Heading, PrimaryButton, SecondaryButton } from '../components/ui';
import { colors, fonts } from '../constants/theme';
import { useWishStore } from '../hooks/use-wish-store';
import { formatDate, parseDate } from '../features/wishes/format';
import { togetherDays } from '../features/couple/selectors';

function SettingRow({ icon: Icon, label, right, onPress }: { icon: LucideIcon; label: string; right?: React.ReactNode; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.row}><View style={s.icon}><Icon size={23} color="#AF4057" strokeWidth={1.7} /></View><Body style={{ flex: 1, fontFamily: fonts.medium, color: '#662F3E' }}>{label}</Body>{right}<ChevronRight size={18} color="#A8808F" strokeWidth={1.5} /></Pressable>;
}
export default function CoupleProfile() {
  const store = useWishStore();
  const [sheet, setSheet] = useState<'profile' | 'anniversary' | 'theme' | 'settings' | null>(null);
  const [name, setName] = useState(store.couple.name);
  const [date, setDate] = useState(formatDate(store.couple.anniversaryDate));
  const [error, setError] = useState('');
  const [reset, setReset] = useState(false);
  function saveProfile() {
    const iso = parseDate(date);
    if (!iso) { setError('Nhập ngày kỷ niệm theo dạng DD/MM/YYYY.'); return; }
    if (!name.trim()) { setError('Mình đặt tên cho không gian của hai đứa nhé.'); return; }
    store.updateCouple(name.trim(), iso); setError(''); setSheet(null);
  }
  function open(value: Exclude<typeof sheet, null>) { setName(store.couple.name); setDate(formatDate(store.couple.anniversaryDate)); setError(''); setSheet(value); }
  return <AppScreen navigation>
    <Heading>Của chúng ta</Heading><Body style={{ color: '#915365', marginTop: 5 }}>Cùng nhau viết tiếp những ngày tháng{ '\n' }thật đẹp nhé ♡</Body>
    <View style={{ marginTop: 14, marginBottom: 17 }}><CoupleAvatar /></View>
    <View style={s.settings}>
      <SettingRow icon={UsersRound} label="Thông tin cặp đôi" onPress={() => open('profile')} />
      <SettingRow icon={CalendarDays} label="Ngày kỷ niệm" right={<Body style={{ fontSize: 12, color: colors.muted }}>{formatDate(store.couple.anniversaryDate)}</Body>} onPress={() => open('anniversary')} />
      <SettingRow icon={ShoppingBag} label="Giao diện" right={<View className="flex-row" style={{ gap: 8 }}><View style={[s.swatch, { backgroundColor: '#EEE1EC', borderColor: '#C785A7', borderWidth: 1.5 }]} /><View style={[s.swatch, { backgroundColor: '#F3D9D1' }]} /></View>} onPress={() => open('theme')} />
      <SettingRow icon={Settings} label="Cài đặt" onPress={() => open('settings')} />
    </View>
    <Pressable accessibilityRole="button" onPress={() => router.push('/preparing')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 19 }}><Gift size={18} color={colors.primary} /><Body style={{ color: colors.primary }}>Những bất ngờ mình đang chuẩn bị</Body></Pressable>
    <View className="flex-row justify-between" style={{ paddingHorizontal: 13 }}><Body style={s.stat}>{togetherDays(store.couple.anniversaryDate)} ngày bên nhau</Body><Body style={s.stat}>{store.memories.length} kỷ niệm ♡</Body></View>
    <BottomSheet visible={sheet === 'profile' || sheet === 'anniversary'} onClose={() => setSheet(null)} title={sheet === 'anniversary' ? 'Ngày mình bên nhau' : 'Không gian của hai đứa'}><View style={{ gap: 17 }}>{sheet === 'profile' && <AppInput label="Tên cặp đôi" value={name} onChangeText={setName} maxLength={60} />}<AppInput label="Ngày kỷ niệm" value={date} onChangeText={setDate} placeholder="DD/MM/YYYY" />{!!error && <Body accessibilityRole="alert" style={{ color: colors.primary }}>{error}</Body>}<PrimaryButton onPress={saveProfile}>Lưu lại ♡</PrimaryButton></View></BottomSheet>
    <BottomSheet visible={sheet === 'theme'} onClose={() => setSheet(null)} title="Một chút dịu dàng"><Body style={{ color: colors.muted, marginBottom: 20 }}>Kem ấm, hồng nhẹ và một chút lavender — màu của những điều nhỏ hai đứa dành cho nhau.</Body><View className="flex-row justify-center" style={{ gap: 16, marginBottom: 24 }}>{['#FFF9F5', '#F4D9DF', '#DDD8EF', '#A84F68'].map(color => <View key={color} style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: color, borderWidth: 1, borderColor: '#E7D7D7' }} />)}</View><PrimaryButton onPress={() => setSheet(null)}>Giữ những sắc màu này ♡</PrimaryButton></BottomSheet>
    <BottomSheet visible={sheet === 'settings'} onClose={() => setSheet(null)} title="Cài đặt"><Body style={{ color: colors.muted, marginBottom: 12 }}>Hồ sơ đang dùng</Body><View style={{ gap: 10 }}>{store.couple.members.map(member => <SecondaryButton key={member.id} onPress={() => { store.setActor(member.id); setSheet(null); }}>{member.name}{store.actor === member.id ? ' ♡' : ''}</SecondaryButton>)}<View style={{ marginTop: 12 }}><SecondaryButton onPress={() => { setSheet(null); setReset(true); }}>Khôi phục dữ liệu mẫu</SecondaryButton></View></View></BottomSheet>
    <ConfirmDialog visible={reset} onClose={() => setReset(false)} title="Bắt đầu lại bản xem trước?"><Body style={{ color: colors.muted, marginBottom: 20 }}>Các điều ước và kỷ niệm bạn vừa thêm sẽ được thay bằng dữ liệu mẫu ban đầu.</Body><View style={{ gap: 10 }}><PrimaryButton onPress={() => { store.reset(); setReset(false); }}>Khôi phục dữ liệu mẫu</PrimaryButton><SecondaryButton onPress={() => setReset(false)}>Giữ lại</SecondaryButton></View></ConfirmDialog>
  </AppScreen>;
}
const s = StyleSheet.create({
  settings: { borderRadius: 26, backgroundColor: 'rgba(255,250,247,0.76)', paddingHorizontal: 15 },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderColor: 'rgba(237,218,216,0.55)' },
  icon: { height: 42, width: 42, borderRadius: 999, backgroundColor: '#FBE5E1', alignItems: 'center', justifyContent: 'center' },
  swatch: { height: 26, width: 26, borderRadius: 999 },
  stat: { fontSize: 12, color: '#AA8995' },
});
