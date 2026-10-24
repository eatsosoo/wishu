export const formatCost = (amount: number) => `~ ${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
export function formatBudgetInput(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
export { formatDate, parseDate } from '../dates.ts';
