export const categories = ['Quà tặng', 'Du lịch', 'Ăn uống', 'Trải nghiệm', 'Khoảnh khắc'] as const;
export type Category = typeof categories[number];
export type CategoryFilter = Category | 'Tất cả';
export type PersonId = 'minh' | 'linh';
export type ArtName = 'home' | 'couple' | 'jar' | 'gift' | 'openGift' | 'camera' | 'bear' | 'bearPortrait' | 'bearReference' | 'travel' | 'travelMemory' | 'photobooth' | 'concert' | 'photoMemory' | 'memoryOne' | 'memoryTwo' | 'memoryThree';
export type Photo = { art: ArtName } | { uri: string };
export interface Wish {
  id: string;
  createdBy: PersonId;
  title: string;
  description: string;
  shortDescription?: string;
  category: Category;
  estimatedCost: number;
  priority: number;
  referenceUrl: string;
  cover: Photo;
  targetDate?: string;
  favorite: boolean;
}
export interface Preparation {
  id: string;
  wishId: string;
  preparedBy: PersonId;
  status: 'preparing' | 'completed';
  startedAt: string;
  completedAt?: string;
}
export interface Memory {
  id: string;
  wishId: string;
  title: string;
  category: Category;
  completedAt: string;
  note: string;
  photos: Photo[];
  favorite: boolean;
}
export interface Couple {
  name: string;
  anniversaryDate: string;
  members: { id: PersonId; name: string }[];
}
export interface MockSnapshot {
  wishes: Wish[];
  preparations: Preparation[];
  memories: Memory[];
  couple: Couple;
}
export type WishInput = Omit<Wish, 'id' | 'favorite'>;
export interface CompletionInput { wishId: string; completedAt: string; note: string; photos: Photo[] }
