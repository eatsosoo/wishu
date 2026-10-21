import { parseDate } from '../wishes/format.ts';
import type { Gender, PersonalProfileInput } from '../../types/domain';

export function readProfile(value: unknown): PersonalProfileInput {
  if (!value || typeof value !== 'object') return { birthDate: null, gender: null };
  const { birthDate, gender } = value as PersonalProfileInput;
  return {
    birthDate: typeof birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : null,
    gender: gender === 'male' || gender === 'female' || gender === 'other' ? gender : null,
  };
}

export function completeProfile(value: unknown, now = new Date()): value is { birthDate: string; gender: Gender } {
  if (!value || typeof value !== 'object') return false;
  const { birthDate, gender } = value as PersonalProfileInput;
  if (typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return parseDate(birthDate.split('-').reverse().join('/')) === birthDate && birthDate <= today
    && (gender === 'male' || gender === 'female' || gender === 'other');
}
