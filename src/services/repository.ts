import type { WishSnapshot } from '../types/domain';

// UI and state management depend on this contract, not a backend SDK.
export interface WishRepository {
  load(): Promise<WishSnapshot>;
  save(snapshot: WishSnapshot): Promise<void>;
  reset(): Promise<WishSnapshot>;
}
