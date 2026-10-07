import type { MockSnapshot } from '../types/domain';

// UI and state management depend on this contract, not a backend SDK.
export interface WishRepository {
  load(): Promise<MockSnapshot>;
  save(snapshot: MockSnapshot): Promise<void>;
  reset(): Promise<MockSnapshot>;
}
