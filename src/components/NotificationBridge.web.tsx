import { useEffect } from 'react';
import { useWishStore } from '../hooks/use-wish-store';
import { registerPush, registerWebWorker, webPushUnavailableReason } from '../services/push.web';

export function NotificationBridge() {
  const { ready, signedIn, paired, session, refresh } = useWishStore();
  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) void registerWebWorker().catch(() => {});
  }, []);
  useEffect(() => {
    if (!ready || !signedIn || !paired || !session) return;
    let active = true;
    // Restore the binding after login, without opening a permission prompt.
    // An explicit opt-out unsubscribes, so it must not be silently re-enabled.
    if (!webPushUnavailableReason() && Notification.permission === 'granted') {
      void navigator.serviceWorker.getRegistration('/').then(async registration => {
        const subscription = await registration?.pushManager.getSubscription();
        if (active && subscription) await registerPush(false);
      }).catch(() => {});
    }
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GIFT_PUSH') void refresh();
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => { active = false; navigator.serviceWorker?.removeEventListener('message', onMessage); };
  }, [ready, signedIn, paired, session, refresh]);
  return null;
}
