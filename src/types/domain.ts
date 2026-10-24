export const categories = ['Quà tặng', 'Du lịch', 'Ăn uống', 'Trải nghiệm', 'Khoảnh khắc'] as const;
export type Category = typeof categories[number];
export type CategoryFilter = Category | 'Tất cả';
export type PersonId = 'minh' | 'linh';
export type Gender = 'male' | 'female' | 'other';
export interface PersonalProfileInput { birthDate: string | null; gender: Gender | null }
export const artNames = ['home', 'couple', 'jar', 'jarOpen', 'gift', 'openGift', 'camera', 'bear', 'bearPortrait', 'bearReference', 'travel', 'travelMemory', 'photobooth', 'concert', 'photoMemory', 'memoryOne', 'memoryTwo', 'memoryThree', 'categoryGift', 'categoryTravel', 'categoryDining', 'categoryExperience', 'categoryMoments'] as const;
export type ArtName = typeof artNames[number];
export type Photo = { art: ArtName } | { uri: string; storagePath?: string; private?: boolean };
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
export interface CheckIn {
  id: string;
  createdBy: PersonId;
  title: string;
  latitude: number;
  longitude: number;
  visitedAt: string;
  companion: string;
  note: string;
  photo: Photo;
  templateId?: 'single' | 'halves' | 'columns' | 'grid';
}
export type CheckInInput = Omit<CheckIn, 'createdBy'> & { utcOffsetMinutes?: number };
export interface Couple {
  name: string;
  anniversaryDate: string;
  members: { id: PersonId; name: string; birthDate?: string; gender?: Gender; joined?: boolean }[];
}
interface NotificationBase {
  id: string;
  sender: PersonId;
  recipient: PersonId;
  title: string;
  createdAt: string;
  readAt?: string;
}
export interface GiftNotification extends NotificationBase {
  kind?: 'gift';
  wishId: string;
  memoryId: string;
}
export interface CheckInNotification extends NotificationBase {
  kind: 'checkIn';
  checkInId: string;
}
export type AppNotification = GiftNotification | CheckInNotification;
// API view assembled from relational tables; also used by local test fixtures.
export interface WishSnapshot {
  checkIns?: CheckIn[];
  wishes: Wish[];
  preparations: Preparation[];
  memories: Memory[];
  couple: Couple;
  notifications: AppNotification[];
}
export type WishInput = Omit<Wish, 'id' | 'favorite'>;
export interface CompletionInput { wishId: string; completedAt: string; note: string; photos: Photo[] }
export type WishCommand =
  | { kind: 'checkIn'; input: CheckInInput }
  | { kind: 'deleteCheckIn'; id: string }
  | { kind: 'add'; input: WishInput }
  | { kind: 'wishActive'; id: string; active: boolean }
  | { kind: 'personalProfile'; input: PersonalProfileInput }
  | { kind: 'prepare' | 'read' | 'wishFavorite' | 'memoryFavorite' | 'delete'; id: string }
  | { kind: 'complete'; input: CompletionInput }
  | { kind: 'couple'; name: string; anniversaryDate: string };
