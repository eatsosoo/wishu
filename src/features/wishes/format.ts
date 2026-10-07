export const formatCost = (amount: number) => `~ ${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
export const formatDate = (iso: string) => iso.split('-').reverse().join('/');
export function parseDate(value: string): string | null {
  const parts = value.trim().split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (![day, month, year].every(Number.isInteger) || !day || !month || !year || year < 1900 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1 || date.getUTCFullYear() !== year) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
