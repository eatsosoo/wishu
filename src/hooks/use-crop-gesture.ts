import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PanResponder, Platform, type GestureResponderEvent, type PanResponderInstance, type ViewStyle } from 'react-native';
import { clampSquareSelection, type SquareCropSelection } from '../features/photos/square-crop';
import { cropTouchKey, moveCropGesture, startCropGesture, type CropGesture } from '../features/photos/crop-gesture';

export const cropGestureStyle: ViewStyle & { touchAction?: 'none' } = Platform.OS === 'web' ? { touchAction: 'none' } : {};

type Options = {
  width: number; height: number; previewWidth: number; aspectRatio: number;
  selection: SquareCropSelection; disabled: boolean;
  onSelect?: () => void;
  onCommit?: (selection: SquareCropSelection) => void;
  onInteractionChange?: (active: boolean) => void;
};

export function useCropGesture(options: Options) {
  const { width, height, previewWidth, aspectRatio, selection } = options;
  const latest = useRef(options);
  useLayoutEffect(() => { latest.current = options; });
  const current = useRef(selection);
  useLayoutEffect(() => { current.current = selection; }, [selection]);
  const [draft, setDraft] = useState<SquareCropSelection | null>(null);
  const interacting = useRef(false);
  const drag = useRef<CropGesture | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [pan, setPan] = useState<PanResponderInstance | null>(null);

  function beginInteraction() {
    if (latest.current.disabled || interacting.current) return;
    interacting.current = true;
    latest.current.onInteractionChange?.(true);
  }
  function finishInteraction() {
    if (!interacting.current) return;
    interacting.current = false;
    drag.current = null;
    if (latest.current.onCommit) {
      latest.current.onCommit(current.current);
      setDraft(null);
    }
    latest.current.onInteractionChange?.(false);
  }
  function change(next: SquareCropSelection) {
    if (latest.current.disabled) return;
    const bounded = clampSquareSelection(width, height, next, aspectRatio);
    current.current = bounded;
    setDraft(bounded);
  }
  useEffect(() => () => {
    if (interacting.current) latest.current.onInteractionChange?.(false);
  }, []);
  useEffect(() => {
    function touches(event: GestureResponderEvent) {
      return event.nativeEvent.touches.map(touch => ({ id: touch.identifier, x: touch.pageX - origin.current.x, y: touch.pageY - origin.current.y }));
    }
    function rebase(event: GestureResponderEvent) {
      const points = touches(event);
      drag.current = points.length && previewWidth > 0 ? startCropGesture(width, height, previewWidth, current.current, points, aspectRatio) : null;
    }
    setPan(PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onStartShouldSetPanResponderCapture: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponderCapture: () => !latest.current.disabled,
      onPanResponderGrant: event => {
        beginInteraction(); latest.current.onSelect?.();
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
        if (!points.length || previewWidth <= 0) return;
        if (!drag.current || drag.current.key !== cropTouchKey(points)) { rebase(event); return; }
        const next = moveCropGesture(width, height, previewWidth, drag.current, points, aspectRatio);
        current.current = next; setDraft(next);
      },
      onPanResponderRelease: finishInteraction,
      onPanResponderTerminate: finishInteraction,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }));
  }, [width, height, previewWidth, aspectRatio]);

  return { preview: draft ?? selection, change, getSelection: () => current.current, panHandlers: pan?.panHandlers,
    touchHandlers: { onTouchStart: beginInteraction, onTouchEnd: (event: GestureResponderEvent) => { if (!event.nativeEvent.touches.length) finishInteraction(); }, onTouchCancel: finishInteraction } };
}
