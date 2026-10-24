import type { AppNotification } from '../types/domain.ts';
import { localDate } from './dates.ts';

export function groupNotificationsByDate(notifications: readonly AppNotification[]) {
  const groups = new Map<string, AppNotification[]>();
  const sorted = [...notifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  for (const notification of sorted) {
    const date = localDate(new Date(notification.createdAt));
    const items = groups.get(date);
    if (items) items.push(notification);
    else groups.set(date, [notification]);
  }
  return Array.from(groups, ([date, items]) => ({ date, items }));
}
