import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useWishStore } from '../hooks/use-wish-store';
import { registerPush } from '../services/push';

export function NotificationBridge() {
  const { ready, onboarded, signedIn, paired, cloudEnabled, refresh } = useWishStore();
  const lastId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!ready || !onboarded || !signedIn || !paired) return;
    let active = true;
    function open(response: Notifications.NotificationResponse | null) {
      if (!active || !response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const request = response.notification.request;
      if (lastId.current === request.identifier) return;
      if (__DEV__ && request.content.data?.giftPreview === true && request.content.data?.giftId === 'test-preview') {
        lastId.current = request.identifier;
        router.push({ pathname: '/gift/[id]', params: { id: 'test-preview', preview: '1' } });
        void Notifications.clearLastNotificationResponseAsync();
        return;
      }
      const id = request.content.data?.giftId;
      if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(id)) return;
      lastId.current = request.identifier;
      void refresh();
      router.push({ pathname: '/gift/[id]', params: { id } });
      void Notifications.clearLastNotificationResponseAsync();
    }
    if (cloudEnabled && Constants.appOwnership !== 'expo') void registerPush(false).catch(() => {});
    const received = Notifications.addNotificationReceivedListener(notification => {
      if (notification.request.content.data?.giftPreview !== true) void refresh();
    });
    const tapped = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    return () => { active = false; received.remove(); tapped.remove(); };
  }, [ready, onboarded, signedIn, paired, cloudEnabled, refresh]);
  return null;
}
