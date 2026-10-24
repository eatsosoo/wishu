import { View } from 'react-native';
import { Cake, Flower2, Heart, TreePine } from 'lucide-react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { CalendarHoliday } from '../features/calendar/holidays';
import { useAppTheme } from '../hooks/use-app-theme';
import { Body } from './ui';
import { fonts } from '../constants/theme';

function HolidayIcon({ icon }: { icon: CalendarHoliday['icon'] }) {
  const { colors } = useAppTheme();
  switch (icon) {
    case 'firstLove': return <Svg width={16} height={15} viewBox="0 0 24 24">
      <Path d="M12 21 3.8 13C-2 7.2 5.5-.5 12 6 18.5-.5 26 7.2 20.2 13Z" fill={colors.rose} stroke={colors.primary} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="m12 17-4.3-4.2C4.8 9.9 8.6 6.1 12 9.5c3.4-3.4 7.2.4 4.3 3.3Z" fill={colors.primary} stroke={colors.burgundy} strokeWidth={1} strokeLinejoin="round" />
    </Svg>;
    case 'birthday': return <Cake size={12} color={colors.primary} strokeWidth={2} />;
    case 'heart': return <Heart size={12} color={colors.primary} fill={colors.primary} strokeWidth={2} />;
    case 'whiteHeart': return <Heart size={12} color={colors.burgundy} fill="#fff" strokeWidth={2} />;
    case 'milestone': return null;
    case 'flower': return <Flower2 size={12} color={colors.primary} strokeWidth={2} />;
    case 'tree': return <TreePine size={12} color="#38744C" strokeWidth={2} />;
    case 'bouquet': return <Svg width={12} height={12} viewBox="0 0 24 24">
      <Path d="m5 9 7 12 7-12M12 7v14M7 17l5 4 5-4" fill="none" stroke="#38744C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={5} cy={7} r={4} fill={colors.primary} />
      <Circle cx={19} cy={7} r={4} fill={colors.primary} />
      <Circle cx={12} cy={4} r={4} fill={colors.burgundy} />
      <Path d="m9 19 3-1 3 1-3 2Z" fill={colors.primary} />
    </Svg>;
    case 'balloons': return <Svg width={12} height={12} viewBox="0 0 24 24">
      <Path d="M7 12c-2 5 6 5 4 11M17 11c2 5-6 6-4 12" fill="none" stroke={colors.burgundy} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M7 1C0 1 0 10 7 13 14 10 14 1 7 1Z" fill={colors.primary} />
      <Path d="M17 0c-6 0-7 8 0 12 7-4 6-12 0-12Z" fill="#D59A35" />
      <Path d="m6 12-1 2h4l-1-2m8-1-1 2h4l-1-2" fill={colors.burgundy} />
    </Svg>;
    case 'moustache': return <Svg width={12} height={12} viewBox="0 0 24 24">
      <Path fill={colors.burgundy} d="M12 10C9 5 6 9 5 12c-1 2-3 2-4-1-1 6 4 8 7 6 2-1 3-2 4-4 1 2 2 3 4 4 3 2 8 0 7-6-1 3-3 3-4 1-1-3-4-7-7-2Z" />
    </Svg>;
  }
}

export function HolidayDecoration({ events, radius = 12 }: { events: CalendarHoliday[]; radius?: number }) {
  const { colors } = useAppTheme();
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', inset: 0, borderRadius: radius, borderWidth: 2.2, borderColor: colors.burgundy }}>
    <View style={{ position: 'absolute', top: 0, right: 0, maxWidth: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
      {events.map(event => <View key={event.id ?? event.name} style={{ minWidth: 12, minHeight: 13, alignItems: 'center', justifyContent: 'center' }}>{event.icon === 'milestone' ? <Body style={{ fontSize: 8, lineHeight: 11, fontFamily: fonts.bold, color: colors.burgundy, backgroundColor: colors.rose, borderRadius: 4, paddingHorizontal: 2 }}>{event.marker}</Body> : <HolidayIcon icon={event.icon} />}</View>)}
    </View>
  </View>;
}
