import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, Crop, ImagePlus, Search } from 'lucide-react-native';
import { AppScreen } from '../../components/AppScreen';
import { AppInput, AppTextarea, Body, IconButton, PrimaryButton, SecondaryButton } from '../../components/ui';
import { DateField } from '../../components/DateField';
import { CheckInMap } from '../../components/CheckInMap';
import { SquarePhotoCropper } from '../../components/SquarePhotoCropper';
import { centeredSquare, type SquareCropSelection } from '../../features/photos/square-crop';
import { optimizePickedPhoto } from '../../services/optimize-photo';
import { useAppTheme } from '../../hooks/use-app-theme';
import { useWishStore } from '../../hooks/use-wish-store';
import { formatDate, parseDate } from '../../features/wishes/format';
import type { Coordinate } from '../../features/check-in/map-types';
import type { Photo } from '../../types/domain';

const geocodingKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;
type Place = Coordinate & { name: string };
function today() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
export default function NewCheckIn() {
  const store = useWishStore();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const existing = store.checkIns.find(item => item.id === edit);
  const { colors } = useAppTheme();
  const [id] = useState(() => existing?.id ?? `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const [point, setPoint] = useState<Coordinate | undefined>(existing ? { latitude: existing.latitude, longitude: existing.longitude } : undefined);
  const [focus, setFocus] = useState<(Coordinate & { key: string }) | undefined>(existing ? { ...existing, key: existing.id } : undefined);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [companion, setCompanion] = useState(existing?.companion ?? store.partnerName);
  const [date, setDate] = useState(formatDate(existing?.visitedAt ?? today()));
  const [photo, setPhoto] = useState<Photo | undefined>(existing?.photo);
  const [photoSource, setPhotoSource] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [cropSelection, setCropSelection] = useState(centeredSquare);
  const [editingCrop, setEditingCrop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const photoPickerLock = useRef(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const searchController = useRef<AbortController | null>(null);
  const saveLock = useRef(false);
  const config = useMemo(() => ({ colors, items: [], picking: !busy, selected: point, focus }), [colors, busy, point, focus]);
  function choose(next: Coordinate) { setPoint(next); setError(''); }
  async function locate() {
    if (locating || busy) return;
    setLocating(true); setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Chưa được cấp quyền vị trí. Bạn vẫn có thể chạm bản đồ để chọn nơi đã đến.');
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      choose(next); setFocus({ ...next, key: String(Date.now()) });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa lấy được vị trí. Bạn chạm bản đồ để chọn nhé.'); }
    finally { setLocating(false); }
  }
  async function pickPhoto(source: 'library' | 'camera' = 'library') {
    if (photoPickerLock.current || busy || editingCrop) return;
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
    } finally { setProcessing(false); }
  }
  async function search() {
    if (!geocodingKey || query.trim().length < 2 || busy) return;
    searchController.current?.abort();
    const controller = new AbortController(); searchController.current = controller;
    setSearching(true); setError('');
    try {
      const response = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query.trim())}&lang=vi&limit=5&format=json&apiKey=${encodeURIComponent(geocodingKey)}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Chưa tìm được địa điểm. Bạn chọn trực tiếp trên bản đồ nhé.');
      const body = await response.json();
      const results: Place[] = (body.results ?? []).filter((p: { lat: number; lon: number }) => Number.isFinite(p.lat) && Number.isFinite(p.lon)).map((p: { lat: number; lon: number; formatted: string }) => ({ latitude: p.lat, longitude: p.lon, name: p.formatted }));
      if (searchController.current !== controller) return;
      setPlaces(results); if (!results.length) setError('Không thấy địa điểm phù hợp. Bạn thử tên khác hoặc chọn trên bản đồ.');
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tìm được địa điểm.'); }
    finally { if (searchController.current === controller) setSearching(false); }
  }
  async function save() {
    if (saveLock.current || photoPickerLock.current || processing || locating || editingCrop) return;
    const visitedAt = parseDate(date);
    if (!point || !title.trim() || !photo || !visitedAt) { setError('Bạn chọn vị trí, thêm ảnh, tên địa điểm và ngày đến trước nhé.'); return; }
    if (visitedAt > today()) { setError('Ngày check-in cần là hôm nay hoặc một ngày đã qua.'); return; }
    saveLock.current = true; setBusy(true); setError('');
    try {
      const saved = await store.saveCheckIn({ id, ...point, title: title.trim(), note: note.trim(), companion: companion.trim(), visitedAt, photo });
      if (saved) router.replace({ pathname: '/check-in/[id]', params: { id, saved: 'yes' } });
      else setError('Chưa lưu được check-in. Ảnh và lời nhắn vẫn ở đây, bạn thử lưu lại nhé.');
    } finally { saveLock.current = false; setBusy(false); }
  }
  if (edit && (!existing || existing.createdBy !== store.actor)) return <AppScreen header={{ title: 'Check-in' }}><Body>Bạn chỉ có thể sửa check-in của mình.</Body></AppScreen>;
  return <AppScreen header={{ title: existing ? 'Sửa kỷ niệm' : 'Thêm check-in' }}>
    <View style={{ gap: 16 }}>
      <Body style={{ color: colors.muted }}>Một nơi đã đến, một khoảnh khắc của hai đứa ♡</Body>
      {geocodingKey ? <View style={{ gap: 8 }}><AppInput label="Tìm địa điểm" value={query} onChangeText={value => { searchController.current?.abort(); setQuery(value); setPlaces([]); }} onSubmitEditing={search} trailing={<IconButton icon={Search} label="Tìm địa điểm" onPress={search} />} />{searching ? <Body>Đang tìm địa điểm…</Body> : null}{places.map((place, index) => <Pressable key={`${place.latitude}-${place.longitude}-${index}`} accessibilityRole="button" disabled={busy} onPress={() => { choose(place); setFocus({ ...place, key: String(Date.now()) }); setTitle(place.name.slice(0, 100)); setPlaces([]); }} style={{ padding: 12, borderRadius: 14, backgroundColor: colors.surface }}><Body>{place.name}</Body></Pressable>)}<Body style={{ fontSize: 11, color: colors.muted }}>Tìm kiếm được cung cấp bởi Geoapify</Body></View> : null}
      <SecondaryButton onPress={locate}>{locating ? 'Đang lấy vị trí…' : 'Dùng vị trí hiện tại'}</SecondaryButton>
      <View style={{ height: 300, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}><CheckInMap config={config} onPick={choose} /></View>
      <Body style={{ fontSize: 12, color: colors.muted }}>{point ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)} · kéo ghim để chỉnh vị trí` : 'Chạm bản đồ để chọn nơi đã đến. Bạn có thể phóng to trước khi chọn.'}</Body>
      <AppInput label="Tên địa điểm *" placeholder="Ví dụ: Hồ Xuân Hương, Đà Lạt" maxLength={100} value={title} onChangeText={setTitle} editable={!busy} />
      <Pressable accessibilityRole="button" accessibilityLabel={photo ? 'Đổi ảnh check-in' : 'Chọn ảnh check-in'} disabled={busy || processing} onPress={() => pickPhoto()} style={{ width: '100%', aspectRatio: 1, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {photo && 'uri' in photo ? <><Image source={{ uri: photo.uri }} contentFit="cover" style={{ width: '100%', height: '100%' }} /><View style={{ position: 'absolute', bottom: 12, backgroundColor: colors.surface, padding: 8, borderRadius: 15 }}><Body style={{ color: colors.primary }}>Chạm để đổi ảnh</Body></View></> : <><Camera size={30} color={colors.primary} /><Body style={{ color: colors.primary }}>{processing ? 'Đang tối ưu ảnh…' : 'Thêm ảnh check-in *'}</Body></>}
      </Pressable>
      {photoSource ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Body style={{ flex: 1, color: colors.muted, fontSize: 12 }}>Ảnh vuông 1:1 · chỉnh vùng ảnh bằng nút bên cạnh</Body><IconButton icon={Crop} label="Chỉnh vùng cắt ảnh check-in" onPress={() => { if (!busy && !processing) setEditingCrop(true); }} /></View> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {(['camera', 'library'] as const).map(source => {
          const Icon = source === 'camera' ? Camera : ImagePlus;
          const label = source === 'camera' ? 'Chụp ảnh' : 'Thư viện';
          return <Pressable key={source} accessibilityRole="button" accessibilityLabel={source === 'camera' ? 'Chụp ảnh check-in' : 'Chọn ảnh từ thư viện'} accessibilityState={{ disabled: busy || processing }} disabled={busy || processing} onPress={() => pickPhoto(source)} style={{ flex: 1, minHeight: 48, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy || processing ? 0.5 : 1 }}><Icon size={19} color={colors.primary} /><Body style={{ color: colors.primary }}>{label}</Body></Pressable>;
        })}
      </View>
      {cameraBlocked ? <SecondaryButton onPress={() => { void Linking.openSettings().catch(() => setError('Chưa mở được cài đặt. Bạn mở cài đặt của thiết bị để cấp quyền camera nhé.')); }}>Mở cài đặt camera</SecondaryButton> : null}
      <DateField label="Ngày đã đến" value={date} onChange={value => { if (!busy) setDate(value); }} />
      <AppInput label="Đi cùng" value={companion} onChangeText={setCompanion} maxLength={100} editable={!busy} />
      <AppTextarea label="Lời nhắn" placeholder="Điều bạn muốn nhớ về nơi này…" value={note} onChangeText={setNote} maxLength={2000} editable={!busy} />
      <Body style={{ fontSize: 12, color: colors.muted }}>Kỷ niệm chỉ hiển thị trong không gian của hai người.</Body>
      {error ? <Body accessibilityRole="alert" style={{ color: colors.primary }}>{error}</Body> : null}
      <PrimaryButton onPress={save} disabled={busy || processing || locating || editingCrop}>{busy ? 'Đang lưu kỷ niệm…' : 'Lưu kỷ niệm'}</PrimaryButton>
    </View>
    {editingCrop && photoSource ? <SquarePhotoCropper source={photoSource} initialSelection={cropSelection} onCancel={() => setEditingCrop(false)} onApply={applyCrop} /> : null}
  </AppScreen>;
}
