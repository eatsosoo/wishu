import { useAppTheme, useThemeStyles } from '../../hooks/use-app-theme';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Camera, ChevronDown, Plus, Star } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { AppHeader, AppScreen } from '../../components/AppScreen';
import { PhotoView, Artwork } from '../../components/Artwork';
import { AppInput, AppTextarea, Body, BottomSheet, IconButton, PrimaryButton, PrioritySelector } from '../../components/ui';
import { useWishStore } from '../../hooks/use-wish-store';
import { DateField } from '../../components/DateField';
import { parseDate } from '../../features/wishes/format';
import { categories, type Category, type Photo } from '../../types/domain';

export default function AddWish() {
  const { colors, t } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  const store = useWishStore();
  const [title, setTitle] = useState('Chụp photobooth cùng nhau');
  const [description, setDescription] = useState('Muốn lưu lại thật nhiều khoảnh khắc dễ thương của hai đứa ♡');
  const [category, setCategory] = useState<Category>('Trải nghiệm');
  const [cost, setCost] = useState('500.000');
  const [priority, setPriority] = useState(3);
  const [url, setUrl] = useState('');
  const [date, setDate] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [cover, setCover] = useState<Photo | null>(null);
  const [picker, setPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [starProgress] = useState(() => new Animated.Value(0));
  const [lidProgress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (saved) Animated.sequence([
      Animated.timing(lidProgress, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.delay(120),
      Animated.timing(starProgress, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.delay(100),
      Animated.timing(lidProgress, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [saved, starProgress, lidProgress]);
  async function chooseImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets[0]) setCover({ uri: result.assets[0].uri });
    } catch { setErrors(previous => ({ ...previous, photo: 'Chưa chọn được ảnh. Bạn thử lại nhé.' })); }
  }
  async function save() {
    if (busy) return;
    const estimatedCost = Number(cost.replace(/[.\s,đ₫]/g, ''));
    const targetDate = date ? parseDate(date) : undefined;
    const validation: Record<string, string> = {};
    if (!title.trim()) validation.title = 'Mình đặt tên cho điều ước nhé.';
    if (!Number.isFinite(estimatedCost) || estimatedCost < 0 || !cost.trim()) validation.cost = 'Nhập ngân sách hợp lệ.';
    if (url.trim() && !/^https?:\/\//i.test(url.trim())) validation.url = 'Liên kết cần bắt đầu bằng https:// hoặc http://.';
    if (date && !targetDate) validation.date = 'Nhập ngày theo dạng DD/MM/YYYY.';
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true);
    const success = await store.addWish({ createdBy: store.actor, title: title.trim(), description: description.trim(), category, estimatedCost, priority, referenceUrl: url.trim(), cover: cover ?? { art: 'photobooth' }, targetDate: targetDate ?? undefined });
    setBusy(false);
    if (success) setSaved(true);
  }
  if (saved) return <AppScreen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
    <View style={s.success}>
      <Body style={{ color: colors.primary }}>ĐIỀU ƯỚC ĐÃ ĐƯỢC GHI LẠI</Body>
      <View style={s.jarReveal}>
        <Artwork name="jarOpen" width={208} height={208} label="Hũ điều ước 3D đã mở nắp" />
        <Animated.View style={[s.flyingStar, { transform: [{ translateY: starProgress.interpolate({ inputRange: [0, 1], outputRange: [-20, 104] }) }, { scale: starProgress.interpolate({ inputRange: [0, 1], outputRange: [1.1, 0.55] }) }] }]}>
          <Star size={36} color="#F2B84B" fill="#F9D36F" strokeWidth={1.5} />
        </Animated.View>
        <Animated.Image source={require('../../../assets/artwork/jar-lid.png')} resizeMode="contain" accessibilityLabel="Nắp hũ 3D" style={[s.jarLid, { transform: [{ translateY: lidProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -38] }) }, { translateX: lidProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 19] }) }, { rotate: lidProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-35deg'] }) }] }]} />
      </View>
      <View style={{ gap: 8, alignItems: 'center' }}>
        <Body style={{ color: colors.muted, textAlign: 'center' }}>Một ngôi sao nhỏ đã tìm được chỗ trong hũ của hai đứa.</Body>
        <PrimaryButton onPress={() => router.replace({ pathname: '/wishes', params: { owner: store.actor } })}>Xem hũ điều ước ♡</PrimaryButton>
      </View>
    </View>
  </AppScreen>;
  return <AppScreen contentStyle={{ paddingTop: 6 }}>
    <AppHeader back title="Thêm điều ước mới" />
    <View style={s.image}>{cover ? <PhotoView photo={cover} height={140} /> : <Artwork name="camera" height={140} />}<View style={s.addPhoto}><IconButton icon={Plus} label="Chọn ảnh điều ước" onPress={chooseImage} /></View></View>
    <View style={{ gap: 13, marginTop: 18 }}>
      {!!errors.photo && <Body accessibilityRole="alert" style={{ color: colors.primary }}>{errors.photo}</Body>}
      <AppInput label="Tên điều ước" value={title} onChangeText={setTitle} error={errors.title} maxLength={100} />
      <AppTextarea label="Mô tả" value={description} onChangeText={setDescription} maxLength={1000} />
      <View style={{ gap: 7 }}><Body style={s.label}>Loại</Body><Pressable accessibilityRole="button" accessibilityLabel="Chọn loại điều ước" onPress={() => setPicker(true)} style={s.category}><Camera size={19} color={colors.primary} /><Body style={{ flex: 1, color: t('#75404F') }}>{category}</Body><ChevronDown size={18} color={colors.primary} /></Pressable></View>
      <AppInput label="Ngân sách dự kiến" value={cost} onChangeText={setCost} keyboardType="numeric" error={errors.cost} trailing={<Body style={{ color: colors.muted }}>đ</Body>} />
      <PrioritySelector value={priority} onChange={setPriority} />
      <AppInput label="Link tham khảo (nếu có)" value={url} onChangeText={setUrl} placeholder="https://..." autoCapitalize="none" keyboardType="url" error={errors.url} />
      {showDate && <DateField label="Ngày mong muốn (tùy chọn)" value={date} onChange={setDate} optional />}
      {!!store.storageError && <Body accessibilityRole="alert" style={{ color: colors.primary }}>{store.storageError}</Body>}
      <PrimaryButton disabled={busy} onPress={() => void save()}>{busy ? 'Đang lưu…' : 'Thêm vào hũ ✨'}</PrimaryButton>
      {!showDate && <Pressable accessibilityRole="button" onPress={() => setShowDate(true)}><Body style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>+ Thêm ngày mong muốn</Body></Pressable>}
    </View>
    <BottomSheet visible={picker} onClose={() => setPicker(false)} title="Một điều ước về…">{categories.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === category }} onPress={() => { setCategory(item); setPicker(false); }} style={{ paddingVertical: 14 }}><Body style={{ color: item === category ? colors.primary : colors.ink }}>{item}</Body></Pressable>)}</BottomSheet>
  </AppScreen>;
}
const baseStyles = StyleSheet.create({
  image: { borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: '#FFF9F7', backgroundColor: '#F6DBD8' },
  addPhoto: { position: 'absolute', right: 11, bottom: 12 },
  label: { color: '#967784', fontSize: 14 },
  category: { flexDirection: 'row', alignItems: 'center', minHeight: 45, gap: 11, backgroundColor: '#FFF9F7', borderRadius: 17, paddingHorizontal: 14, borderWidth: 1, borderColor: '#F1E3E1' },
  success: { minHeight: 470, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 12 },
  jarReveal: { height: 235, width: '100%', alignItems: 'center', justifyContent: 'flex-start', overflow: 'visible' },
  flyingStar: { position: 'absolute', top: 0, alignSelf: 'center', zIndex: 2 },
  jarLid: { position: 'absolute', top: -9, left: '50%', marginLeft: -97, width: 194, height: 194, zIndex: 3 },
});
