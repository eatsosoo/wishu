import { PopupMessage, PopupLayer } from './PopupMessage';
import { useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Minus, Plus, X } from 'lucide-react-native';
import { Body, IconButton, PrimaryButton, SecondaryButton } from './ui';
import { AppHeader } from './AppScreen';
import { useAppTheme } from '../hooks/use-app-theme';
import { centeredSquare, type SquareCropSelection } from '../features/photos/square-crop';
import { CropImage } from './CropImage';
import { cropGestureStyle, useCropGesture } from '../hooks/use-crop-gesture';

export function SquarePhotoCropper({ source, initialSelection, onCancel, onApply, aspectRatio = 1 }: {
  aspectRatio?: number;
  source: ImagePickerAsset;
  initialSelection: SquareCropSelection;
  onCancel: () => void;
  onApply: (selection: SquareCropSelection) => Promise<void>;
}) {
  const { colors } = useAppTheme();
  const [previewSize, setPreviewSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState('');
  const gesture = useCropGesture({ width: source.width, height: source.height, previewWidth: previewSize, aspectRatio, selection: initialSelection, disabled: busy });
  const selection = gesture.preview;
  const change = gesture.change;
  async function apply() {
    if (working.current) return;
    working.current = true; setBusy(true); setError('');
    try { await onApply(gesture.getSelection()); }
    catch (error) { setError(error instanceof Error ? error.message : 'Chưa cắt được ảnh. Bạn thử lại nhé.'); }
    finally { working.current = false; setBusy(false); }
  }
  const previewHeight = previewSize / aspectRatio;
  const cancel = () => { if (!working.current) onCancel(); };

  return <Modal visible presentationStyle="fullScreen" animationType="slide" onRequestClose={cancel}>
    <SafeAreaProvider>
    <PopupLayer modal>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 478, alignSelf: 'center' }}>
        <AppHeader title="Chọn vùng ảnh" back={false} right={<IconButton icon={X} disabled={busy} label="Đóng chỉnh ảnh" onPress={cancel} />} />
        <View style={{ flex: 1, width: '100%', maxWidth: 478, alignSelf: 'center', padding: 24, gap: 14 }}>
          <Body style={{ color: colors.muted }}>Kéo để di chuyển ảnh. Chụm hoặc tách hai ngón tay để thu nhỏ, phóng to.</Body>
          <View style={{ flex: 1, minHeight: 100, alignItems: 'center', justifyContent: 'center' }} onLayout={({ nativeEvent: { layout } }) => setPreviewSize(Math.max(0, Math.min(layout.width, layout.height * aspectRatio)))}>
          <View {...gesture.panHandlers} accessibilityLabel={aspectRatio === 1 ? "Vùng cắt ảnh hình vuông" : "Vùng cắt ảnh theo template"} style={[{ width: previewSize, height: previewHeight, overflow: 'hidden', borderRadius: 18, backgroundColor: colors.rose }, cropGestureStyle]}>
            <CropImage source={source} selection={selection} previewWidth={previewSize} aspectRatio={aspectRatio} cachePolicy="memory" />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 1, borderColor: '#FFFFFFAA', borderRadius: 18 }]}>
              {[1, 2].map(line => <View key={`v${line}`} style={{ position: 'absolute', left: `${line * 100 / 3}%`, top: 0, bottom: 0, width: 1, backgroundColor: '#FFFFFF80' }} />)}
              {[1, 2].map(line => <View key={`h${line}`} style={{ position: 'absolute', top: `${line * 100 / 3}%`, left: 0, right: 0, height: 1, backgroundColor: '#FFFFFF80' }} />)}
            </View>
          </View>
          </View>
          <View style={[styles.row, { justifyContent: 'center', gap: 18 }]}>
            <IconButton icon={Minus} disabled={busy || selection.zoom <= 1} label="Thu nhỏ ảnh" onPress={() => change({ ...selection, zoom: selection.zoom - 0.25 })} />
            <Body accessibilityLiveRegion="polite">{selection.zoom.toFixed(2)}×</Body>
            <IconButton icon={Plus} disabled={busy || selection.zoom >= 4} label="Phóng to ảnh" onPress={() => change({ ...selection, zoom: selection.zoom + 0.25 })} />
          </View>
          {!!error && <PopupMessage message={error} />}
          <PrimaryButton loading={busy} disabled={busy} onPress={() => void apply()}>{busy ? 'Đang xử lý ảnh…' : 'Dùng vùng ảnh này'}</PrimaryButton>
          <SecondaryButton disabled={busy} onPress={() => change(centeredSquare)}>Căn giữa lại</SecondaryButton>
        </View>
      </View>
    </SafeAreaView>
    </PopupLayer>
    </SafeAreaProvider>
  </Modal>;
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 } });
