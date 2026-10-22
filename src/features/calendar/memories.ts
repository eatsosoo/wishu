import { categories, type Category, type CategoryFilter, type CheckIn, type Memory } from '../../types/domain.ts';

export function parseMemoryCategories(value: string | string[] | undefined): Category[] {
  const values = (Array.isArray(value) ? value : [value ?? '']).flatMap(item => item.split(','));
  return categories.filter(category => values.includes(category));
}

// One calendar projection: check-ins stay in their own collection, so edits and
// deletions are reflected immediately without creating duplicate saved memories.
export type CalendarMemory = Pick<Memory, 'id' | 'title' | 'category' | 'completedAt' | 'note' | 'photos'> & {
  source: 'memory' | 'checkIn';
  favorite?: boolean;
  companion?: string;
};

export function calendarMemories(memories: Memory[], checkIns: CheckIn[], filter: CategoryFilter | readonly Category[] = 'Tất cả'): CalendarMemory[] {
  const selected = typeof filter === 'string' ? (filter === 'Tất cả' ? [] : [filter]) : filter;
  return [
    ...memories.map(memory => ({ ...memory, source: 'memory' as const })),
    ...checkIns.map(checkIn => ({
      id: checkIn.id, source: 'checkIn' as const, title: checkIn.title,
      category: 'Khoảnh khắc' as const, completedAt: checkIn.visitedAt,
      note: checkIn.note, photos: [checkIn.photo], companion: checkIn.companion,
    })),
  ].filter(memory => !selected.length || selected.includes(memory.category));
}
