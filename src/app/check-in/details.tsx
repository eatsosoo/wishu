import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { Search } from 'lucide-react-native';
import { AppScreen } from '../../components/AppScreen';
import { PhotoView } from '../../components/Artwork';
import { AppInput, AppTextarea, Body, IconButton, PrimaryButton } from '../../components/ui';
import { DateField } from '../../components/DateField';
import { CheckInMap } from '../../components/CheckInMap';
import { LocateHeartButton } from '../../components/LocateHeartButton';
import { localToday, useCheckInDraft, type CheckInDraft } from '../../features/check-in/draft';
import { useAppTheme } from '../../hooks/use-app-theme';
import { useWishStore } from '../../hooks/use-wish-store';
import { parseDate } from '../../features/wishes/format';
import type { Coordinate } from '../../features/check-in/map-types';

const geocodingKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;
type Place = Coordinate & { name: string };

export default function CheckInDetails() {
  const { draft } = useCheckInDraft();
  useEffect(() => { if (!draft?.photo) router.replace('/check-in/new'); }, [draft?.photo]);
  return draft?.photo ? <DetailsEditor key={draft.id} draft={draft} /> : null;
}
function DetailsEditor({ draft }: { draft: CheckInDraft }) {
  const store = useWishStore();
  const { colors } = useAppTheme();
  const { setDraft } = useCheckInDraft();
  const { id, edit, title, note, companion, date, photo, point } = draft;
  const existing = store.checkIns.find(item => item.id === edit);
  function update<K extends keyof CheckInDraft>(key: K, value: CheckInDraft[K]) { setDraft(current => current?.id === id ? { ...current, [key]: value } : current); }
  const setTitle = (value: string) => update('title', value);
  const setNote = (value: string) => update('note', value);
  const setCompanion = (value: string) => update('companion', value);
  const setDate = (value: string) => update('date', value);
  const [focus, setFocus] = useState<(Coordinate & { key: string }) | undefined>(point ? { ...point, key: id } : undefined);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const searchController = useRef<AbortController | null>(null);
  const saveLock = useRef(false);
  const locationRequest = useRef<symbol | null>(null);
  useEffect(() => () => { searchController.current?.abort(); }, []);
  const config = useMemo(() => ({ colors, items: [], picking: !busy, selected: point, focus }), [colors, busy, point, focus]);
  function choose(next: Coordinate) {
    // A manual pin takes priority over an unfinished GPS request.
    locationRequest.current = null;
    setLocating(false);
    update('point', next); setError('');
  }
  const locate = useCallback(async () => {
    if (locationRequest.current || saveLock.current) return;
    const request = Symbol('location');
    locationRequest.current = request;
    setLocating(true); setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (locationRequest.current !== request) return;
      if (permission.status !== 'granted') throw new Error('Chưa được cấp quyền vị trí. Bạn vẫn có thể chạm bản đồ để chọn nơi đã đến.');
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (locationRequest.current !== request) return;
      const next = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      setDraft(current => current?.id === id ? { ...current, point: next } : current);
      setFocus({ ...next, key: String(Date.now()) });
    } catch (cause) {
      if (locationRequest.current === request) setError(cause instanceof Error ? cause.message : 'Chưa lấy được vị trí. Bạn chạm bản đồ để chọn nhé.');
    } finally {
      if (locationRequest.current === request) { locationRequest.current = null; setLocating(false); }
    }
  }, [id, setDraft]);
  useFocusEffect(useCallback(() => {
    // Keep saved or manually chosen coordinates when editing or changing the photo.
    if (!edit && !point) void locate();
    return () => { locationRequest.current = null; setLocating(false); };
  }, [edit, point, locate]));
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
    if (saveLock.current || locating) return;
    const visitedAt = parseDate(date);
    if (!point || !title.trim() || !photo || !visitedAt) { setError('Bạn chọn vị trí, thêm ảnh, tên địa điểm và ngày đến trước nhé.'); return; }
    if (visitedAt > localToday()) { setError('Ngày check-in cần là hôm nay hoặc một ngày đã qua.'); return; }
    saveLock.current = true; setBusy(true); setError('');
    try {
      const saved = await store.saveCheckIn({ id, ...point, title: title.trim(), note: note.trim(), companion: companion.trim(), visitedAt, photo });
      if (saved) router.replace({ pathname: '/check-in/[id]', params: { id, saved: 'yes' } });
      else setError('Chưa lưu được check-in. Ảnh và lời nhắn vẫn ở đây, bạn thử lưu lại nhé.');
    } finally { saveLock.current = false; setBusy(false); }
  }

  if (edit && (!existing || existing.createdBy !== store.actor)) return <AppScreen header={{ title: 'Check-in' }}><Body>Bạn chỉ có thể sửa check-in của mình.</Body></AppScreen>;
  return <AppScreen header={{ title: existing ? 'Sửa kỷ niệm' : 'Câu chuyện của tấm ảnh' }}>
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 22, backgroundColor: colors.surface }}>
        {photo && <PhotoView variant="thumbnail" photo={photo} width={76} height={76} style={{ borderRadius: 16 }} />}
        <View style={{ flex: 1, gap: 4 }}><Body>Đã chọn ảnh kỷ niệm ♡</Body><Pressable accessibilityRole="button" accessibilityLabel="Quay lại chọn ảnh" disabled={busy} onPress={() => router.back()} style={{ minHeight: 44, justifyContent: 'center' }}><Body style={{ color: colors.primary }}>Đổi ảnh</Body></Pressable></View>
      </View>
      {geocodingKey ? <View style={{ gap: 8 }}><AppInput label="Tìm địa điểm" value={query} onChangeText={value => { searchController.current?.abort(); setQuery(value); setPlaces([]); }} onSubmitEditing={search} trailing={<IconButton icon={Search} label="Tìm địa điểm" onPress={search} />} />{searching ? <Body>Đang tìm địa điểm…</Body> : null}{places.map((place, index) => <Pressable key={`${place.latitude}-${place.longitude}-${index}`} accessibilityRole="button" disabled={busy} onPress={() => { choose(place); setFocus({ ...place, key: String(Date.now()) }); setTitle(place.name.slice(0, 100)); setPlaces([]); }} style={{ padding: 12, borderRadius: 14, backgroundColor: colors.surface }}><Body>{place.name}</Body></Pressable>)}<Body style={{ fontSize: 11, color: colors.muted }}>Tìm kiếm được cung cấp bởi Geoapify</Body></View> : null}
      <View style={{ position: 'relative', height: 300, flexShrink: 0, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
        <View style={StyleSheet.absoluteFill}><CheckInMap config={config} onPick={choose} /></View>
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 12, left: 12, zIndex: 1 }}>
          <LocateHeartButton onPress={() => void locate()} loading={locating} disabled={busy} />
        </View>
      </View>
      <Body style={{ fontSize: 12, color: colors.muted }}>{point ? 'Đã chọn vị trí · kéo ghim để điều chỉnh' : 'Chạm bản đồ để chọn nơi đã đến. Bạn có thể phóng to trước khi chọn.'}</Body>
      <AppInput label="Tên địa điểm *" placeholder="Ví dụ: Hồ Xuân Hương, Đà Lạt" maxLength={100} value={title} onChangeText={setTitle} editable={!busy} />
      <DateField label="Ngày đã đến" value={date} onChange={value => { if (!busy) setDate(value); }} />
      <AppInput label="Đi cùng" value={companion} onChangeText={setCompanion} maxLength={100} editable={!busy} />
      <AppTextarea label="Lời nhắn" placeholder="Điều bạn muốn nhớ về nơi này…" value={note} onChangeText={setNote} maxLength={2000} editable={!busy} />
      <Body style={{ fontSize: 12, color: colors.muted }}>Ảnh sẽ tự hiện trên lịch theo ngày đã đến, chỉ trong không gian của hai người.</Body>
      {error ? <Body accessibilityRole="alert" style={{ color: colors.primary }}>{error}</Body> : null}
      <PrimaryButton loading={busy} onPress={save} disabled={busy || locating}>{busy ? 'Đang lưu kỷ niệm…' : 'Lưu kỷ niệm'}</PrimaryButton>
    </View>
  </AppScreen>;
}
