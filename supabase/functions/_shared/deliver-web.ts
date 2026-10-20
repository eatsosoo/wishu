// @deno-types="npm:@types/web-push@3.6.4"
import webpush from 'npm:web-push@3.6.7';
import { admin } from './backend.ts';
import { allowedPushEndpoint, webPushFailure } from './web-push-policy.ts';

type Delivery = { id: string; notification_id: string; subscription_id: string; attempts: number };

export async function deliverWebGifts(notificationId?: string) {
  const publicKey = Deno.env.get('WEB_PUSH_VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('WEB_PUSH_VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('WEB_PUSH_VAPID_SUBJECT');
  // Native delivery continues to work before web push is provisioned.
  if (!publicKey || !privateKey || !subject) return;
  const { data, error } = await admin.rpc('claim_gift_web_push', { p_notification: notificationId ?? null });
  if (error) throw error;
  const deliveries = (data ?? []) as Delivery[];
  for (let offset = 0; offset < deliveries.length; offset += 5) {
    await Promise.all(deliveries.slice(offset, offset + 5).map(async delivery => {
      const save = async (values: Record<string, unknown>) => {
        const { error } = await admin.from('gift_web_push_deliveries').update(values)
          .eq('id', delivery.id).eq('attempts', delivery.attempts).eq('status', 'sending');
        if (error) throw error;
      };
      try {
        const { data: gift, error: giftError } = await admin.from('gift_notifications').select('recipient_id,sender_id,couple_id').eq('id', delivery.notification_id).single();
        const { data: subscription, error: subscriptionError } = await admin.from('wish_web_push_subscriptions')
          .select('user_id,endpoint,p256dh,auth,enabled,updated_at').eq('id', delivery.subscription_id).single();
        if (giftError || subscriptionError) throw new Error('LookupFailed');
        if (!subscription?.enabled || subscription.user_id !== gift?.recipient_id || !allowedPushEndpoint(subscription.endpoint)) {
          await save({ status: 'failed', error: 'InvalidSubscriptionOrAccountChanged' });
          return;
        }
        const { data: sender, error: senderError } = await admin.from('wish_members').select('display_name')
          .eq('user_id', gift.sender_id).eq('couple_id', gift.couple_id).maybeSingle();
        if (senderError) throw senderError;
        try {
          // Generic text protects private wish titles on a shared lock screen.
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            JSON.stringify({ giftId: delivery.notification_id, senderName: sender?.display_name?.trim() || 'Người ấy' }), {
              vapidDetails: { subject, publicKey, privateKey }, TTL: 86400, urgency: 'high', timeout: 10000,
            });
          // Push-service acceptance does not prove device display or that the gift was read.
          await save({ status: 'accepted', error: null });
        } catch (failure) {
          const statusCode = typeof failure === 'object' && failure !== null && 'statusCode' in failure
            && typeof failure.statusCode === 'number' ? failure.statusCode : undefined;
          const policy = webPushFailure(statusCode, delivery.attempts);
          if (policy.expired) {
            const { error } = await admin.from('wish_web_push_subscriptions').update({ enabled: false })
              .eq('id', delivery.subscription_id).eq('updated_at', subscription.updated_at);
            if (error) throw error;
          }
          await save({ status: policy.status, error: statusCode ? `WebPushHTTP${statusCode}` : 'WebPushSendFailed',
            retry_at: new Date(Date.now() + policy.delaySeconds * 1000).toISOString() });
        }
      } catch {
        await save({ status: delivery.attempts >= 8 ? 'failed' : 'pending', error: 'WebPushWorkerFailed',
          retry_at: new Date(Date.now() + 60000).toISOString() });
      }
    }));
  }
}
