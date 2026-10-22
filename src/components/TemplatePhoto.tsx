import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, View, type GestureResponderEvent, type PanResponderInstance, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { clampSquareSelection, squareCrop, type SquareCropSelection } from '../features/photos/square-crop';
import { cropTouchKey, moveCropGesture, startCropGesture, type CropGesture } from '../features/photos/crop-gesture';

const gestureStyle: ViewStyle & { touchAction?: 'none' } = Platform.OS === 'web' ? { touchAction: 'none' } : {};

type Props = {
  source: ImagePickerAsset;
  selection: SquareCropSelection;
  aspectRatio: number;
  index: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onInteractionChange: (active: boolean) => void;
  onChange: (selection: SquareCropSelection) => void;
  onLoad: () => void;
  onError: () => void;
};

/** Only the image is drawn here, so capturing the collage excludes all controls. */
export function TemplatePhoto(props: Props) {
  const { source, selection, aspectRatio, index, selected, disabled, onLoad, onError } = props;
  const [width, setWidth] = useState(0);
  const [draft, setDraft] = useState<SquareCropSelection | null>(null);
  const preview = draft ?? selection;
  const interacting = useRef(false);
  const latest = useRef(props);
  useLayoutEffect(() => { latest.current = props; });
  const current = useRef(selection);
  useLayoutEffect(() => { current.current = selection; }, [selection]);
  const drag = useRef<CropGesture | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  function beginInteraction() {
    if (latest.current.disabled || interacting.current) return;
    interacting.current = true;
    latest.current.onInteractionChange(true);
  }
  function finishInteraction() {
    if (!interacting.current) return;
    interacting.current = false;
    drag.current = null;
    latest.current.onChange(current.current);
    setDraft(null);
    latest.current.onInteractionChange(false);
  }
  useEffect(() => () => {
    if (interacting.current) latest.current.onInteractionChange(false);
  }, []);
  const [pan, setPan] = useState<PanResponderInstance | null>(null);
  useEffect(() => {
    function touches(event: GestureResponderEvent) {
      return event.nativeEvent.touches.map(touch => ({ id: touch.identifier, x: touch.pageX - origin.current.x, y: touch.pageY - origin.current.y }));
    }
    function rebase(event: GestureResponderEvent) {
      const points = touches(event);
      drag.current = points.length && width > 0 ? startCropGesture(source.width, source.height, width, current.current, points, aspectRatio) : null;
    }
    setPan(PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onStartShouldSetPanResponderCapture: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      onPanResponderGrant: event => {
        beginInteraction();
        latest.current.onSelect();
        const touch = event.nativeEvent.touches[0];
        if (!touch) return;
        origin.current = { x: touch.pageX - touch.locationX, y: touch.pageY - touch.locationY };
        rebase(event);
      },
      onPanResponderStart: rebase,
      onPanResponderEnd: rebase,
      onPanResponderMove: event => {
        if (latest.current.disabled) return;
        const points = touches(event);
        if (!points.length || width <= 0) return;
        if (!drag.current || drag.current.key !== cropTouchKey(points)) { rebase(event); return; }
        const next = moveCropGesture(source.width, source.height, width, drag.current, points, aspectRatio);
        current.current = next;
        setDraft(next);
      },
      onPanResponderRelease: finishInteraction,
      onPanResponderTerminate: finishInteraction,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }));
  }, [width, source.width, source.height, aspectRatio]);
  const crop = squareCrop(source.width, source.height, preview, aspectRatio);
  const scale = width / crop.width;
  const baseScale = width / Math.min(source.width, source.height * aspectRatio);
  const height = width / aspectRatio;
  return <View {...pan?.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={`Ô ảnh ${index + 1} · chỉnh vùng ảnh`}
    accessibilityHint="Kéo để căn ảnh. Chụm hoặc tách hai ngón tay để thu nhỏ, phóng to."
    accessibilityState={{ selected, disabled }} aria-selected={selected} aria-disabled={disabled} aria-valuemin={1} aria-valuemax={4} aria-valuenow={preview.zoom} aria-valuetext={`${preview.zoom.toFixed(2)}×`}
    accessibilityActions={[{ name: 'activate', label: 'Chọn ảnh' }, { name: 'increment', label: 'Phóng to' }, { name: 'decrement', label: 'Thu nhỏ' }]}
    onAccessibilityAction={({ nativeEvent: { actionName } }) => {
      if (disabled) return;
      latest.current.onSelect();
      if (actionName === 'increment' || actionName === 'decrement') latest.current.onChange(clampSquareSelection(source.width, source.height, { ...selection, zoom: selection.zoom + (actionName === 'increment' ? 0.25 : -0.25) }, aspectRatio));
    }}
    onTouchStart={beginInteraction}
    onTouchEnd={event => { if (!event.nativeEvent.touches.length) finishInteraction(); }}
    onTouchCancel={finishInteraction}
    onLayout={({ nativeEvent: { layout } }) => setWidth(layout.width)} style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, gestureStyle]}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Image source={{ uri: source.uri }} contentFit="fill" transition={0} onLoad={onLoad} onError={onError}
      style={{ position: 'absolute', width: source.width * baseScale, height: source.height * baseScale,
        left: (width - source.width * baseScale) / 2, top: (height - source.height * baseScale) / 2,
        transform: [{ translateX: (source.width / 2 - crop.originX - crop.width / 2) * scale }, { translateY: (source.height / 2 - crop.originY - crop.height / 2) * scale }, { scale: Math.min(source.width, source.height * aspectRatio) / crop.width }] }} />
    </View>
  </View>;
}
