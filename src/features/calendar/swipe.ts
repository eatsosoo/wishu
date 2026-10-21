import type { PanResponderCallbacks, PanResponderGestureState } from 'react-native';

const horizontal = ({ dx, dy }: PanResponderGestureState) => Math.abs(dx) > Math.abs(dy) * 1.5;

export function createCalendarSwipeHandlers(onMonthChange: (direction: -1 | 1) => void): PanResponderCallbacks {
  let cancelled = false;
  const shouldCapture = (_event: unknown, gesture: PanResponderGestureState) =>
    gesture.numberActiveTouches === 1 && Math.abs(gesture.dx) > 14 && horizontal(gesture);
  return {
    // Leave taps to the day buttons and vertical gestures to the parent ScrollView.
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: shouldCapture,
    onMoveShouldSetPanResponderCapture: shouldCapture,
    onPanResponderGrant: () => { cancelled = false; },
    onPanResponderMove: (_event, gesture) => {
      if (gesture.numberActiveTouches > 1) cancelled = true;
    },
    onPanResponderRelease: (_event, gesture) => {
      if (!cancelled && Math.abs(gesture.dx) >= 44 && horizontal(gesture)) {
        onMonthChange(gesture.dx < 0 ? 1 : -1);
      }
      cancelled = true;
    },
    onPanResponderTerminate: () => { cancelled = true; },
    onPanResponderTerminationRequest: () => false,
  };
}

export function shiftCalendarMonth(current: Date, direction: -1 | 1): Date {
  // Always anchor to day 1, so January 31 cannot skip February.
  return new Date(current.getFullYear(), current.getMonth() + direction, 1);
}
