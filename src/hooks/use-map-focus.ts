import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

// Native stacks retain previous screens; release their WebGL contexts and workers.
export function useMapFocus() {
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  return focused;
}
