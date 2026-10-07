// Frozen for screenshot review. Real dates belong to the later backend phase.
export const mockToday = '2025-06-14';
export function togetherDays(anniversaryDate: string) {
  return Math.max(0, Math.floor((Date.parse(`${mockToday}T00:00:00Z`) - Date.parse(`${anniversaryDate}T00:00:00Z`)) / 86400000));
}
