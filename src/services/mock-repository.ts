import { createMockSnapshot } from './mock-data';
import type { WishRepository } from './repository';
import type { MockSnapshot } from '../types/domain';

// Deliberately session-only during UI review. Refresh restores the screenshot fixtures.
// A Supabase repository can later implement the same interface.
export class MockWishRepository implements WishRepository {
  private snapshot = createMockSnapshot();
  async load(): Promise<MockSnapshot> { return JSON.parse(JSON.stringify(this.snapshot)) as MockSnapshot; }
  async save(snapshot: MockSnapshot) { this.snapshot = JSON.parse(JSON.stringify(snapshot)) as MockSnapshot; }
  async reset() { this.snapshot = createMockSnapshot(); return this.load(); }
}
