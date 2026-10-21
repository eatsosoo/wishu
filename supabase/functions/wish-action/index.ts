import { deliverWebGifts } from '../_shared/deliver-web.ts';
import { artNames, categories, type WishCommand } from '../../../src/types/domain.ts';
import { admin, authenticate, cors, json } from '../_shared/backend.ts';
import { deliverGifts } from '../_shared/deliver.ts';
import { PHOTO_LIMITS } from '../../../src/features/photos/limits.ts';

function validate(command: WishCommand, coupleId: string) {
  const photo = (value: unknown) => {
    if (!value || typeof value !== 'object') return false;
    if ('art' in value) return typeof value.art === 'string' && (artNames as readonly string[]).includes(value.art);
    if (!('uri' in value) || typeof value.uri !== 'string' || value.uri.length > 2048) return false;
    return /^https:\/\//.test(value.uri) || ('storagePath' in value && typeof value.storagePath === 'string' && value.storagePath.startsWith(`${coupleId}/`) && value.uri === `storage://${value.storagePath}`);
  };
  const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  const text = (value: unknown, max: number) => typeof value === 'string' && value.length <= max;
  if (!command || typeof command !== 'object') throw new Error('Yêu cầu không hợp lệ.');
  switch (command.kind) {
    case 'personalProfile':
      if (!command.input || (command.input.birthDate !== null && !date(command.input.birthDate)) || (command.input.gender !== null && !['male', 'female', 'other'].includes(command.input.gender))) throw new Error('Thông tin cá nhân chưa hợp lệ.');
      break;
    case 'complete':
      if (!command.input || !text(command.input.wishId, 100) || !date(command.input.completedAt) || !text(command.input.note, 2000) || !Array.isArray(command.input.photos) || command.input.photos.length > PHOTO_LIMITS.memoryCount || !command.input.photos.every(photo)) throw new Error('Thông tin kỷ niệm chưa hợp lệ.');
      break;
    case 'add': {
      const input = command.input;
      if (input?.active !== undefined && typeof input.active !== 'boolean') throw new Error('Trạng thái hiển thị không hợp lệ.');
      if (!input || !text(input.title, 100) || !input.title.trim() || !text(input.description, 1000) || !categories.includes(input.category) || !Number.isFinite(input.estimatedCost) || input.estimatedCost < 0 || !Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5 || !photo(input.cover) || !text(input.referenceUrl, 2048) || (input.referenceUrl && !/^https?:\/\//.test(input.referenceUrl)) || (input.targetDate && !date(input.targetDate))) throw new Error('Thông tin điều ước chưa hợp lệ.');
      break;
    }
    case 'wishActive':
      if (!text(command.id, 100) || typeof command.active !== 'boolean') throw new Error('Trạng thái hiển thị không hợp lệ.'); break;
    case 'couple': if (!text(command.name, 60) || !command.name.trim() || !date(command.anniversaryDate)) throw new Error('Thông tin cặp đôi chưa hợp lệ.'); break;
    case 'prepare': case 'read': case 'wishFavorite': case 'memoryFavorite': case 'delete':
      if (!text(command.id, 100)) throw new Error('Yêu cầu không hợp lệ.'); break;
    default: throw new Error('Thao tác không hợp lệ.');
  }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'MethodNotAllowed' }, 405);
  let user;
  try { user = await authenticate(request); } catch { return json({ error: 'Bạn cần đăng nhập lại.' }, 401); }
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 100000) return json({ error: 'Dữ liệu quá lớn.' }, 413);
    const body = await request.text();
    if (body.length > 100000) return json({ error: 'Dữ liệu quá lớn.' }, 413);
    const command = JSON.parse(body) as WishCommand;
    const { data: member, error: memberError } = await admin.from('wish_members').select('actor,couple_id').eq('user_id', user.id).single();
    if (memberError || !member) return json({ error: 'Bạn cần ghép đôi trước.' }, 403);
    validate(command, member.couple_id);
    const { data: result, error: commitError } = await admin.rpc('apply_wish_command', { p_user: user.id, p_command: command });
    if (commitError) {
      console.error('Relational wish command failed', { code: commitError.code, kind: command.kind });
      // P0001 contains deliberate, user-facing errors from our transactional RPC.
      throw new Error(commitError.code === 'P0001' ? commitError.message : 'Chưa lưu được thay đổi. Bạn thử lại nhé.');
    }
    const giftId = result?.giftId;
    // Outboxes are committed with the memory. A replay never enqueues another gift.
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
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Chưa lưu được thay đổi.' }, 400); }
});
