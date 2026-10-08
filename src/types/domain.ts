export const categories = ['Quà tặng', 'Du lịch', 'Ăn uống', 'Trải nghiệm', 'Khoảnh khắc'] as const;
export type Category = typeof categories[number];
export type CategoryFilter = Category | 'Tất cả';
export type PersonId = 'minh' | 'linh';
export const artNames = ['home', 'couple', 'jar', 'jarOpen', 'gift', 'openGift', 'camera', 'bear', 'bearPortrait', 'bearReference', 'travel', 'travelMemory', 'photobooth', 'concert', 'photoMemory', 'memoryOne', 'memoryTwo', 'memoryThree'] as const;
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
export interface MockSnapshot {
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
  | { kind: 'prepare' | 'read' | 'wishFavorite' | 'memoryFavorite'; id: string }
  | { kind: 'complete'; input: CompletionInput }
  | { kind: 'couple'; name: string; anniversaryDate: string };
