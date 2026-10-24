import { PopupMessage } from '../../components/PopupMessage';
import { useAppTheme, useThemeStyles } from '../../hooks/use-app-theme';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Camera, ChevronDown, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { AppScreen } from '../../components/AppScreen';
import { PhotoView, prefetchCategoryArtwork } from '../../components/Artwork';
import { WishAddedAnimation } from '../../components/WishAddedAnimation';
import { WishVisibility } from '../../components/WishVisibility';
import { prefetchRevealArtwork } from '../../components/reveal-artwork';
import { defaultWishCover } from '../../features/wishes/default-cover';
import { AppInput, AppTextarea, Body, BottomSheet, IconButton, PrimaryButton, PrioritySelector } from '../../components/ui';
import { useWishStore } from '../../hooks/use-wish-store';
import { DateField } from '../../components/DateField';
import { formatBudgetInput, parseDate } from '../../features/wishes/format';
import { categories, type Category, type Photo } from '../../types/domain';
import { optimizePickedPhoto } from '../../services/optimize-photo';
import { isHttpUrl } from '../../features/input-validation';

export default function AddWish() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isPreview = __DEV__ && preview === '1';
  const { colors, t } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  const store = useWishStore();
  const [title, setTitle] = useState('');
  const [active, setActive] = useState(true);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Trải nghiệm');
  const [cost, setCost] = useState('0');
  const [priority, setPriority] = useState(3);
  const [url, setUrl] = useState('');
  const [date, setDate] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [cover, setCover] = useState<Photo | null>(null);
  const [picker, setPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { void prefetchCategoryArtwork(); void prefetchRevealArtwork('jar'); }, []);
  async function chooseImage() {
    if (processingPhoto || busy) return;
    setProcessingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (!result.canceled && result.assets[0]) {
        setCover(await optimizePickedPhoto(result.assets[0]));
        setErrors(previous => ({ ...previous, photo: '' }));
      }
    } catch (error) { setErrors(previous => ({ ...previous, photo: error instanceof Error ? error.message : 'Chưa xử lý được ảnh. Bạn thử lại nhé.' })); }
    finally { setProcessingPhoto(false); }
  }
  async function save() {
    if (busy || processingPhoto) return;
    const estimatedCost = Number(cost.replace(/[.\s,đ₫]/g, ''));
    const targetDate = date ? parseDate(date) : undefined;
    const validation: Record<string, string> = {};
    if (!title.trim()) validation.title = 'Mình đặt tên cho điều ước nhé.';
    if (!Number.isSafeInteger(estimatedCost) || estimatedCost < 0) validation.cost = 'Ngân sách cần là số nguyên từ 0 đồng trở lên.';
    if (url.trim() && !isHttpUrl(url.trim())) validation.url = 'Nhập liên kết http:// hoặc https:// hợp lệ, tối đa 2048 ký tự.';
    if (date && !targetDate) validation.date = 'Nhập ngày theo dạng DD/MM/YYYY.';
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true);
    const success = await store.addWish({ createdBy: store.actor, active, title: title.trim(), description: description.trim(), category, estimatedCost, priority, referenceUrl: url.trim(), cover: cover ?? defaultWishCover(category), targetDate: targetDate ?? undefined });
    setBusy(false);
    if (success) setSaved(true);
  }
  if (saved || isPreview) return <AppScreen header={{ title: 'Thêm điều ước mới', onBack: () => router.replace({ pathname: '/wishes', params: { owner: store.actor } }) }} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
    <View style={s.success}>
      <Body style={{ color: colors.primary }}>{isPreview ? 'XEM THỬ THẢ SAO VÀO HŨ' : 'ĐIỀU ƯỚC ĐÃ ĐƯỢC GHI LẠI'}</Body>
      <WishAddedAnimation />
      <View style={{ gap: 8, alignItems: 'center' }}>
        <Body style={{ color: colors.muted, textAlign: 'center' }}>{active ? 'Một ngôi sao nhỏ đã tìm được chỗ trong hũ của hai đứa.' : 'Điều ước đã lưu riêng cho bạn. Bật hiển thị khi bạn muốn chia sẻ với người ấy.'}</Body>
        <PrimaryButton onPress={() => router.replace({ pathname: '/wishes', params: { owner: store.actor } })}>Xem hũ điều ước ♡</PrimaryButton>
      </View>
    </View>
  </AppScreen>;
  return <AppScreen header={{ title: 'Thêm điều ước mới' }}>
    <View style={s.image}><PhotoView photo={cover ?? defaultWishCover(category)} height={180} fit={cover ? 'cover' : 'contain'} label={`Ảnh điều ước ${category}`} /><View style={s.addPhoto}><IconButton icon={Plus} label="Chọn ảnh điều ước" onPress={chooseImage} /></View></View>
    <Body accessibilityLiveRegion="polite" style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>{processingPhoto ? 'Đang tối ưu ảnh…' : 'Ảnh tối đa 20 MB · tự tối ưu còn tối đa 2 MB'}</Body>
    <View style={{ gap: 13, marginTop: 18 }}>
      {!!errors.photo && <PopupMessage message={errors.photo} />}
      <AppInput label="Tên điều ước" placeholder="Nhập tên điều ước" value={title} onChangeText={setTitle} error={errors.title} maxLength={100} />
      <AppTextarea label="Mô tả" placeholder="Mô tả điều ước" value={description} onChangeText={setDescription} maxLength={1000} />
      <View style={{ gap: 7 }}><Body style={s.label}>Loại</Body><Pressable accessibilityRole="button" accessibilityLabel="Chọn loại điều ước" onPress={() => setPicker(true)} style={s.category}><Camera size={19} color={colors.primary} /><Body style={{ flex: 1, color: t('#75404F') }}>{category}</Body><ChevronDown size={18} color={colors.primary} /></Pressable></View>
      <AppInput label="Ngân sách dự kiến" placeholder="0" value={cost} onChangeText={value => setCost(formatBudgetInput(value))} onBlur={() => { if (!cost.trim()) setCost('0'); }} keyboardType="numeric" error={errors.cost} trailing={<Body style={{ color: colors.muted }}>đ</Body>} />
      <PrioritySelector value={priority} onChange={setPriority} />
      <WishVisibility active={active} onChange={setActive} disabled={busy} />
      <AppInput label="Link tham khảo (nếu có)" value={url} onChangeText={setUrl} placeholder="Dán liên kết" autoCapitalize="none" keyboardType="url" maxLength={2048} error={errors.url} />
      {showDate && <DateField label="Ngày mong muốn (tùy chọn)" value={date} onChange={setDate} optional />}

      <PrimaryButton loading={busy || processingPhoto} disabled={busy || processingPhoto} onPress={() => void save()}>{busy ? 'Đang lưu…' : processingPhoto ? 'Đang tối ưu ảnh…' : 'Thêm vào hũ ✨'}</PrimaryButton>
      {!showDate && <Pressable accessibilityRole="button" onPress={() => setShowDate(true)}><Body style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>+ Thêm ngày mong muốn</Body></Pressable>}
    </View>
    <BottomSheet visible={picker} onClose={() => setPicker(false)} title="Một điều ước về…">{categories.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === category }} onPress={() => { setCategory(item); setPicker(false); }} style={{ paddingVertical: 14 }}><Body style={{ color: item === category ? colors.primary : colors.ink }}>{item}</Body></Pressable>)}</BottomSheet>
  </AppScreen>;
}
const baseStyles = StyleSheet.create({
  image: { borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: '#FFF9F7', backgroundColor: '#FFF9F5' },
  addPhoto: { position: 'absolute', right: 11, bottom: 12 },
  label: { color: '#967784', fontSize: 14 },
  category: { flexDirection: 'row', alignItems: 'center', minHeight: 45, gap: 11, backgroundColor: '#FFF9F7', borderRadius: 17, paddingHorizontal: 14, borderWidth: 1, borderColor: '#F1E3E1' },
  success: { minHeight: 470, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 12 },
});
