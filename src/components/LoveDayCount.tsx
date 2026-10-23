import { Body } from './ui';
import { useAppTheme } from '../hooks/use-app-theme';
import { togetherDays } from '../features/couple/selectors';

export function LoveDayCount({ anniversaryDate, date }: { anniversaryDate: string; date: string }) {
  const { colors } = useAppTheme();
  // Parse at local noon so selecting a calendar date never shifts to yesterday.
  const days = togetherDays(anniversaryDate, new Date(`${date}T12:00:00`));
  return <Body accessibilityLiveRegion="polite" style={{ textAlign: 'center', color: colors.primary, fontWeight: '600' }}>
    {anniversaryDate ? `${days.toLocaleString('vi-VN')} ngày đã yêu ♡` : 'Thêm ngày bắt đầu yêu để đếm ngày ♡'}
  </Body>;
}
