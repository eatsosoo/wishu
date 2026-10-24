import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { clampSquareSelection, type SquareCropSelection } from '../features/photos/square-crop';
import { CropImage } from './CropImage';
import { cropGestureStyle, useCropGesture } from '../hooks/use-crop-gesture';

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
  const gesture = useCropGesture({ width: source.width, height: source.height, previewWidth: width, aspectRatio, selection, disabled, onSelect: props.onSelect, onCommit: props.onChange, onInteractionChange: props.onInteractionChange });
  const preview = gesture.preview;
  return <View {...gesture.panHandlers} {...gesture.touchHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={`Ô ảnh ${index + 1} · chỉnh vùng ảnh`}
    accessibilityHint="Kéo để căn ảnh. Chụm hoặc tách hai ngón tay để thu nhỏ, phóng to."
    accessibilityState={{ selected, disabled }} aria-selected={selected} aria-disabled={disabled} aria-valuemin={1} aria-valuemax={4} aria-valuenow={preview.zoom} aria-valuetext={`${preview.zoom.toFixed(2)}×`}
    accessibilityActions={[{ name: 'activate', label: 'Chọn ảnh' }, { name: 'increment', label: 'Phóng to' }, { name: 'decrement', label: 'Thu nhỏ' }]}
    onAccessibilityAction={({ nativeEvent: { actionName } }) => {
      if (disabled) return;
      props.onSelect();
      if (actionName === 'increment' || actionName === 'decrement') props.onChange(clampSquareSelection(source.width, source.height, { ...selection, zoom: selection.zoom + (actionName === 'increment' ? 0.25 : -0.25) }, aspectRatio));
    }}
    onLayout={({ nativeEvent: { layout } }) => setWidth(layout.width)} style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, cropGestureStyle]}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <CropImage source={source} selection={preview} previewWidth={width} aspectRatio={aspectRatio} onLoad={onLoad} onError={onError} />
    </View>
  </View>;
}
