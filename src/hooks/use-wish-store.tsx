import { createContext, useContext, useState, type ReactNode } from 'react';
import { createMockSnapshot } from '../services/mock-data';
import { MockWishRepository } from '../services/mock-repository';
import * as actions from '../services/wish-actions';
import type { CompletionInput, MockSnapshot, PersonId, WishInput } from '../types/domain';

const repository = new MockWishRepository();
function useStoreValue() {
  const [snapshot, setSnapshot] = useState(createMockSnapshot);
  const [actor, setActor] = useState<PersonId>('minh');
  function update(transform: (previous: MockSnapshot) => MockSnapshot) {
    setSnapshot(previous => {
      const next = transform(previous);
      void repository.save(next);
      return next;
    });
  }
  return {
    ...snapshot, actor, setActor,
    preparations: actions.privatePreparations(snapshot, actor),
    addWish: (input: WishInput) => update(previous => actions.addWish(previous, input)),
    prepareWish: (wishId: string) => update(previous => actions.prepareWish(previous, wishId, actor)),
    completeWish: (input: CompletionInput) => update(previous => actions.completeWish(previous, input, actor)),
    toggleWishFavorite: (id: string) => update(previous => ({ ...previous, wishes: previous.wishes.map(wish => wish.id === id ? { ...wish, favorite: !wish.favorite } : wish) })),
    toggleMemoryFavorite: (id: string) => update(previous => ({ ...previous, memories: previous.memories.map(memory => memory.id === id ? { ...memory, favorite: !memory.favorite } : memory) })),
    updateCouple: (name: string, anniversaryDate: string) => update(previous => ({ ...previous, couple: { ...previous.couple, name, anniversaryDate } })),
    reset: () => { const seed = createMockSnapshot(); setSnapshot(seed); setActor('minh'); void repository.reset(); },
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
