import { PopupMessage, PopupHost } from './PopupMessage';
import { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, Platform, ScrollView, StyleSheet, View, useWindowDimensions, type PanResponderInstance, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Minus, Plus, X } from 'lucide-react-native';
import { Body, Heading, IconButton, PrimaryButton, SecondaryButton } from './ui';
import { useAppTheme } from '../hooks/use-app-theme';
import { centeredSquare, clampSquareSelection, squareCrop, type SquareCropSelection } from '../features/photos/square-crop';

const gestureStyle: ViewStyle & { touchAction?: 'none' } = Platform.OS === 'web' ? { touchAction: 'none' } : {};

export function SquarePhotoCropper({ source, initialSelection, onCancel, onApply }: {
  source: ImagePickerAsset;
  initialSelection: SquareCropSelection;
  onCancel: () => void;
  onApply: (selection: SquareCropSelection) => Promise<void>;
}) {
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const previewSize = Math.min(320, width - 48, Math.max(160, height * 0.4));
  const [selection, setSelection] = useState(initialSelection);
  const current = useRef(initialSelection);
  const drag = useRef({ selection: initialSelection, scale: 1 });
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState('');

  const [pan, setPan] = useState<PanResponderInstance | null>(null);
  useEffect(() => { setPan(PanResponder.create({
    onStartShouldSetPanResponder: () => !working.current,
    onMoveShouldSetPanResponder: () => !working.current,
    onPanResponderGrant: () => {
      drag.current = { selection: current.current, scale: previewSize / squareCrop(source.width, source.height, current.current).width };
    },
    onPanResponderMove: (_, gesture) => {
      if (working.current) return;
      const start = drag.current;
      const next = clampSquareSelection(source.width, source.height, {
        ...start.selection,
        centerX: start.selection.centerX - gesture.dx / (start.scale * source.width),
        centerY: start.selection.centerY - gesture.dy / (start.scale * source.height),
      });
      current.current = next;
      setSelection(next);
    },
    onPanResponderTerminationRequest: () => false,
  })); }, [previewSize, source.width, source.height]);

  function change(next: SquareCropSelection) {
    if (working.current) return;
    const bounded = clampSquareSelection(source.width, source.height, next);
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
  const crop = squareCrop(source.width, source.height, selection);
  const scale = previewSize / crop.width;
  const cancel = () => { if (!working.current) onCancel(); };

  return <Modal visible animationType="slide" onRequestClose={cancel}>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 382, gap: 18 }}>
          <View style={styles.row}><Heading style={{ flex: 1, fontSize: 24 }}>Chọn vùng ảnh</Heading><IconButton icon={X} label="Đóng chỉnh ảnh" onPress={cancel} /></View>
          <Body style={{ color: colors.muted }}>Kéo ảnh để chọn vùng muốn giữ. Dùng + / − để phóng to, thu nhỏ.</Body>
          <View {...pan?.panHandlers} accessibilityLabel="Vùng cắt ảnh hình vuông" style={[{ alignSelf: 'center', width: previewSize, height: previewSize, overflow: 'hidden', borderRadius: 18, backgroundColor: colors.rose }, gestureStyle]}>
            <Image source={{ uri: source.uri }} pointerEvents="none" contentFit="fill" cachePolicy="memory" style={{ position: 'absolute', width: source.width * scale, height: source.height * scale, left: -crop.originX * scale, top: -crop.originY * scale }} />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 1, borderColor: '#FFFFFFAA', borderRadius: 18 }]}>
              {[1, 2].map(line => <View key={`v${line}`} style={{ position: 'absolute', left: `${line * 100 / 3}%`, top: 0, bottom: 0, width: 1, backgroundColor: '#FFFFFF80' }} />)}
              {[1, 2].map(line => <View key={`h${line}`} style={{ position: 'absolute', top: `${line * 100 / 3}%`, left: 0, right: 0, height: 1, backgroundColor: '#FFFFFF80' }} />)}
            </View>
          </View>
          <View style={[styles.row, { justifyContent: 'center', gap: 18 }]}>
            <IconButton icon={Minus} label="Thu nhỏ ảnh" onPress={() => change({ ...selection, zoom: selection.zoom - 0.25 })} />
            <Body accessibilityLiveRegion="polite">{selection.zoom.toFixed(2)}×</Body>
            <IconButton icon={Plus} label="Phóng to ảnh" onPress={() => change({ ...selection, zoom: selection.zoom + 0.25 })} />
          </View>
          <View style={[styles.row, { justifyContent: 'center', gap: 12 }]}>
            <IconButton icon={ArrowLeft} label="Chọn vùng ảnh bên trái" onPress={() => change({ ...selection, centerX: selection.centerX - 0.05 / selection.zoom })} />
            <IconButton icon={ArrowUp} label="Chọn vùng ảnh phía trên" onPress={() => change({ ...selection, centerY: selection.centerY - 0.05 / selection.zoom })} />
            <IconButton icon={ArrowDown} label="Chọn vùng ảnh phía dưới" onPress={() => change({ ...selection, centerY: selection.centerY + 0.05 / selection.zoom })} />
            <IconButton icon={ArrowRight} label="Chọn vùng ảnh bên phải" onPress={() => change({ ...selection, centerX: selection.centerX + 0.05 / selection.zoom })} />
          </View>
          {!!error && <PopupMessage message={error} />}
          <PrimaryButton disabled={busy} onPress={() => void apply()}>{busy ? 'Đang xử lý ảnh…' : 'Dùng vùng ảnh này'}</PrimaryButton>
          <SecondaryButton onPress={() => change(centeredSquare)}>Căn giữa lại</SecondaryButton>
        </View>
      </ScrollView>
      <PopupHost modal />
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 } });
