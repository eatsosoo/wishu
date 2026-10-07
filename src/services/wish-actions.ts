import type { CompletionInput, MockSnapshot, PersonId, WishInput } from '../types/domain';

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function addWish(snapshot: MockSnapshot, input: WishInput): MockSnapshot {
  return { ...snapshot, wishes: [{ ...input, id: makeId('wish'), favorite: false }, ...snapshot.wishes] };
}
export function prepareWish(snapshot: MockSnapshot, wishId: string, actor: PersonId): MockSnapshot {
  const wish = snapshot.wishes.find(item => item.id === wishId);
  if (!wish || wish.createdBy === actor) throw new Error('Chỉ có thể chuẩn bị điều ước của người ấy.');
  if (snapshot.preparations.some(item => item.wishId === wishId && item.preparedBy === actor && item.status === 'preparing')) return snapshot;
  return { ...snapshot, preparations: [{ id: makeId('preparation'), wishId, preparedBy: actor, status: 'preparing', startedAt: '2024-10-20' }, ...snapshot.preparations] };
}
export function completeWish(snapshot: MockSnapshot, input: CompletionInput, actor: PersonId): MockSnapshot {
  const preparation = snapshot.preparations.find(item => item.wishId === input.wishId && item.preparedBy === actor && item.status === 'preparing');
  const wish = snapshot.wishes.find(item => item.id === input.wishId);
  if (!preparation && snapshot.preparations.some(item => item.wishId === input.wishId && item.preparedBy === actor && item.status === 'completed')) return snapshot;
  if (!wish || !preparation) throw new Error('Điều ước này chưa có trong danh sách bạn đang chuẩn bị.');
  return {
    ...snapshot,
    preparations: snapshot.preparations.map(item => item.id === preparation.id ? { ...item, status: 'completed', completedAt: input.completedAt } : item),
    memories: [{ id: makeId('memory'), wishId: wish.id, title: wish.title, category: wish.category, completedAt: input.completedAt, note: input.note, photos: input.photos.length ? input.photos : [wish.cover], favorite: false }, ...snapshot.memories],
  };
}
export const privatePreparations = (snapshot: MockSnapshot, actor: PersonId) => snapshot.preparations.filter(item => item.preparedBy === actor);
