import { PopupMessage, PopupLayer } from './PopupMessage';
import { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, Platform, StyleSheet, View, type GestureResponderEvent, type PanResponderInstance, type ViewStyle } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Minus, Plus, X } from 'lucide-react-native';
import { Body, IconButton, PrimaryButton, SecondaryButton } from './ui';
import { AppHeader } from './AppScreen';
import { useAppTheme } from '../hooks/use-app-theme';
import { centeredSquare, clampSquareSelection, squareCrop, type SquareCropSelection } from '../features/photos/square-crop';
import { cropTouchKey, moveCropGesture, startCropGesture, type CropGesture } from '../features/photos/crop-gesture';

const gestureStyle: ViewStyle & { touchAction?: 'none' } = Platform.OS === 'web' ? { touchAction: 'none' } : {};

export function SquarePhotoCropper({ source, initialSelection, onCancel, onApply, aspectRatio = 1 }: {
  aspectRatio?: number;
  source: ImagePickerAsset;
  initialSelection: SquareCropSelection;
  onCancel: () => void;
  onApply: (selection: SquareCropSelection) => Promise<void>;
}) {
  const { colors } = useAppTheme();
  const [previewSize, setPreviewSize] = useState(0);
  const [selection, setSelection] = useState(initialSelection);
  const current = useRef(initialSelection);
  const drag = useRef<CropGesture | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState('');

  const [pan, setPan] = useState<PanResponderInstance | null>(null);
  useEffect(() => {
    function touches(event: GestureResponderEvent) {
      return event.nativeEvent.touches.map(touch => ({ id: touch.identifier, x: touch.pageX - origin.current.x, y: touch.pageY - origin.current.y }));
    }
    function rebase(event: GestureResponderEvent) {
      const points = touches(event);
      drag.current = points.length && previewSize > 0 ? startCropGesture(source.width, source.height, previewSize, current.current, points, aspectRatio) : null;
    }
    setPan(PanResponder.create({
    onStartShouldSetPanResponder: () => !working.current,
    onStartShouldSetPanResponderCapture: () => !working.current,
    onMoveShouldSetPanResponder: () => !working.current,
    onMoveShouldSetPanResponderCapture: () => !working.current,
    onPanResponderGrant: event => {
      const touch = event.nativeEvent.touches[0];
      if (!touch) return;
      origin.current = { x: touch.pageX - touch.locationX, y: touch.pageY - touch.locationY };
      rebase(event);
    },
    onPanResponderStart: rebase,
    onPanResponderEnd: rebase,
    onPanResponderMove: event => {
      if (working.current) return;
      const points = touches(event);
      if (!points.length || previewSize <= 0) return;
      const start = drag.current;
      if (!start || start.key !== cropTouchKey(points)) { rebase(event); return; }
      const next = moveCropGesture(source.width, source.height, previewSize, start, points, aspectRatio);
      current.current = next;
      setSelection(next);
    },
    onPanResponderRelease: () => { drag.current = null; },
    onPanResponderTerminate: () => { drag.current = null; },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  })); }, [previewSize, source.width, source.height, aspectRatio]);

  function change(next: SquareCropSelection) {
    if (working.current) return;
    const bounded = clampSquareSelection(source.width, source.height, next, aspectRatio);
    current.current = bounded;
    setSelection(bounded);
  }
  async function apply() {
    if (working.current) return;
    working.current = true; setBusy(true); setError('');
    try { await onApply(current.current); }
    catch (error) { setError(error instanceof Error ? error.message : 'Chưa cắt được ảnh. Bạn thử lại nhé.'); }
    finally { working.current = false; setBusy(false); }
  }
  const crop = squareCrop(source.width, source.height, selection, aspectRatio);
  const scale = previewSize / crop.width;
  const baseScale = previewSize / Math.min(source.width, source.height * aspectRatio);
  const previewHeight = previewSize / aspectRatio;
  const cancel = () => { if (!working.current) onCancel(); };

  return <Modal visible presentationStyle="fullScreen" animationType="slide" onRequestClose={cancel}>
    <SafeAreaProvider>
    <PopupLayer modal>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 478, alignSelf: 'center' }}>
        <AppHeader title="Chọn vùng ảnh" back={false} right={<IconButton icon={X} label="Đóng chỉnh ảnh" onPress={cancel} />} />
        <View style={{ flex: 1, width: '100%', maxWidth: 478, alignSelf: 'center', padding: 24, gap: 14 }}>
          <Body style={{ color: colors.muted }}>Kéo để di chuyển ảnh. Chụm hoặc tách hai ngón tay để thu nhỏ, phóng to.</Body>
          <View style={{ flex: 1, minHeight: 100, alignItems: 'center', justifyContent: 'center' }} onLayout={({ nativeEvent: { layout } }) => setPreviewSize(Math.max(0, Math.min(layout.width, layout.height * aspectRatio)))}>
          <View {...pan?.panHandlers} accessibilityLabel={aspectRatio === 1 ? "Vùng cắt ảnh hình vuông" : "Vùng cắt ảnh theo template"} style={[{ width: previewSize, height: previewHeight, overflow: 'hidden', borderRadius: 18, backgroundColor: colors.rose }, gestureStyle]}>
            <Image source={{ uri: source.uri }} pointerEvents="none" contentFit="fill" cachePolicy="memory" style={{ position: 'absolute', width: source.width * baseScale, height: source.height * baseScale, left: (previewSize - source.width * baseScale) / 2, top: (previewHeight - source.height * baseScale) / 2, transform: [{ translateX: (source.width / 2 - crop.originX - crop.width / 2) * scale }, { translateY: (source.height / 2 - crop.originY - crop.height / 2) * scale }, { scale: Math.min(source.width, source.height * aspectRatio) / crop.width }] }} />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 1, borderColor: '#FFFFFFAA', borderRadius: 18 }]}>
              {[1, 2].map(line => <View key={`v${line}`} style={{ position: 'absolute', left: `${line * 100 / 3}%`, top: 0, bottom: 0, width: 1, backgroundColor: '#FFFFFF80' }} />)}
              {[1, 2].map(line => <View key={`h${line}`} style={{ position: 'absolute', top: `${line * 100 / 3}%`, left: 0, right: 0, height: 1, backgroundColor: '#FFFFFF80' }} />)}
            </View>
          </View>
          </View>
          <View style={[styles.row, { justifyContent: 'center', gap: 18 }]}>
            <IconButton icon={Minus} label="Thu nhỏ ảnh" onPress={() => change({ ...selection, zoom: selection.zoom - 0.25 })} />
            <Body accessibilityLiveRegion="polite">{selection.zoom.toFixed(2)}×</Body>
            <IconButton icon={Plus} label="Phóng to ảnh" onPress={() => change({ ...selection, zoom: selection.zoom + 0.25 })} />
          </View>
          {!!error && <PopupMessage message={error} />}
          <PrimaryButton disabled={busy} onPress={() => void apply()}>{busy ? 'Đang xử lý ảnh…' : 'Dùng vùng ảnh này'}</PrimaryButton>
          <SecondaryButton onPress={() => change(centeredSquare)}>Căn giữa lại</SecondaryButton>
        </View>
      </View>
    </SafeAreaView>
    </PopupLayer>
    </SafeAreaProvider>
  </Modal>;
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 } });
