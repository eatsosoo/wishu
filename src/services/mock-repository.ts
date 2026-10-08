import { createMockSnapshot } from './mock-data';
import type { WishRepository } from './repository';
import type { MockSnapshot } from '../types/domain';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The demo remains usable without cloud credentials, including after a reload.
export class MockWishRepository implements WishRepository {
  private snapshot = createMockSnapshot();
  private writes = Promise.resolve();
  async load(): Promise<MockSnapshot> {
    const saved = await AsyncStorage.getItem('ourwish:snapshot:v1');
    if (saved) { const value = JSON.parse(saved) as MockSnapshot; this.snapshot = { ...value, notifications: value.notifications ?? [] }; }
    return this.snapshot;
  }
  async save(snapshot: MockSnapshot) {
    const serialized = JSON.stringify(snapshot);
    const write = this.writes.catch(() => {}).then(() => AsyncStorage.setItem('ourwish:snapshot:v1', serialized));
    this.writes = write;
    await write;
    this.snapshot = snapshot;
  }
  async reset() { const seed = createMockSnapshot(); await this.save(seed); return seed; }
}
