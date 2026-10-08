import { admin, authenticate, cors, json } from '../_shared/backend.ts';
import { deleteAccountData } from '../_shared/delete-account.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'MethodNotAllowed' }, 405);
  let user;
  try { user = await authenticate(request); }
  catch { return json({ error: 'Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại rồi thử xoá tài khoản nhé.' }, 401); }
  const body = await request.json().catch(() => null);
  if (body?.confirmation !== 'DELETE') return json({ error: 'Bạn cần xác nhận xoá tài khoản.' }, 400);
  try {
    // No user ID or Storage prefix is accepted from the caller.
    await deleteAccountData(user.id, {
      async prepare(userId) {
        const { error } = await admin.rpc('prepare_account_deletion', { p_user: userId });
        if (error) throw error;
      },
      async photos(userId) {
        const { data, error } = await admin.rpc('account_deletion_photos', { p_user: userId });
        if (error) throw error;
        return (data as { name: string }[]).map(item => item.name);
      },
      async removePhotos(paths) {
        const { error } = await admin.storage.from('wish-photos').remove(paths);
        if (error) throw error;
      },
      async deleteUser(userId) {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw error;
      },
    });
    return json({ deleted: true });
  } catch (error) {
    console.error('Account deletion failed', error);
    return json({ error: 'Chưa hoàn tất việc xoá tài khoản. Nếu việc xoá đã bắt đầu, không gian sẽ tạm ngừng cập nhật. Bạn kiểm tra kết nối và thử xoá lại nhé.' }, 500);
  }
});
