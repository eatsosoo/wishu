import { cors, json } from '../_shared/backend.ts';
import { checkReceipts, deliverGifts } from '../_shared/deliver.ts';
import { deliverWebGifts } from '../_shared/deliver-web.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'MethodNotAllowed' }, 405);
  const secret = Deno.env.get('GIFT_WORKER_SECRET');
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) return json({ error: 'Unauthorized' }, 401);
  try {
    const results = await Promise.allSettled([checkReceipts(), deliverGifts(), deliverWebGifts()]);
    if (results.some(result => result.status === 'rejected')) throw new Error('PushWorkerFailed');
    return json({ ok: true });
  }
  catch { return json({ error: 'PushWorkerFailed' }, 503); }
});
