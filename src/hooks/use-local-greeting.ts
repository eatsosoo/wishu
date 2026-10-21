import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localGreeting } from '../features/couple/selectors';

export function useLocalGreeting() {
  const [greeting, setGreeting] = useState(() => localGreeting());
  useEffect(() => {
    const refresh = () => setGreeting(localGreeting());
    const timer = setInterval(refresh, 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  return greeting;
}
