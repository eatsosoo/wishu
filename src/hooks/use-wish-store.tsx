import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMockSnapshot } from '../services/mock-data';
import { MockWishRepository } from '../services/mock-repository';
import * as actions from '../services/wish-actions';
import type { CompletionInput, MockSnapshot, PersonId, WishInput } from '../types/domain';

const repository = new MockWishRepository();
function useStoreValue() {
  const [snapshot, setSnapshot] = useState(createMockSnapshot);
  const [actor, setActor] = useState<PersonId>('minh');
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    let active = true;
    AsyncStorage.multiGet(['ourwish:onboarded', 'ourwish:demo-session']).then(values => {
      if (!active) return;
      setOnboarded(values[0][1] === 'yes');
      const person = values[1][1];
      if (person === 'minh' || person === 'linh') { setActor(person); setSignedIn(true); }
    }).catch(() => { if (active) setStorageError('Không thể lưu phiên trên thiết bị này.'); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  async function finishOnboarding() {
    try { await AsyncStorage.setItem('ourwish:onboarded', 'yes'); } catch { setStorageError('Không thể ghi nhớ màn chào trên thiết bị này.'); }
    setOnboarded(true);
  }
  async function login(person: PersonId) {
    try { await AsyncStorage.setItem('ourwish:demo-session', person); } catch { setStorageError('Phiên này sẽ không được lưu khi đóng ứng dụng.'); }
    setActor(person); setSignedIn(true);
  }
  async function logout() {
    try { await AsyncStorage.removeItem('ourwish:demo-session'); } catch { setStorageError('Không thể xóa phiên đã lưu. Bạn thử lại nhé.'); return; }
    setSignedIn(false); setActor('minh'); setSnapshot(createMockSnapshot());
  }
  function update(transform: (previous: MockSnapshot) => MockSnapshot) {
    setSnapshot(previous => {
      const next = transform(previous);
      void repository.save(next);
      return next;
    });
  }
  return {
    ...snapshot, actor, setActor: (person: PersonId) => { void login(person); }, ready, onboarded, signedIn, finishOnboarding, login, logout, storageError,
    preparations: actions.privatePreparations(snapshot, actor),
    addWish: (input: WishInput) => update(previous => actions.addWish(previous, input)),
    prepareWish: (wishId: string) => update(previous => actions.prepareWish(previous, wishId, actor)),
    completeWish: (input: CompletionInput) => update(previous => actions.completeWish(previous, input, actor)),
    toggleWishFavorite: (id: string) => update(previous => ({ ...previous, wishes: previous.wishes.map(wish => wish.id === id ? { ...wish, favorite: !wish.favorite } : wish) })),
    toggleMemoryFavorite: (id: string) => update(previous => ({ ...previous, memories: previous.memories.map(memory => memory.id === id ? { ...memory, favorite: !memory.favorite } : memory) })),
    updateCouple: (name: string, anniversaryDate: string) => update(previous => ({ ...previous, couple: { ...previous.couple, name, anniversaryDate } })),
    reset: () => { const seed = createMockSnapshot(); setSnapshot(seed); void repository.reset(); },
  };
}
const StoreContext = createContext<ReturnType<typeof useStoreValue> | null>(null);
export function WishStoreProvider({ children }: { children: ReactNode }) {
  return <StoreContext.Provider value={useStoreValue()}>{children}</StoreContext.Provider>;
}
export function useWishStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('WishStoreProvider is required.');
  return store;
}
