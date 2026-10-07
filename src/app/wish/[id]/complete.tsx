import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CalendarDays, ChevronLeft, Plus, X } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { AppScreen } from '../../../components/AppScreen';
import { PhotoView, ClayObject } from '../../../components/Artwork';
import { AppInput, AppTextarea, Body, EmptyState, Heading, IconButton, PrimaryButton } from '../../../components/ui';
import { colors } from '../../../constants/theme';
import { useWishStore } from '../../../hooks/use-wish-store';
import { parseDate } from '../../../features/wishes/format';
import type { Photo } from '../../../types/domain';

export default function CompleteWish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useWishStore();
  const wish = store.wishes.find(item => item.id === id);
  const preparation = store.preparations.find(item => item.wishId === id && item.status === 'preparing');
  const [date, setDate] = useState('20/10/2024');
  const [note, setNote] = useState('Anh tặng mình vào sinh nhật 26 tuổi.\nYêu lắm ♡');
  const [photos, setPhotos] = useState<Photo[]>([{ art: 'memoryOne' }, { art: 'memoryTwo' }, { art: 'memoryThree' }]);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');
  if (!wish || !preparation) return <AppScreen><EmptyState title="Mình chọn một điều đang chuẩn bị nhé" description="Chỉ bạn mới có thể hoàn thành bất ngờ mình đang chuẩn bị." action="Đang chuẩn bị" onAction={() => router.replace('/preparing')} /></AppScreen>;
  async function addPhotos() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: Math.max(1, 8 - photos.length), quality: 0.8 });
      if (!result.canceled) setPhotos(previous => [...previous, ...result.assets.map(asset => ({ uri: asset.uri }))].slice(0, 8));
    } catch { setError('Chưa chọn được ảnh. Bạn thử lại nhé.'); }
  }
  function save() {
    const completedAt = parseDate(date);
    if (!completedAt) { setDateError('Nhập ngày theo dạng DD/MM/YYYY.'); return; }
    setDateError('');
    store.completeWish({ wishId: id, completedAt, note: note.trim(), photos });
    router.replace('/memories');
  }
  return <AppScreen>
    <View><ClayObject name="openGift" width={275} height={157} style={{ alignSelf: 'center' }} /><View style={{ position: 'absolute', top: 0, left: 0 }}><IconButton icon={ChevronLeft} label="Quay lại" onPress={() => router.canGoBack() ? router.back() : router.replace('/preparing')} /></View></View>
    <Heading style={{ color: '#251D23', textAlign: 'center', marginTop: 14, fontSize: 26 }}>Hoàn thành điều ước</Heading><Body style={{ textAlign: 'center', color: '#915365', marginTop: 8 }}>Đánh dấu khoảnh khắc đặc biệt này{ '\n' }cùng một vài kỷ niệm nhé ♡</Body>
    <View style={{ marginTop: 25, gap: 17 }}>
      <AppInput label="Ngày hoàn thành" value={date} onChangeText={setDate} error={dateError} placeholder="DD/MM/YYYY" trailing={<CalendarDays size={19} color={colors.primary} />} />
      <View style={{ gap: 9 }}><Body style={{ color: '#915365' }}>Thêm ảnh kỷ niệm</Body><View className="flex-row flex-wrap" style={{ gap: 9 }}>
        {photos.map((photo, index) => <View key={index} style={{ width: 75, height: 75 }}><PhotoView photo={photo} width={75} height={75} style={{ borderRadius: 14 }} /><Pressable accessibilityRole="button" accessibilityLabel={`Bỏ ảnh ${index + 1}`} hitSlop={4} onPress={() => setPhotos(previous => previous.filter((_, i) => i !== index))} style={{ position: 'absolute', top: 3, right: 3, backgroundColor: 'rgba(255,249,246,0.82)', borderRadius: 999, padding: 2 }}><X size={13} color={colors.primary} /></Pressable></View>)}
        {photos.length < 8 && <Pressable accessibilityRole="button" accessibilityLabel="Thêm ảnh kỷ niệm" onPress={addPhotos} style={{ width: 75, height: 75, borderRadius: 14, backgroundColor: '#F2DEDC', alignItems: 'center', justifyContent: 'center' }}><Plus size={24} color="#AF8792" strokeWidth={1.5} /></Pressable>}
      </View></View>
      <AppTextarea label="Chia sẻ cảm xúc (tùy chọn)" value={note} onChangeText={setNote} maxLength={2000} />
      {!!error && <Body accessibilityRole="alert" style={{ color: colors.primary }}>{error}</Body>}
      <PrimaryButton onPress={save}>Lưu vào kỷ niệm ♡</PrimaryButton>
    </View>
  </AppScreen>;
}
