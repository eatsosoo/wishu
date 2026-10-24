import { deliverWebGifts } from '../_shared/deliver-web.ts';
import { validateWishCommand } from '../../../src/features/input-validation.ts';
import { admin, authenticate, cors, json } from '../_shared/backend.ts';
import { deliverGifts } from '../_shared/deliver.ts';
import { InputError, readJsonBody } from '../_shared/request-body.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'MethodNotAllowed' }, 405);
  let user;
  try { user = await authenticate(request); } catch { return json({ error: 'Bạn cần đăng nhập lại.' }, 401); }
  try {
    const command = await readJsonBody(request);
    const { data: member, error: memberError } = await admin.from('wish_members').select('actor,couple_id').eq('user_id', user.id).single();
    if (memberError || !member) return json({ error: 'Bạn cần ghép đôi trước.' }, 403);
    // The phone uses its local calendar date. Allow the latest current date
    // worldwide so UTC servers do not reject a valid check-in after midnight.
    const today = new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString().slice(0, 10);
    validateWishCommand(command, { coupleId: member.couple_id, userId: user.id, today });
    const { data: result, error: commitError } = await admin.rpc('apply_wish_command', { p_user: user.id, p_command: command });
    if (commitError) {
      console.error('Relational wish command failed', { code: commitError.code, kind: command.kind });
      // P0001 contains deliberate, user-facing errors from our transactional RPC.
      throw new Error(commitError.code === 'P0001' ? commitError.message : 'Chưa lưu được thay đổi. Bạn thử lại nhé.');
    }
    const giftId = result?.notificationId ?? result?.giftId;
    // Outboxes are committed with the memory/check-in. Replays never enqueue again.
    if (typeof giftId === 'string') {
      EdgeRuntime.waitUntil(deliverGifts(giftId).catch(() => {}));
      EdgeRuntime.waitUntil(deliverWebGifts(giftId).catch(() => {}));
    }
    const token = request.headers.get('Authorization')!;
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const scoped = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: token } }, auth: { persistSession: false } });
    const { data: couple, error: loadError } = await scoped.rpc('get_my_couple');
    if (loadError) throw new Error('Đã lưu, nhưng chưa tải lại được. Bạn làm mới app nhé.');
    return json(couple);
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Chưa lưu được thay đổi.' }, error instanceof InputError ? error.status : 400); }
});
