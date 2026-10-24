import { useEffect, useState } from 'react';
import { Animated, AppState, Easing } from 'react-native';
import { useReducedMotion } from './use-reduced-motion';

export function useLoadingMotion(duration: number) {
  const [progress] = useState(() => new Animated.Value(0));
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) { progress.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(progress, {
      toValue: 1, duration, easing: Easing.linear, useNativeDriver: true, isInteraction: false,
    }));
    function sync() {
      loop.stop(); progress.setValue(0);
      if (AppState.currentState === 'active' || AppState.currentState === null) loop.start();
    }
    sync();
    const subscription = AppState.addEventListener('change', sync);
    return () => { subscription.remove(); loop.stop(); };
  }, [duration, progress, reducedMotion]);
  return { progress, reducedMotion };
}
