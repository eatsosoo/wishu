import { useAppTheme } from '../../../hooks/use-app-theme';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, Crop, Plus, X } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { AppScreen } from '../../../components/AppScreen';
import { PhotoView, ClayObject } from '../../../components/Artwork';
import { AppTextarea, Body, EmptyState, Heading, IconButton, PrimaryButton } from '../../../components/ui';
import { useWishStore } from '../../../hooks/use-wish-store';
import { DateField } from '../../../components/DateField';
import { parseDate } from '../../../features/wishes/format';
import type { Photo } from '../../../types/domain';
import { optimizePickedPhoto } from '../../../services/optimize-photo';
import { PHOTO_LIMITS } from '../../../features/photos/limits';
import { centeredSquare, type SquareCropSelection } from '../../../features/photos/square-crop';
import { SquarePhotoCropper } from '../../../components/SquarePhotoCropper';

type MemoryPhotoDraft = { id: string; source: ImagePicker.ImagePickerAsset; photo: Photo; selection: SquareCropSelection };

export default function CompleteWish() {
  const { colors, t } = useAppTheme();

  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useWishStore();
  const wish = store.wishes.find(item => item.id === id);
  const preparation = store.preparations.find(item => item.wishId === id && item.status === 'preparing');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  });
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<MemoryPhotoDraft[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingPhoto = photos.find(photo => photo.id === editingId);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const saving = useRef(false);

  if (!wish || !preparation) return <AppScreen><EmptyState title="Mình chọn một điều đang chuẩn bị nhé" description="Chỉ bạn mới có thể hoàn thành bất ngờ mình đang chuẩn bị." action="Đang chuẩn bị" onAction={() => router.replace('/preparing')} /></AppScreen>;
  async function addPhotos() {
    if (processingPhotos || busy || photos.length >= PHOTO_LIMITS.memoryCount) return;
    setProcessingPhotos(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: PHOTO_LIMITS.memoryCount - photos.length, quality: 1 });
      if (!result.canceled) {
        if (result.assets.length > PHOTO_LIMITS.memoryCount - photos.length) throw new Error('Mỗi kỷ niệm có tối đa 8 ảnh.');
        const optimized: MemoryPhotoDraft[] = [];
        for (const asset of result.assets) optimized.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          source: asset,
          photo: await optimizePickedPhoto(asset, centeredSquare),
          selection: centeredSquare,
        });
        setPhotos(previous => [...previous, ...optimized].slice(0, PHOTO_LIMITS.memoryCount));
        setError('');
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Chưa xử lý được ảnh. Bạn thử lại nhé.'); }
    finally { setProcessingPhotos(false); }
  }
  async function applyCrop(selection: SquareCropSelection) {
    if (!editingPhoto) return;
    const photo = await optimizePickedPhoto(editingPhoto.source, selection);
    setPhotos(previous => previous.map(item => item.id === editingPhoto.id ? { ...item, photo, selection } : item));
    setEditingId(null);
  }
  async function save() {
    if (saving.current || processingPhotos || editingId !== null) return;
    const completedAt = parseDate(date);
    if (!completedAt) { setError('Nhập ngày hoàn thành hợp lệ nhé.'); return; }
    saving.current = true; setBusy(true); setError('');
    const success = await store.completeWish({ wishId: id, completedAt, note: note.trim(), photos: photos.map(item => item.photo) });
    saving.current = false; setBusy(false);
    if (success) router.replace({ pathname: '/memories', params: { giftCreated: 'yes' } });
    else setError('Chưa lưu và tạo thông báo được. Bạn thử lại nhé.');
  }
  return <AppScreen>
    <View><ClayObject name="openGift" width={275} height={157} style={{ alignSelf: 'center' }} /><View style={{ position: 'absolute', top: 0, left: 0 }}><IconButton icon={ChevronLeft} label="Quay lại" onPress={() => router.canGoBack() ? router.back() : router.replace('/preparing')} /></View></View>
    <Heading style={{ color: t('#251D23'), textAlign: 'center', marginTop: 14, fontSize: 26 }}>Hoàn thành điều ước</Heading><Body style={{ textAlign: 'center', color: t('#915365'), marginTop: 8 }}>Đánh dấu khoảnh khắc đặc biệt này{ '\n' }cùng một vài kỷ niệm nhé ♡</Body>
    <View style={{ marginTop: 25, gap: 17 }}>
      <DateField label="Ngày hoàn thành" value={date} onChange={setDate} />
      <View style={{ gap: 9 }}><Body style={{ color: t('#915365') }}>Thêm ảnh kỷ niệm</Body><View className="flex-row flex-wrap" style={{ gap: 9 }}>
        {photos.map((item, index) => <View key={item.id} style={{ width: 75, height: 75 }}><PhotoView photo={item.photo} width={75} height={75} style={{ borderRadius: 14 }} /><Pressable accessibilityRole="button" accessibilityLabel={`Bỏ ảnh ${index + 1}`} disabled={busy || processingPhotos} hitSlop={4} onPress={() => setPhotos(previous => previous.filter(photo => photo.id !== item.id))} style={{ position: 'absolute', top: 3, right: 3, backgroundColor: t('rgba(255,249,246,0.82)'), borderRadius: 999, padding: 2 }}><X size={13} color={colors.primary} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Chỉnh vùng cắt ảnh ${index + 1}`} disabled={busy || processingPhotos} hitSlop={5} onPress={() => setEditingId(item.id)} style={{ position: 'absolute', bottom: 3, right: 3, width: 26, height: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: t('rgba(255,249,246,0.94)'), borderRadius: 13 }}><Crop size={15} color={colors.primary} /></Pressable></View>)}
        {photos.length < 8 && <Pressable accessibilityRole="button" accessibilityLabel="Thêm ảnh kỷ niệm" onPress={addPhotos} style={{ width: 75, height: 75, borderRadius: 14, backgroundColor: t('#F2DEDC'), alignItems: 'center', justifyContent: 'center' }}><Plus size={24} color={t("#AF8792")} strokeWidth={1.5} /></Pressable>}
      </View></View>
      <Body accessibilityLiveRegion="polite" style={{ fontSize: 12, color: colors.muted }}>{processingPhotos ? 'Đang tối ưu ảnh…' : `${photos.length}/8 ảnh · cắt vuông từ giữa · chạm icon để chỉnh vùng ảnh`}</Body>
      <AppTextarea label="Chia sẻ cảm xúc (tùy chọn)" value={note} onChangeText={setNote} maxLength={2000} />
      {!!error && <Body accessibilityRole="alert" style={{ color: colors.primary }}>{error}</Body>}
      {!!store.storageError && <Body accessibilityRole="alert" style={{ color: colors.primary }}>{store.storageError}</Body>}
      <PrimaryButton disabled={busy || processingPhotos} onPress={() => void save()}>{busy ? 'Đang lưu và tạo bất ngờ…' : processingPhotos ? 'Đang tối ưu ảnh…' : 'Hoàn thành & gửi bất ngờ 🎁'}</PrimaryButton>
    </View>
    {editingPhoto && <SquarePhotoCropper key={editingPhoto.id} source={editingPhoto.source} initialSelection={editingPhoto.selection} onCancel={() => setEditingId(null)} onApply={applyCrop} />}
  </AppScreen>;
}
