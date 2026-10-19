import { useCallback, useState } from 'react';

export function useRevealLayers() {
  const [state, setState] = useState({ mask: 0, failed: false, attempt: 0 });
  const attempt = state.attempt;
  const loaded = useCallback((layer: 1 | 2) => {
    setState(previous => previous.attempt !== attempt || previous.failed || (previous.mask & layer) !== 0
      ? previous : { ...previous, mask: previous.mask | layer });
  }, [attempt]);
  const failed = useCallback(() => {
    setState(previous => previous.attempt !== attempt ? previous : { ...previous, failed: true });
  }, [attempt]);
  const retry = useCallback(() => {
    setState(previous => ({ mask: 0, failed: false, attempt: previous.attempt + 1 }));
  }, []);
  return { ready: state.mask === 3 && !state.failed, error: state.failed, attempt, loaded, failed, retry };
}
