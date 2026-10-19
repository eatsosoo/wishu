import type { WishSnapshot } from '../types/domain';

export function createEmptySnapshot(): WishSnapshot {
  return {
    wishes: [], preparations: [], memories: [], notifications: [],
    couple: { name: '', anniversaryDate: '', members: [] },
  };
}
