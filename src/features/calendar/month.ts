export function calendarMonth(year: number, month: number, fullWeeks = false) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const slots = fullWeeks ? Math.ceil((offset + count) / 7) * 7 : offset + count;
  return Array.from({ length: slots }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= count ? day : null;
  });
}
