import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { Coordinate } from './map-types';
import type { CheckIn, Photo } from '../../types/domain';

export interface CheckInDraft {
  id: string;
  edit?: string;
  photo?: Photo;
  templateId?: CheckIn['templateId'];
  point?: Coordinate;
  title: string;
  note: string;
  companion: string;
  date: string;
}
const DraftContext = createContext<{ draft: CheckInDraft | null; setDraft: Dispatch<SetStateAction<CheckInDraft | null>> } | null>(null);

export function CheckInDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<CheckInDraft | null>(null);
  return <DraftContext.Provider value={{ draft, setDraft }}>{children}</DraftContext.Provider>;
}
export function useCheckInDraft() {
  const context = useContext(DraftContext);
  if (!context) throw new Error('CheckInDraftProvider is required.');
  return context;
}
export { localDate as localToday } from '../dates';
