import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, ScrollView, StyleSheet, View, type ViewInstance } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { Camera, ImagePlus, RefreshCw, X } from 'lucide-react-native';
import { Body, IconButton, PrimaryButton, SecondaryButton } from './ui';
import { TemplatePhoto } from './TemplatePhoto';
import { useAppTheme } from '../hooks/use-app-theme';
import { centeredSquare, type SquareCropSelection } from '../features/photos/square-crop';
import { checkInTemplates, type CheckInTemplate, type PhotoCell } from '../features/check-in/templates';
import { optimizePickedPhoto } from '../services/optimize-photo';
import { composeCheckIn } from '../services/compose-check-in';
import type { Photo } from '../types/domain';

const CAMERA_RADIUS = 24;

function cellCorners(cell: PhotoCell) {
  const left = cell.x === 0, top = cell.y === 0;
  const right = cell.x + cell.width === 1, bottom = cell.y + cell.height === 1;
  return {
    borderTopLeftRadius: top && left ? CAMERA_RADIUS : 0,
    borderTopRightRadius: top && right ? CAMERA_RADIUS : 0,
    borderBottomLeftRadius: bottom && left ? CAMERA_RADIUS : 0,
    borderBottomRightRadius: bottom && right ? CAMERA_RADIUS : 0,
  };
}

type Shot = { uri: string; source: ImagePicker.ImagePickerAsset; crop: SquareCropSelection };

