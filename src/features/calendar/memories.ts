import type { CategoryFilter, CheckIn, Memory } from '../../types/domain';

// One calendar projection: check-ins stay in their own collection, so edits and
// deletions are reflected immediately without creating duplicate saved memories.
export type CalendarMemory = Pick<Memory, 'id' | 'title' | 'category' | 'completedAt' | 'note' | 'photos'> & {
  source: 'memory' | 'checkIn';
  favorite?: boolean;
  companion?: string;
};

export function calendarMemories(memories: Memory[], checkIns: CheckIn[], filter: CategoryFilter = 'Tất cả'): CalendarMemory[] {
  return [
    ...memories.map(memory => ({ ...memory, source: 'memory' as const })),
    ...checkIns.map(checkIn => ({
      id: checkIn.id, source: 'checkIn' as const, title: checkIn.title,
      category: 'Khoảnh khắc' as const, completedAt: checkIn.visitedAt,
      note: checkIn.note, photos: [checkIn.photo], companion: checkIn.companion,
    })),
  ].filter(memory => filter === 'Tất cả' || memory.category === filter);
}
