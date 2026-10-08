import { cors, json } from '../_shared/backend.ts';
import { checkReceipts, deliverGifts } from '../_shared/deliver.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'MethodNotAllowed' }, 405);
  const secret = Deno.env.get('GIFT_WORKER_SECRET');
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) return json({ error: 'Unauthorized' }, 401);
  try { await checkReceipts(); await deliverGifts(); return json({ ok: true }); }
  catch { return json({ error: 'PushWorkerFailed' }, 503); }
});
