import { useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { PhotoView } from '../../components/Artwork';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, Crop, ImagePlus } from 'lucide-react-native';
import { AppScreen } from '../../components/AppScreen';
import { Body, Heading, IconButton, PrimaryButton, SecondaryButton } from '../../components/ui';
import { SquarePhotoCropper } from '../../components/SquarePhotoCropper';
import { centeredSquare, type SquareCropSelection } from '../../features/photos/square-crop';
import { localToday, useCheckInDraft } from '../../features/check-in/draft';
import { optimizePickedPhoto } from '../../services/optimize-photo';
import { useAppTheme } from '../../hooks/use-app-theme';
import { useWishStore } from '../../hooks/use-wish-store';
import { formatDate } from '../../features/wishes/format';
import type { Photo } from '../../types/domain';

export default function CheckInPhoto() {
  const store = useWishStore();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const existing = store.checkIns.find(item => item.id === edit);
  const { colors } = useAppTheme();
  const { setDraft } = useCheckInDraft();
  const [id] = useState(() => existing?.id ?? `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const [photo, setPhoto] = useState<Photo | undefined>(existing?.photo);
  const [photoSource, setPhotoSource] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [cropSelection, setCropSelection] = useState(centeredSquare);
  const [editingCrop, setEditingCrop] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [error, setError] = useState('');
  const photoPickerLock = useRef(false);
  const continueLock = useRef(false);
  const startedDraft = useRef(false);
  async function pickPhoto(source: 'library' | 'camera' = 'library') {
    if (photoPickerLock.current || editingCrop) return;
    // Web pickers may not report cancellation; keep them available for another tap.
    if (Platform.OS !== 'web') photoPickerLock.current = true;
    setError(''); setCameraBlocked(false);
    try {
      // On web, launch directly from the tap so the browser can open its capture picker.
      if (source === 'camera' && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setCameraBlocked(!permission.canAskAgain);
          setError('Chưa được cấp quyền camera. Bạn có thể cho phép trong cài đặt hoặc chọn ảnh từ thư viện.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      photoPickerLock.current = true;
      setProcessing(true);
      const asset = result.assets[0];
      setPhoto(await optimizePickedPhoto(asset, centeredSquare));
      setPhotoSource(asset);
      setCropSelection(centeredSquare);
    } catch (cause) { setError(cause instanceof Error ? cause.message : source === 'camera' ? 'Chưa chụp được ảnh. Bạn kiểm tra camera hoặc chọn ảnh từ thư viện nhé.' : 'Chưa chọn được ảnh. Bạn thử lại nhé.'); }
    finally { photoPickerLock.current = false; setProcessing(false); }
  }
  async function applyCrop(selection: SquareCropSelection) {
    if (!photoSource) return;
    setProcessing(true);
    try {
      const cropped = await optimizePickedPhoto(photoSource, selection);
      setPhoto(cropped);
      setCropSelection(selection);
      setEditingCrop(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa chỉnh được ảnh. Bạn thử lại nhé.'); }
    finally { setProcessing(false); }
  }

  function confirmPhoto() {
    if (!photo || processing || editingCrop || photoPickerLock.current || continueLock.current) return;
    continueLock.current = true;
    const returningToDraft = startedDraft.current;
    startedDraft.current = true;
    setDraft(current => returningToDraft && current?.id === id ? { ...current, photo } : {
      id, edit, photo, title: existing?.title ?? '', note: existing?.note ?? '',
      companion: existing?.companion ?? store.partnerName,
      date: formatDate(existing?.visitedAt ?? localToday()),
      point: existing ? { latitude: existing.latitude, longitude: existing.longitude } : undefined,
    });
    router.push('/check-in/details');
    // The source screen stays mounted so returning preserves the crop and chosen photo.
    requestAnimationFrame(() => { continueLock.current = false; });
  }
  if (edit && (!existing || existing.createdBy !== store.actor)) return <AppScreen header={{ title: 'Check-in' }}><Body>Bạn chỉ có thể sửa check-in của mình.</Body></AppScreen>;
  return <AppScreen header={{ title: existing ? 'Chọn ảnh kỷ niệm' : 'Khoảnh khắc mới' }}>
    <View style={{ gap: 16 }}>
      <Heading style={{ fontSize: 25 }}>Bắt đầu từ một tấm ảnh</Heading>
      <Pressable accessibilityRole="button" accessibilityLabel={photo ? 'Đổi ảnh check-in' : 'Chọn ảnh check-in'} disabled={processing} onPress={() => pickPhoto()} style={{ width: '100%', aspectRatio: 1, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {photo && 'uri' in photo ? <><PhotoView photo={photo} style={{ width: '100%', height: '100%' }} /><View style={{ position: 'absolute', bottom: 12, backgroundColor: colors.surface, padding: 8, borderRadius: 15 }}><Body style={{ color: colors.primary }}>Chạm để đổi ảnh</Body></View></> : <><Camera size={30} color={colors.primary} /><Body style={{ color: colors.primary }}>{processing ? 'Đang tối ưu ảnh…' : 'Chọn một khoảnh khắc' }</Body></>}
      </Pressable>
      {photoSource ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Body style={{ flex: 1, color: colors.muted, fontSize: 12 }}>Ảnh vuông 1:1 · chỉnh vùng ảnh bằng nút bên cạnh</Body><IconButton icon={Crop} label="Chỉnh vùng cắt ảnh check-in" onPress={() => { if (!processing) setEditingCrop(true); }} /></View> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {(['camera', 'library'] as const).map(source => {
          const Icon = source === 'camera' ? Camera : ImagePlus;
          const label = source === 'camera' ? 'Chụp ảnh' : 'Thư viện';
          return <Pressable key={source} accessibilityRole="button" accessibilityLabel={source === 'camera' ? 'Chụp ảnh check-in' : 'Chọn ảnh từ thư viện'} accessibilityState={{ disabled: processing }} disabled={processing} onPress={() => pickPhoto(source)} style={{ flex: 1, minHeight: 48, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: processing ? 0.5 : 1 }}><Icon size={19} color={colors.primary} /><Body style={{ color: colors.primary }}>{label}</Body></Pressable>;
        })}
      </View>
      {cameraBlocked ? <SecondaryButton onPress={() => { void Linking.openSettings().catch(() => setError('Chưa mở được cài đặt. Bạn mở cài đặt của thiết bị để cấp quyền camera nhé.')); }}>Mở cài đặt camera</SecondaryButton> : null}

      {error ? <Body accessibilityRole="alert" style={{ color: colors.primary }}>{error}</Body> : null}
      <PrimaryButton onPress={confirmPhoto} disabled={!photo || processing || editingCrop}>{processing ? 'Đang tối ưu ảnh…' : 'Dùng ảnh này · Tiếp tục'}</PrimaryButton>
      <Body style={{ textAlign: 'center', color: colors.muted, fontSize: 12 }}>Tiếp theo: câu chuyện, ngày và nơi đã đến ♡</Body>
    </View>
    {editingCrop && photoSource ? <SquarePhotoCropper source={photoSource} initialSelection={cropSelection} onCancel={() => setEditingCrop(false)} onApply={applyCrop} /> : null}
  </AppScreen>;
}
