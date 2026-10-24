import { artNames, categories, type WishCommand } from '../types/domain.ts';
import { PHOTO_LIMITS } from './photos/limits.ts';
import { localDate } from './dates.ts';
export { localDate } from './dates.ts';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function isText(value: unknown, max: number, required = false, multiline = false): value is string {
  return typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0)
    && !Array.from(value).some(char => {
      const code = char.charCodeAt(0);
      return (code < 32 || code === 127) && !(multiline && ['\n', '\r', '\t'].includes(char));
    });
}
export function isHttpUrl(value: unknown, httpsOnly = false): boolean {
  if (!isText(value, 2048, true) || /\s|\\/.test(value)) return false;
  try {
    const url = new URL(value);
    return (httpsOnly ? url.protocol === 'https:' : ['https:', 'http:'].includes(url.protocol))
      && /^https?:\/\/[^/?#]/i.test(value) && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}
export function isISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '2100-12-31') return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isInputId(value: unknown): value is string {
  return isText(value, 100, true) && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value);
}
export function validatePairInput(name: unknown, space: unknown, code?: unknown): string | null {
  if (!isText(name, 40, true)) return 'Tên của bạn cần từ 1 đến 40 ký tự, không chứa ký tự điều khiển.';
  if (code !== undefined) {
    if (!isText(code, 64, true) || !/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(code.trim().toUpperCase())) return 'Mã mời cần đúng 5 ký tự chữ và số hợp lệ.';
  } else if (!isText(space, 60, true)) return 'Tên không gian cần từ 1 đến 60 ký tự.';
  return null;
}

interface ValidationOptions { coupleId?: string; userId?: string; allowLocalPhotos?: boolean; today?: string }
function validPhoto(value: unknown, options: ValidationOptions): boolean {
  if (!isRecord(value)) return false;
  if ('art' in value) return !('uri' in value) && !('storagePath' in value) && (artNames as readonly unknown[]).includes(value.art);
  if (typeof value.uri !== 'string') return false;
  if ('storagePath' in value) {
    if (typeof value.storagePath !== 'string' || value.storagePath.length > 2048) return false;
    const parts = value.storagePath.split('/');
    const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
    return parts.length === 3 && uuid.test(parts[0]) && uuid.test(parts[1])
      && (!options.coupleId || parts[0] === options.coupleId)
      && !!parts[2] && parts[2] !== '.' && parts[2] !== '..' && !/[\\?#\s%]/.test(parts[2])
      && isText(parts[2], 255, true) && value.uri === `storage://${value.storagePath}`;
  }
  if (isHttpUrl(value.uri, true)) return true;
  return !!options.allowLocalPhotos && value.uri.length <= PHOTO_LIMITS.uploadBytes * 2
    && /^(file:\/\/|content:\/\/|blob:|data:image\/(jpeg|png|webp|heic|heif);base64,)/.test(value.uri);
}

// Runtime validation is shared by the app and Edge Function; TypeScript types
// alone do not validate JSON from a client or restored local state.
export function validateWishCommand(value: unknown, options: ValidationOptions = {}): asserts value is WishCommand {
  const fail = (message: string): never => { throw new Error(message); };
  if (!isRecord(value)) fail('Yêu cầu không hợp lệ.');
  const command = value as Record<string, unknown>;
  const input = isRecord(command.input) ? command.input : {};
  const today = options.today ?? localDate();
  switch (command.kind) {
    case 'add':
      if (!isText(input.title, 100, true)) fail('Tên điều ước cần từ 1 đến 100 ký tự.');
      if (!isText(input.description, 1000, false, true)) fail('Mô tả điều ước cần tối đa 1000 ký tự.');
      if (!(categories as readonly unknown[]).includes(input.category)) fail('Loại điều ước chưa hợp lệ.');
      if (!Number.isSafeInteger(input.estimatedCost) || (input.estimatedCost as number) < 0) fail('Ngân sách cần là số nguyên không âm, tối đa 9.007.199.254.740.991 đồng.');
      if (!Number.isInteger(input.priority) || (input.priority as number) < 1 || (input.priority as number) > 5) fail('Mức ưu tiên cần từ 1 đến 5.');
      if (input.active !== undefined && typeof input.active !== 'boolean') fail('Trạng thái hiển thị không hợp lệ.');
      if (input.createdBy !== undefined && input.createdBy !== 'minh' && input.createdBy !== 'linh') fail('Người tạo điều ước chưa hợp lệ.');
      if (!isText(input.referenceUrl, 2048) || (input.referenceUrl !== '' && !isHttpUrl(input.referenceUrl))) fail('Liên kết tham khảo cần là URL http:// hoặc https:// hợp lệ, tối đa 2048 ký tự.');
      if (input.targetDate !== undefined && input.targetDate !== '' && !isISODate(input.targetDate)) fail('Ngày mong muốn chưa hợp lệ.');
      if (!validPhoto(input.cover, options)) fail('Ảnh điều ước chưa hợp lệ.');
      return;
    case 'complete':
      if (!isInputId(input.wishId) || !isISODate(input.completedAt)) fail('Điều ước hoặc ngày hoàn thành chưa hợp lệ.');
      if (!isText(input.note, 2000, false, true)) fail('Lời nhắn cần tối đa 2000 ký tự.');
      if (!Array.isArray(input.photos) || input.photos.length > PHOTO_LIMITS.memoryCount || !input.photos.every(photo => validPhoto(photo, options))) fail('Mỗi kỷ niệm có tối đa 4 ảnh hợp lệ.');
      return;
    case 'checkIn': {
      if (input.templateId !== undefined && !['single', 'halves', 'columns', 'grid'].includes(input.templateId as string)) fail('Template ảnh chưa hợp lệ.');
      if (input.utcOffsetMinutes !== undefined && (!Number.isInteger(input.utcOffsetMinutes) || (input.utcOffsetMinutes as number) < -720 || (input.utcOffsetMinutes as number) > 840)) fail('Múi giờ chưa hợp lệ.');
      if (!isInputId(input.id) || !isText(input.title, 100, true) || !isISODate(input.visitedAt)) fail('Tên, mã hoặc ngày check-in chưa hợp lệ.');
      if ((input.visitedAt as string) > today) fail('Ngày check-in cần là hôm nay hoặc một ngày đã qua.');
      if (typeof input.latitude !== 'number' || !Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90
        || typeof input.longitude !== 'number' || !Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180) fail('Vị trí check-in chưa hợp lệ.');
      if (!isText(input.note, 2000, false, true) || !isText(input.companion, 100)) fail('Lời nhắn hoặc tên người đi cùng quá dài hoặc chứa ký tự không hợp lệ.');
      if (!validPhoto(input.photo, options) || !isRecord(input.photo) || 'art' in input.photo) fail('Ảnh check-in chưa hợp lệ.');
      const photo = input.photo as Record<string, unknown>;
      if (!options.allowLocalPhotos && (typeof photo.storagePath !== 'string' || (options.userId && !photo.storagePath.startsWith(`${options.coupleId}/${options.userId}/`)))) fail('Ảnh check-in cần được tải lên kho riêng tư của bạn.');
      return;
    }
    case 'personalProfile':
      if (!isRecord(command.input) || !('birthDate' in input) || !('gender' in input)
        || (input.birthDate !== null && (!isISODate(input.birthDate) || input.birthDate > today))
        || (input.gender !== null && !['male', 'female', 'other'].includes(input.gender as string))) fail('Thông tin cá nhân chưa hợp lệ.');
      return;
    case 'couple':
      if (!isText(command.name, 60, true) || !isISODate(command.anniversaryDate)) fail('Tên không gian hoặc ngày kỷ niệm chưa hợp lệ.');
      return;
    case 'wishActive':
      if (typeof command.active !== 'boolean') fail('Trạng thái hiển thị không hợp lệ.');
      break;
    case 'prepare': case 'read': case 'wishFavorite': case 'memoryFavorite': case 'delete': case 'deleteCheckIn': break;
    default: fail('Thao tác không hợp lệ.');
  }
  if (!isInputId(command.id)) fail('Mã dữ liệu chưa hợp lệ.');
}