export function CheckInCamera({ onConfirm, onPhotoInteractionChange, editingPhoto }: { editingPhoto: boolean; onConfirm: (photo: Photo) => void; onPhotoInteractionChange: (active: boolean) => void }) {
  const { colors } = useAppTheme();
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();
  const [template, setTemplate] = useState(checkInTemplates[0]);
  const [shots, setShots] = useState<(Shot | undefined)[]>([]);
  const [active, setActive] = useState(0);
  const [facing, setFacing] = useState<CameraType>('back');
  const [ready, setReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [error, setError] = useState('');
  const [pendingTemplate, setPendingTemplate] = useState<CheckInTemplate | null>(null);
  const [loaded, setLoaded] = useState<(string | undefined)[]>([]);
  const camera = useRef<CameraView>(null);
  const attachCamera = useCallback((instance: CameraView | null) => {
    camera.current = instance;
    if (!instance) setReady(false);
  }, []);
  const collage = useRef<ViewInstance>(null);
  const lock = useRef(false);
  const pickerGeneration = useRef(0);
  const alive = useRef(true);
  const visible = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useFocusEffect(useCallback(() => {
    visible.current = true; setFocused(true); setReady(false);
    return () => { visible.current = false; setFocused(false); setReady(false); };
  }, []));
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state === 'active') void refreshPermission().catch(() => {});
    });
    return () => listener.remove();
  }, [refreshPermission]);

  const complete = template.cells.every((_, index) => !!shots[index]);
  const live = !shots[active];
  const showCamera = live && focused && foreground && permission?.granted && !cameraError;
  const allLoaded = template.cells.every((_, index) => !!shots[index] && loaded[index] === shots[index]!.uri);
  const count = template.cells.filter((_, index) => shots[index]).length;
  const activeCell = template.cells[active];

  function changeTemplate(next: CheckInTemplate) {
    if (lock.current) return;
    pickerGeneration.current++;
    const kept = shots.slice(0, next.cells.length);
    setTemplate(next); setShots(kept);
    setActive(Math.max(0, next.cells.findIndex((_, index) => !kept[index])));
    setPendingTemplate(null); setError('');
  }
  function selectSlot(index: number) {
    if (lock.current) return;
    pickerGeneration.current++;
    setActive(index); setError('');
  }
  function removeShot(index: number) {
    if (lock.current) return;
    pickerGeneration.current++;
    setShots(current => current.map((shot, slot) => slot === index ? undefined : shot));
    setLoaded(current => current.map((uri, slot) => slot === index ? undefined : uri));
    setActive(index); setCameraError(''); setError('');
  }
  function chooseTemplate(next: CheckInTemplate) {
    if (next.id === template.id || lock.current) return;
    if (shots.slice(next.cells.length).some(Boolean)) setPendingTemplate(next);
    else changeTemplate(next);
  }
  async function storeShot(source: ImagePicker.ImagePickerAsset, index: number) {
    // Keep the full optimized image so switching templates never crops it twice.
    const photo = await optimizePickedPhoto(source);
    if (!alive.current || !visible.current) return;
    const next = [...shots]; next[index] = { uri: photo.uri, source: { ...source, uri: photo.uri }, crop: centeredSquare };
    // The cropper needs the dimensions of the resized source, not the original file.
    const scale = Math.min(1, 1600 / Math.max(source.width, source.height));
    next[index]!.source.width = Math.max(1, Math.round(source.width * scale));
    next[index]!.source.height = Math.max(1, Math.round(source.height * scale));
    next[index]!.source.file = undefined; next[index]!.source.fileSize = undefined;
    next[index]!.source.mimeType = 'image/jpeg';
    setShots(next);
    const missing = template.cells.findIndex((_, slot) => !next[slot]);
    if (missing >= 0) setActive(missing);
  }
  async function capture() {
    if (lock.current || !ready || !showCamera || !camera.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const shot = await camera.current.takePictureAsync({ quality: 1, ...(Platform.OS === 'web' ? { isImageMirror: facing === 'front', imageType: 'jpg' as const } : {}) });
      if (!shot) throw new Error('Chưa chụp được ảnh. Bạn thử lại nhé.');
      await storeShot({ uri: shot.uri, width: shot.width, height: shot.height, mimeType: 'image/jpeg' }, active);
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Chưa chụp được ảnh. Bạn thử lại nhé.'); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function pickPhoto() {
    if (lock.current) return;
    // Web file choosers may never resolve on cancel; allow another user gesture.
    if (Platform.OS !== 'web') lock.current = true;
    const generation = ++pickerGeneration.current;
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled || !result.assets[0] || !alive.current || !visible.current || generation !== pickerGeneration.current) return;
      if (Platform.OS === 'web' && lock.current) return;
      lock.current = true; setBusy(true);
      await storeShot(result.assets[0], active);
    } catch (cause) { if (alive.current && generation === pickerGeneration.current) setError(cause instanceof Error ? cause.message : 'Chưa chọn được ảnh. Bạn thử lại nhé.'); }
    finally { if (generation === pickerGeneration.current) { lock.current = false; if (alive.current) setBusy(false); } }
  }
  async function enableCamera() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { setCameraError(''); setReady(false); await requestPermission(); }
    catch { setError('Chưa mở được camera. Bạn kiểm tra quyền camera hoặc chọn ảnh từ thư viện nhé.'); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function confirm() {
    if (!complete || !allLoaded || live || lock.current || pendingTemplate || editingPhoto) return;
    lock.current = true; setBusy(true); setError('');
    try {
      // Native captures the visible photo layer; web draws the same selected crops.
      const uris = shots.map(shot => shot!.uri);
      if (Platform.OS === 'web') {
        for (let index = 0; index < template.cells.length; index++) {
          const shot = shots[index]!;
          const cell = template.cells[index];
          uris[index] = (await optimizePickedPhoto(shot.source, shot.crop, cell.width / cell.height)).uri;
        }
      }
      const photo = await composeCheckIn(collage, uris, template);
      if (alive.current && visible.current) onConfirm(photo);
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Chưa ghép được ảnh. Bạn thử lại nhé.'); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  return <View style={{ gap: 14 }}>
    <View style={styles.frame}>
      {/* Export only this photo layer: no camera, labels, borders or controls. */}
      <View ref={collage} collapsable={false} style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]}>
        {template.cells.map((cell, index) => <View key={index} pointerEvents="box-none" style={{ position: 'absolute', left: `${cell.x * 100}%`, top: `${cell.y * 100}%`, width: `${cell.width * 100}%`, height: `${cell.height * 100}%`, overflow: 'hidden', backgroundColor: colors.rose }}>
          {shots[index] ? <TemplatePhoto key={shots[index]!.uri} source={shots[index]!.source} selection={shots[index]!.crop} aspectRatio={cell.width / cell.height} index={index} selected={index === active} disabled={busy}
            onSelect={() => selectSlot(index)} onInteractionChange={onPhotoInteractionChange}
            onChange={crop => { if (!lock.current) setShots(current => current.map((shot, slot) => slot === index && shot ? { ...shot, crop } : shot)); }}
            onLoad={() => { const uri = shots[index]!.uri; setLoaded(current => { const next = [...current]; next[index] = uri; return next; }); }}
            onError={() => setError('Chưa tải được ảnh. Bạn xóa ô ảnh và chọn lại nhé.')} /> : null}
        </View>)}
      </View>
      {/* Keep one camera mounted while moving/resizing its viewport. Reopening the
          stream for each template/empty cell causes a delayed cover fit on web. */}
      {showCamera ? <View pointerEvents="none" style={{ position: 'absolute', left: `${activeCell.x * 100}%`, top: `${activeCell.y * 100}%`, width: `${activeCell.width * 100}%`, height: `${activeCell.height * 100}%`, overflow: 'hidden', backgroundColor: colors.rose }}>
        {!ready ? <View style={styles.placeholder}><Camera size={28} color={colors.primary} /><Body style={{ color: colors.primary, fontSize: 12 }}>Đang mở camera…</Body></View> : null}
        <CameraView key={facing} ref={attachCamera} style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]} facing={facing} mirror={facing === 'front'} mode="picture" onCameraReady={() => setReady(true)} onMountError={() => { setReady(false); setCameraError('Không mở được camera. Kiểm tra quyền truy cập hoặc chọn ảnh từ thư viện.'); }} />
      </View> : null}
      {template.cells.map((cell, index) => <View key={index} pointerEvents="box-none" style={{ position: 'absolute', left: `${cell.x * 100}%`, top: `${cell.y * 100}%`, width: `${cell.width * 100}%`, height: `${cell.height * 100}%`, overflow: 'hidden' }}>
        {index === active && live && !showCamera ? <View style={[styles.placeholder, { backgroundColor: colors.rose }]}>
          <Camera size={28} color={colors.primary} />
          <Body style={{ color: colors.primary, textAlign: 'center', fontSize: 12 }}>{cameraError || (permission?.granted ? 'Đang mở camera…' : 'Cho phép camera để chụp ảnh')}</Body>
        </View> : null}
        {!shots[index] ? <Pressable accessibilityRole="button" accessibilityLabel={`Ô ảnh ${index + 1} · chưa có ảnh`} accessibilityState={{ selected: index === active, disabled: busy }} disabled={busy} onPress={() => selectSlot(index)} style={StyleSheet.absoluteFill} /> : null}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, cellCorners(cell), { borderWidth: index === active ? 3 : 1, borderColor: index === active ? colors.primary : '#FFFFFF' }]} />
        {template.cells.length > 1 ? <View pointerEvents="none" style={{ position: 'absolute', top: 8, left: 8 }}><Body style={styles.badge}>{index + 1}</Body></View> : null}
        {shots[index] ? <Pressable accessibilityRole="button" accessibilityLabel={`Xóa ảnh ô ${index + 1}`} disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => removeShot(index)} style={styles.remove}>
          <View style={styles.removeIcon}><X size={16} color="#FFFFFF" strokeWidth={2.5} /></View>
        </Pressable> : null}
      </View>)}
    </View>
    <Body accessibilityLiveRegion="polite" style={{ color: colors.muted, textAlign: 'center', fontSize: 12 }}>{busy ? 'Đang xử lý ảnh…' : live ? `Chụp ảnh ${active + 1}/${template.cells.length} · ${count} ảnh đã chọn` : 'Kéo để căn ảnh · Chụm hai ngón tay để thu phóng'}</Body>
    <View style={styles.controls}>
      <IconButton icon={ImagePlus} label="Chọn ảnh từ thư viện" onPress={() => { if (!busy) void pickPhoto(); }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Chụp ảnh check-in" accessibilityState={{ disabled: busy || !ready || !showCamera }} disabled={busy || !ready || !showCamera} onPress={() => void capture()} style={[styles.shutter, { borderColor: colors.primary, opacity: busy || !ready || !showCamera ? 0.4 : 1 }]}><View style={{ flex: 1, borderRadius: 99, backgroundColor: colors.primary, margin: 5 }} /></Pressable>
      <IconButton icon={RefreshCw} label="Đổi camera trước sau" onPress={() => { if (lock.current || !live || (showCamera && !ready)) return; setReady(false); setCameraError(''); setFacing(current => current === 'back' ? 'front' : 'back'); }} />
    </View>
    {live && (!permission?.granted || cameraError) ? <SecondaryButton onPress={() => void enableCamera()}>{cameraError ? 'Thử mở lại camera' : 'Cho phép camera'}</SecondaryButton> : null}
    {live && permission && !permission.granted && !permission.canAskAgain ? <Body style={{ color: colors.muted, fontSize: 12 }}>Bạn có thể cấp quyền camera trong cài đặt thiết bị hoặc trình duyệt.</Body> : null}
    {live && permission && !permission.granted && !permission.canAskAgain && Platform.OS !== 'web' ? <SecondaryButton onPress={() => { void Linking.openSettings().catch(() => setError('Bạn mở cài đặt thiết bị để cấp quyền camera nhé.')); }}>Mở cài đặt camera</SecondaryButton> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, padding: 2 }}>
      {checkInTemplates.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Template ${item.label}`} accessibilityState={{ selected: template.id === item.id, disabled: busy }} disabled={busy} onPress={() => chooseTemplate(item)} style={{ width: 88, alignItems: 'center', gap: 6 }}>
        <View style={{ width: 70, height: 70, borderRadius: 14, borderWidth: 2, borderColor: item.id === template.id ? colors.primary : colors.line, padding: 6, backgroundColor: colors.surface }}>
          <View style={{ flex: 1 }}>{item.cells.map((cell, index) => <View key={index} style={{ position: 'absolute', left: `${cell.x * 100}%`, top: `${cell.y * 100}%`, width: `${cell.width * 100}%`, height: `${cell.height * 100}%`, padding: 1.5 }}><View style={{ flex: 1, borderRadius: 3, backgroundColor: colors.primary, opacity: 0.35 + index * 0.15 }} /></View>)}</View>
        </View>
      </Pressable>)}
    </ScrollView>
    {pendingTemplate ? <View accessibilityRole="alert" style={{ gap: 8, backgroundColor: colors.rose, padding: 14, borderRadius: 16 }}>
      <Body>Đổi sang “{pendingTemplate.label}” sẽ bỏ {shots.slice(pendingTemplate.cells.length).filter(Boolean).length} ảnh dư. Các ảnh đầu tiên được giữ lại.</Body>
      <SecondaryButton onPress={() => changeTemplate(pendingTemplate)}>Đổi template và bỏ ảnh dư</SecondaryButton>
      <SecondaryButton onPress={() => setPendingTemplate(null)}>Giữ template hiện tại</SecondaryButton>
    </View> : null}
    {error ? <Body accessibilityRole="alert" style={{ color: colors.primary }}>{error}</Body> : null}
    <PrimaryButton disabled={!complete || !allLoaded || live || busy || editingPhoto || !!pendingTemplate} onPress={() => void confirm()}>{busy ? 'Đang xử lý ảnh…' : 'Dùng ảnh này · Tiếp tục'}</PrimaryButton>
    <Body style={{ textAlign: 'center', color: colors.muted, fontSize: 12 }}>Tiếp theo: câu chuyện, ngày và nơi đã đến ♡</Body>
  </View>;
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 1, borderRadius: CAMERA_RADIUS, overflow: 'hidden', backgroundColor: '#20171B' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 14, gap: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  shutter: { width: 68, height: 68, borderRadius: 99, borderWidth: 3, padding: 1 },
  remove: { position: 'absolute', top: 2, right: 2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#20171BAA', alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 8, paddingHorizontal: 8, backgroundColor: '#20171BAA', color: '#FFFFFF', fontSize: 11 },
});
