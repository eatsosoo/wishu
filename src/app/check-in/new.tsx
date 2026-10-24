import { useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppScreen } from '../../components/AppScreen';
import { PhotoView } from '../../components/Artwork';
import { Body, PrimaryButton, SecondaryButton } from '../../components/ui';
import { CheckInCamera } from '../../components/CheckInCamera';
import { localToday, useCheckInDraft } from '../../features/check-in/draft';
import { useWishStore } from '../../hooks/use-wish-store';
import { formatDate } from '../../features/wishes/format';
import type { CheckIn, Photo } from '../../types/domain';

export default function CheckInPhoto() {
  const store = useWishStore();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const existing = store.checkIns.find(item => item.id === edit);
  const { setDraft } = useCheckInDraft();
  const [id] = useState(() => existing?.id ?? `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const [replace, setReplace] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const continueLock = useRef(false);
  const startedDraft = useRef(false);

  function confirmPhoto(photo: Photo, templateId: CheckIn['templateId'] = 'single') {
    if (continueLock.current) return;
    continueLock.current = true;
    const returningToDraft = startedDraft.current;
    startedDraft.current = true;
    setDraft(current => returningToDraft && current?.id === id ? { ...current, photo, templateId } : {
      id, edit, photo, templateId, title: existing?.title ?? '', note: existing?.note ?? '',
      companion: existing?.companion ?? store.partnerName,
      date: formatDate(existing?.visitedAt ?? localToday()),
      point: existing ? { latitude: existing.latitude, longitude: existing.longitude } : undefined,
    });
    router.push('/check-in/details');
    requestAnimationFrame(() => { continueLock.current = false; });
  }
  if (edit && (!existing || existing.createdBy !== store.actor)) return <AppScreen header={{ title: 'Check-in' }}><Body>Bạn chỉ có thể sửa check-in của mình.</Body></AppScreen>;
  return <AppScreen scrollEnabled={!editingPhoto} header={{ title: existing ? 'Chọn ảnh kỷ niệm' : 'Khoảnh khắc mới' }}>
    {existing && !replace ? <View style={{ gap: 16 }}>
      <PhotoView photo={existing.photo} style={{ width: '100%', aspectRatio: 1, borderRadius: 24 }} />
      <SecondaryButton onPress={() => setReplace(true)}>{store.canUsePhotoTemplates ? 'Chụp / ghép ảnh mới' : 'Chụp / chọn ảnh mới'}</SecondaryButton>
      <PrimaryButton onPress={() => confirmPhoto(existing.photo, existing.templateId)}>Dùng ảnh này · Tiếp tục</PrimaryButton>
    </View> : <CheckInCamera editingPhoto={editingPhoto} onConfirm={confirmPhoto} onPhotoInteractionChange={setEditingPhoto} />}
  </AppScreen>;
}
