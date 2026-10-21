import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, Platform, View, type ViewStyle } from 'react-native';
import { createCalendarSwipeHandlers } from '../features/calendar/swipe';
import { useReducedMotion } from '../hooks/use-reduced-motion';

export function CalendarSwipe({ children, onMonthChange, monthKey }: { children: ReactNode; onMonthChange: (direction: -1 | 1) => void; monthKey: number }) {
  const reducedMotion = useReducedMotion();
  const [offset] = useState(() => new Animated.Value(0));
  const width = useRef(320);
  const previousMonth = useRef(monthKey);
  const responder = useMemo(() => PanResponder.create(createCalendarSwipeHandlers(onMonthChange)), [onMonthChange]);
  useLayoutEffect(() => {
    const direction = Math.sign(monthKey - previousMonth.current);
    previousMonth.current = monthKey;
    offset.stopAnimation();
    if (!direction || reducedMotion) { offset.setValue(0); return; }
    offset.setValue(direction * width.current);
    const animation = Animated.timing(offset, {
      toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [monthKey, offset, reducedMotion]);
  // Let browsers scroll vertically while keeping horizontal swipes in the calendar.
  const webStyle: (ViewStyle & { touchAction: 'pan-y'; userSelect: 'none' }) | undefined =
    Platform.OS === 'web' ? { touchAction: 'pan-y', userSelect: 'none' } : undefined;
  return <View {...responder.panHandlers} onLayout={event => { width.current = event.nativeEvent.layout.width; }} style={[{ overflow: 'hidden' }, webStyle]}>
    <Animated.View style={{ transform: [{ translateX: offset }] }}>{children}</Animated.View>
  </View>;
}
