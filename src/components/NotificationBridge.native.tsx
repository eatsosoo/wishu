import { useEffect } from 'react';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useWishStore } from '../hooks/use-wish-store';
import { registerPush } from '../services/push';

export function NotificationBridge() {
  const { signedIn, paired, cloudEnabled, refresh } = useWishStore();
  useEffect(() => {
    if (!signedIn || !paired || !cloudEnabled || Constants.appOwnership === 'expo') return;
    let active = true;
    let lastId: string | undefined;
    function open(response: Notifications.NotificationResponse | null) {
      if (!active || !response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const request = response.notification.request;
      const id = request.content.data?.giftId;
      if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(id) || lastId === request.identifier) return;
      lastId = request.identifier;
      void refresh();
      router.push({ pathname: '/gift/[id]', params: { id } });
      void Notifications.clearLastNotificationResponseAsync();
    }
    void registerPush(false).catch(() => {});
    const received = Notifications.addNotificationReceivedListener(() => void refresh());
    const tapped = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    return () => { active = false; received.remove(); tapped.remove(); };
  }, [signedIn, paired, cloudEnabled, refresh]);
  return null;
}
