/** Calendar dates use the device's timezone, never UTC serialization. */
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const formatDate = (iso: string) => iso.split('-').reverse().join('/');

export function parseDate(value: string): string | null {
  if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value.trim())) return null;
  const [day, month, year] = value.trim().split('/').map(Number);
  if (![day, month, year].every(Number.isInteger) || !day || !month || !year || year < 1900 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1 || date.getUTCFullYear() !== year) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
