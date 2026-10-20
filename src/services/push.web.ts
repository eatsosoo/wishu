import { supabase } from './cloud';

const publicKey = process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
let registrationTask: Promise<string> | null = null;
let generation = 0;

export function webPushUnavailableReason(): string | null {
  if (typeof window === 'undefined') return 'Đang kiểm tra trình duyệt…';
  if (!window.isSecureContext) return 'Thông báo cần kết nối HTTPS.';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  if (ios && !standalone) return 'Trên iPhone/iPad: chọn Chia sẻ → Thêm vào Màn hình chính, mở app từ biểu tượng rồi bật thông báo (iOS 16.4 trở lên).';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'Trình duyệt này chưa hỗ trợ thông báo đẩy. Hãy thử trình duyệt khác hoặc bản cài Android/iOS.';
  if (!publicKey) return 'Thông báo web chưa được cấu hình trên máy chủ.';
  return null;
}

export async function registerWebWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
  if (!registration.active) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Chưa khởi động được thông báo. Bạn tải lại trang rồi thử nhé.')), 15000); }),
      ]);
    } finally { clearTimeout(timer); }
  }
  return registration;
}

function vapidBytes(value: string): Uint8Array<ArrayBuffer> {
  const decoded = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}

export function registerPush(requestPermission = true): Promise<string> {
  if (registrationTask) return registrationTask;
  registrationTask = performRegistration(requestPermission).finally(() => { registrationTask = null; });
  return registrationTask;
}

async function performRegistration(requestPermission: boolean): Promise<string> {
  const startedAt = generation;
  const reason = webPushUnavailableReason();
  if (reason) throw new Error(reason);
  if (!supabase) throw new Error('Chưa kết nối Supabase.');
  // Ask directly in the button handler, before awaiting service-worker/network work (Safari).
  let permission = Notification.permission;
  if (permission === 'default' && requestPermission) permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(permission === 'denied'
    ? 'Bạn đã chặn thông báo. Hãy mở cài đặt của trang để cho phép lại.'
    : 'Bạn chưa cho phép thông báo.');
  const registration = await registerWebWorker();
  const key = vapidBytes(publicKey!);
  let subscription = await registration.pushManager.getSubscription();
  const previousKey = subscription?.options.applicationServerKey;
  if (subscription && previousKey && new Uint8Array(previousKey).join(',') !== key.join(',')) {
    const { error } = await supabase.rpc('unregister_web_push', { p_endpoint: subscription.endpoint });
    if (error) throw new Error('Chưa cập nhật được thiết bị nhận thông báo.');
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  if (startedAt !== generation) throw new Error('Đã huỷ bật thông báo do tài khoản thay đổi.');
  const { error } = await supabase.rpc('register_web_push', { p_subscription: subscription.toJSON() });
  if (error) throw new Error('Chưa lưu được thiết bị nhận thông báo. Bạn thử lại nhé.');
  return subscription.endpoint;
}

export async function unregisterPush(): Promise<void> {
  generation++;
  await registrationTask?.catch(() => {});
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  if (supabase) {
    const { error } = await supabase.rpc('unregister_web_push', { p_endpoint: subscription.endpoint });
    if (error) throw new Error('Chưa tắt được thông báo của tài khoản này. Bạn thử lại nhé.');
  }
  await subscription.unsubscribe();
  const notifications = await registration!.getNotifications();
  notifications.forEach(notification => notification.close());
}

export async function scheduleTestNotification(partner = 'người ấy'): Promise<void> {
  throw new Error(`Hãy nhờ ${partner} hoàn thành một điều ước để kiểm tra thông báo web.`);
}
