import { applyWishCommand } from '../../../src/services/wish-actions.ts';
import { artNames, categories, type MockSnapshot, type WishCommand } from '../../../src/types/domain.ts';
import { admin, authenticate, cors, json } from '../_shared/backend.ts';
import { deliverGifts } from '../_shared/deliver.ts';

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
    case 'complete':
      if (!command.input || !text(command.input.wishId, 100) || !date(command.input.completedAt) || !text(command.input.note, 2000) || !Array.isArray(command.input.photos) || command.input.photos.length > 8 || !command.input.photos.every(photo)) throw new Error('Thông tin kỷ niệm chưa hợp lệ.');
      break;
    case 'add': {
      const input = command.input;
      if (!input || !text(input.title, 100) || !input.title.trim() || !text(input.description, 1000) || !categories.includes(input.category) || !Number.isFinite(input.estimatedCost) || input.estimatedCost < 0 || !Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5 || !photo(input.cover) || !text(input.referenceUrl, 2048) || (input.referenceUrl && !/^https?:\/\//.test(input.referenceUrl)) || (input.targetDate && !date(input.targetDate))) throw new Error('Thông tin điều ước chưa hợp lệ.');
      break;
    }
    case 'couple': if (!text(command.name, 60) || !command.name.trim() || !date(command.anniversaryDate)) throw new Error('Thông tin cặp đôi chưa hợp lệ.'); break;
    case 'prepare': case 'read': case 'wishFavorite': case 'memoryFavorite':
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
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: state, error } = await admin.from('wish_state').select('snapshot,version').eq('couple_id', member.couple_id).single();
      if (error || !state) throw new Error('Chưa đọc được dữ liệu của hai đứa.');
      const previous = state.snapshot as MockSnapshot;
      const next = applyWishCommand(previous, command, member.actor);
      const gift = next.notifications.find(item => !previous.notifications.some(old => old.id === item.id));
      const { data: committed, error: commitError } = await admin.rpc('commit_wish_state', {
        p_user: user.id, p_version: state.version, p_snapshot: next, p_gift: gift ?? null, p_read_id: command.kind === 'read' ? command.id : null,
      });
      if (commitError) throw new Error('Chưa lưu được. Hãy kiểm tra người ấy đã ghép đôi và thử lại.');
      if (!committed) continue;
      // The persisted queue retries transient failures even if the phone closes.
      if (gift) EdgeRuntime.waitUntil(deliverGifts(gift.id).catch(() => {}));
      const token = request.headers.get('Authorization')!;
      const { createClient } = await import('npm:@supabase/supabase-js@2');
      const scoped = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: token } }, auth: { persistSession: false } });
      const { data: couple, error: loadError } = await scoped.rpc('get_my_couple');
      if (loadError) throw new Error('Đã lưu, nhưng chưa tải lại được. Bạn làm mới app nhé.');
      return json(couple);
    }
    return json({ error: 'Hai đứa vừa cập nhật cùng lúc. Bạn thử lại nhé.' }, 409);
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Chưa lưu được thay đổi.' }, 400); }
});
