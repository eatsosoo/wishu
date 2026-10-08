import type { MockSnapshot } from '../types/domain';

export function createEmptySnapshot(): MockSnapshot {
  return {
    wishes: [], preparations: [], memories: [], notifications: [],
    couple: { name: '', anniversaryDate: '', members: [] },
  };
}
