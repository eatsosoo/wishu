import { admin, authenticate, cors, json } from '../_shared/backend.ts';
import { InputError, readJsonBody } from '../_shared/request-body.ts';
import { isRecord } from '../../../src/features/input-validation.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'MethodNotAllowed' }, 405);
  let user;
  try { user = await authenticate(request); }
  catch { return json({ error: 'Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại rồi thử vô hiệu hoá tài khoản nhé.' }, 401); }
  let body;
  try { body = await readJsonBody(request, 1024); }
  catch (error) { return json({ error: error instanceof InputError ? error.message : 'Yêu cầu chưa hợp lệ.' }, error instanceof InputError ? error.status : 400); }
  // Old clients also deactivate; new confirmations fail safely on old backends.
  if (!isRecord(body) || !['DEACTIVATE', 'DELETE'].includes(body.confirmation as string)) return json({ error: 'Bạn cần xác nhận vô hiệu hoá tài khoản.' }, 400);
  try {
    const { error } = await admin.rpc('deactivate_account', { p_user: user.id });
    if (error) throw error;
    return json({ inactive: true });
  } catch (error) {
    console.error('Account deactivation failed', error);
    return json({ error: 'Chưa vô hiệu hoá được tài khoản. Bạn kiểm tra kết nối và thử lại nhé.' }, 500);
  }
});
