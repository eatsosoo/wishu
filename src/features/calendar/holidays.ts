export interface CalendarHoliday {
  id?: string;
  name: string;
  icon: 'flower' | 'bouquet' | 'balloons' | 'tree' | 'moustache' | 'heart' | 'whiteHeart' | 'birthday' | 'milestone';
  marker?: string;
  quote?: string;
}

// Gregorian dates repeat every year, independently of the device's timezone.
const holidays: Readonly<Record<string, CalendarHoliday>> = {
  '02-14': { name: 'Valentine Đỏ', icon: 'heart', quote: 'Yêu nhau mấy núi cũng trèo.' },
  '03-08': { name: 'Ngày Quốc tế Phụ nữ', icon: 'flower', quote: 'Mong bạn luôn nở rộ theo cách của riêng mình.' },
  '03-14': { name: 'Valentine Trắng', icon: 'whiteHeart', quote: 'Một lời thương gửi đi, một tấm lòng đáp lại.' },
  '06-01': { name: 'Ngày Quốc tế Thiếu nhi', icon: 'balloons', quote: 'Giữ một chút hồn nhiên, để mỗi ngày đều vui.' },
  '10-20': { name: 'Ngày Phụ nữ Việt Nam', icon: 'bouquet', quote: 'Một bông hoa đẹp, một tấm lòng thương.' },
  '11-19': { name: 'Ngày Quốc tế Nam giới', icon: 'moustache', quote: 'Mạnh mẽ cũng cần một nơi để tựa vào.' },
  '12-25': { name: 'Giáng sinh', icon: 'tree', quote: 'Có nhau, mùa đông cũng hóa ấm lòng.' },
};

export function getCalendarHoliday(month: number, day: number): CalendarHoliday | undefined {
  return holidays[`${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`];
}

export function getCalendarEvents(month: number, day: number, members: readonly { id?: string; name: string; birthDate?: string }[] = [], context?: { year: number; anniversaryDate: string }): CalendarHoliday[] {
  const holiday = getCalendarHoliday(month, day);
  const events = holiday ? [holiday] : [];
  for (const [index, member] of members.entries()) {
    if (member.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(member.birthDate) && Number(member.birthDate.slice(5, 7)) === month && Number(member.birthDate.slice(8, 10)) === day) {
      events.push({ id: `birthday-${member.id ?? index}`, name: `Sinh nhật ${member.name}`, icon: 'birthday', quote: 'Thêm một tuổi mới, thêm một năm có nhau.' });
    }
  }
  if (context && /^\d{4}-\d{2}-\d{2}$/.test(context.anniversaryDate)) {
    const start = Date.parse(`${context.anniversaryDate}T00:00:00Z`);
    if (!Number.isFinite(start) || new Date(start).toISOString().slice(0, 10) !== context.anniversaryDate) return events;
    const date = Date.UTC(context.year, month - 1, day);
    const elapsed = (date - start) / 86400000;
    // Use elapsed calendar days, matching the home screen's days-together counter.
    if ([100, 300, 1000].includes(elapsed)) events.push({
      name: `${elapsed.toLocaleString('vi-VN')} ngày bên nhau`, icon: 'milestone', marker: String(elapsed),
      quote: elapsed === 100 ? 'Trăm ngày thương, vạn điều mong cùng nhau.' : elapsed === 300 ? 'Thương nhau, ngày thường cũng thành ngày nhớ.' : 'Nghìn ngày qua, vẫn muốn nắm tay người.',
    });
    const anchor = new Date(start);
    const months = (context.year - anchor.getUTCFullYear()) * 12 + month - anchor.getUTCMonth() - 1;
    // Shorter months celebrate on their last day; always use the original day next month.
    const anniversaryDay = Math.min(anchor.getUTCDate(), new Date(Date.UTC(context.year, month, 0)).getUTCDate());
    if (months > 0 && day === anniversaryDay) events.push({
      id: 'monthly-anniversary',
      name: months % 12 === 0 ? `Kỷ niệm ${months / 12} năm bên nhau` : `Kỷ niệm ${months} tháng bên nhau`,
      icon: 'milestone', marker: String(months),
      quote: months % 12 === 0 ? 'Thuận vợ thuận chồng, tát biển Đông cũng cạn.' : 'Thêm một tháng bên nhau, thêm những điều thương nhớ.',
    });
  }
  return events;
}

export function getCalendarQuote(events: CalendarHoliday[]): string {
  return events.find(event => event.icon === 'milestone')?.quote
    ?? events.find(event => event.icon === 'birthday')?.quote
    ?? events[0]?.quote
    ?? 'Yêu nhau, một ngày bình thường cũng thành kỷ niệm.';
}
