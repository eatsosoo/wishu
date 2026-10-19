import type { CompletionInput, WishSnapshot, PersonId, WishInput, WishCommand } from '../types/domain.ts';
import { PHOTO_LIMITS } from '../features/photos/limits.ts';

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function addWish(snapshot: WishSnapshot, input: WishInput): WishSnapshot {
  return { ...snapshot, wishes: [{ ...input, id: makeId('wish'), favorite: false }, ...snapshot.wishes] };
}
export function prepareWish(snapshot: WishSnapshot, wishId: string, actor: PersonId): WishSnapshot {
  const wish = snapshot.wishes.find(item => item.id === wishId);
  if (!wish || wish.createdBy === actor) throw new Error('Chỉ có thể chuẩn bị điều ước của người ấy.');
  if (snapshot.preparations.some(item => item.wishId === wishId && item.preparedBy === actor && item.status === 'preparing')) return snapshot;
  return { ...snapshot, preparations: [{ id: makeId('preparation'), wishId, preparedBy: actor, status: 'preparing', startedAt: new Date().toISOString().slice(0, 10) }, ...snapshot.preparations] };
}
export function completeWish(snapshot: WishSnapshot, input: CompletionInput, actor: PersonId): WishSnapshot {
  if (input.photos.length > PHOTO_LIMITS.memoryCount) throw new Error('Mỗi kỷ niệm có tối đa 8 ảnh.');
  const preparation = snapshot.preparations.find(item => item.wishId === input.wishId && item.preparedBy === actor && item.status === 'preparing');
  const wish = snapshot.wishes.find(item => item.id === input.wishId);
  if (!preparation && snapshot.preparations.some(item => item.wishId === input.wishId && item.preparedBy === actor && item.status === 'completed')) return snapshot;
  if (!wish || !preparation) throw new Error('Điều ước này chưa có trong danh sách bạn đang chuẩn bị.');
  if (wish.createdBy === actor) throw new Error('Chỉ có thể hoàn thành điều ước của người ấy.');
  const memoryId = makeId('memory');
  return {
    ...snapshot,
    preparations: snapshot.preparations.map(item => item.id === preparation.id ? { ...item, status: 'completed', completedAt: input.completedAt } : item),
    memories: [{ id: memoryId, wishId: wish.id, title: wish.title, category: wish.category, completedAt: input.completedAt, note: input.note, photos: input.photos.length ? input.photos : [wish.cover], favorite: false }, ...snapshot.memories],
    notifications: [{ id: makeId('gift'), wishId: wish.id, memoryId, sender: actor, recipient: wish.createdBy, title: wish.title, createdAt: new Date().toISOString() }, ...snapshot.notifications],
  };
}
export function readGift(snapshot: WishSnapshot, id: string, actor: PersonId): WishSnapshot {
  const gift = snapshot.notifications.find(item => item.id === id && item.recipient === actor);
  if (!gift || gift.readAt) return snapshot;
  return { ...snapshot, notifications: snapshot.notifications.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item) };
}
export const privatePreparations = (snapshot: WishSnapshot, actor: PersonId) => snapshot.preparations.filter(item => item.preparedBy === actor);

export function deleteWish(snapshot: WishSnapshot, id: string, actor: PersonId): WishSnapshot {
  const wish = snapshot.wishes.find(item => item.id === id);
  if (!wish) return snapshot;
  if (wish.createdBy !== actor) throw new Error('Bạn chỉ có thể xoá điều ước của mình.');
  return {
    ...snapshot,
    wishes: snapshot.wishes.filter(item => item.id !== id),
    preparations: snapshot.preparations.filter(item => item.wishId !== id),
  };
}

export function applyWishCommand(snapshot: WishSnapshot, command: WishCommand, actor: PersonId): WishSnapshot {
  switch (command.kind) {
    case 'add': return addWish(snapshot, { ...command.input, createdBy: actor });
    case 'prepare': return prepareWish(snapshot, command.id, actor);
    case 'complete': return completeWish(snapshot, command.input, actor);
    case 'read': return readGift(snapshot, command.id, actor);
    case 'delete': return deleteWish(snapshot, command.id, actor);
    case 'wishFavorite': return { ...snapshot, wishes: snapshot.wishes.map(wish => wish.id === command.id ? { ...wish, favorite: !wish.favorite } : wish) };
    case 'memoryFavorite': return { ...snapshot, memories: snapshot.memories.map(memory => memory.id === command.id ? { ...memory, favorite: !memory.favorite } : memory) };
    case 'couple': return { ...snapshot, couple: { ...snapshot.couple, name: command.name, anniversaryDate: command.anniversaryDate } };
  }
}
