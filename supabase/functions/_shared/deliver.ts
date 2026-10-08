import { admin } from './backend.ts';

const expoHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
if (expoAccessToken) expoHeaders.Authorization = `Bearer ${expoAccessToken}`;
type Delivery = { id: string; notification_id: string; token: string; attempts: number };

export async function deliverGifts(notificationId?: string) {
  const { data, error } = await admin.rpc('claim_gift_push', { p_notification: notificationId ?? null });
  if (error) throw error;
  const deliveries = (data ?? []) as Delivery[];
  for (let offset = 0; offset < deliveries.length; offset += 5) {
    await Promise.all(deliveries.slice(offset, offset + 5).map(async delivery => {
    try {
      const { data: notification, error: giftError } = await admin.from('gift_notifications').select('payload,recipient_id').eq('id', delivery.notification_id).single();
      const { data: device } = await admin.from('wish_push_tokens').select('user_id,enabled').eq('token', delivery.token).single();
      if (giftError || !notification) throw new Error('NotificationMissing');
      if (!device?.enabled || device.user_id !== notification.recipient_id) {
        await admin.from('gift_push_deliveries').update({ status: 'failed', error: 'AccountChanged' }).eq('id', delivery.id);
        return;
      }
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST', headers: expoHeaders,
        body: JSON.stringify({ to: delivery.token, title: 'Bạn có một bất ngờ 🎁', body: `Người ấy đã hoàn thành “${notification.payload.title}”. Chạm để mở quà ♡`,
          sound: 'default', channelId: 'gifts', priority: 'high', data: { giftId: delivery.notification_id } }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`ExpoHTTP${response.status}`);
      const result = await response.json();
      const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
      if (ticket?.status !== 'ok' || !ticket.id) throw new Error(ticket?.details?.error ?? 'ExpoTicketError');
      const { error: saveError } = await admin.from('gift_push_deliveries').update({ status: 'accepted', ticket_id: ticket.id, retry_at: new Date(Date.now() + 15 * 60000).toISOString(), error: null }).eq('id', delivery.id);
      if (saveError) throw saveError;
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'PushError';
      const permanent = ['DeviceNotRegistered', 'MessageTooBig', 'MismatchSenderId', 'InvalidCredentials'].includes(message);
      if (message === 'DeviceNotRegistered') await admin.from('wish_push_tokens').update({ enabled: false }).eq('token', delivery.token);
      await admin.from('gift_push_deliveries').update({ status: permanent || delivery.attempts >= 8 ? 'failed' : 'pending', error: message, retry_at: new Date(Date.now() + Math.min(3600, 30 * 2 ** delivery.attempts) * 1000).toISOString() }).eq('id', delivery.id);
    }
    }));
  }
}

export async function checkReceipts() {
  const { data, error } = await admin.from('gift_push_deliveries').select('id,ticket_id,token,attempts,created_at').eq('status', 'accepted').lte('retry_at', new Date().toISOString()).limit(100);
  if (error) throw error;
  if (!data?.length) return;
  const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', { method: 'POST', headers: expoHeaders, body: JSON.stringify({ ids: data.map(item => item.ticket_id) }), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('ReceiptServiceUnavailable');
  const result = await response.json();
  for (const delivery of data) {
    const receipt = result.data?.[delivery.ticket_id];
    if (!receipt) {
      const expired = Date.now() - Date.parse(delivery.created_at) > 24 * 3600000;
      await admin.from('gift_push_deliveries').update(expired ? { status: 'failed', error: 'ReceiptExpired' } : { retry_at: new Date(Date.now() + 15 * 60000).toISOString() }).eq('id', delivery.id);
      continue;
    }
    if (receipt.status === 'ok') {
      await admin.from('gift_push_deliveries').update({ status: 'delivered', error: null }).eq('id', delivery.id);
    } else {
      const reason = receipt.details?.error ?? 'ReceiptError';
      if (reason === 'DeviceNotRegistered') await admin.from('wish_push_tokens').update({ enabled: false }).eq('token', delivery.token);
      const retry = reason === 'MessageRateExceeded' && delivery.attempts < 8;
      await admin.from('gift_push_deliveries').update({ status: retry ? 'pending' : 'failed', ticket_id: null, error: reason, retry_at: new Date(Date.now() + 5 * 60000).toISOString() }).eq('id', delivery.id);
    }
  }
}
