export const categories = ['Quà tặng', 'Du lịch', 'Ăn uống', 'Trải nghiệm', 'Khoảnh khắc'] as const;
export type Category = typeof categories[number];
export type CategoryFilter = Category | 'Tất cả';
export type PersonId = 'minh' | 'linh';
export type Gender = 'male' | 'female' | 'other';
export interface PersonalProfileInput { birthDate: string | null; gender: Gender | null }
export const artNames = ['home', 'couple', 'jar', 'jarOpen', 'gift', 'openGift', 'camera', 'bear', 'bearPortrait', 'bearReference', 'travel', 'travelMemory', 'photobooth', 'concert', 'photoMemory', 'memoryOne', 'memoryTwo', 'memoryThree', 'categoryGift', 'categoryTravel', 'categoryDining', 'categoryExperience', 'categoryMoments'] as const;
export type ArtName = typeof artNames[number];
export type Photo = { art: ArtName } | { uri: string; storagePath?: string };
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
  active?: boolean; // Older clients omit this field; existing wishes remain visible.
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
  members: { id: PersonId; name: string; birthDate?: string; gender?: Gender; joined?: boolean }[];
}
export interface GiftNotification {
  id: string;
  wishId: string;
  memoryId: string;
  sender: PersonId;
  recipient: PersonId;
  title: string;
  createdAt: string;
  readAt?: string;
}
// API view assembled from relational tables; also used by local test fixtures.
export interface WishSnapshot {
  wishes: Wish[];
  preparations: Preparation[];
  memories: Memory[];
  couple: Couple;
  notifications: GiftNotification[];
}
export type WishInput = Omit<Wish, 'id' | 'favorite'>;
export interface CompletionInput { wishId: string; completedAt: string; note: string; photos: Photo[] }
export type WishCommand =
  | { kind: 'add'; input: WishInput }
  | { kind: 'wishActive'; id: string; active: boolean }
  | { kind: 'personalProfile'; input: PersonalProfileInput }
  | { kind: 'prepare' | 'read' | 'wishFavorite' | 'memoryFavorite' | 'delete'; id: string }
  | { kind: 'complete'; input: CompletionInput }
  | { kind: 'couple'; name: string; anniversaryDate: string };
