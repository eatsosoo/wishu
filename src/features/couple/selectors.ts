import type { Couple, PersonId } from '../../types/domain.ts';

export function partnerName(couple: Couple, actor: PersonId) {
  return couple.members.find(member => member.id !== actor)?.name.trim() || 'người ấy';
}

export function personalizePartnerText(text: string, name: string) {
  if (name === 'người ấy') return text;
  return text.replace(/người ấy/gi, () => name);
}

export function togetherDays(anniversaryDate: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anniversaryDate)) return 0;
  const anniversary = Date.parse(`${anniversaryDate}T00:00:00Z`);
  if (!Number.isFinite(anniversary) || !Number.isFinite(now.getTime())) return 0;
  if (new Date(anniversary).toISOString().slice(0, 10) !== anniversaryDate) return 0;
  // Compare calendar dates in the device's timezone, independent of time or DST.
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today - anniversary) / 86400000));
}
