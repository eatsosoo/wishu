import { useAppTheme, useThemeStyles } from '../hooks/use-app-theme';
import { StyleSheet, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { Body, Heading } from '../components/ui';
import { NotificationBell } from '../components/NotificationBell';
import { HomeWishJars } from '../components/HomeWishJars';
import { fonts, spacing } from '../constants/theme';
import { useWishStore } from '../hooks/use-wish-store';
import { togetherDays } from '../features/couple/selectors';
import { useLocalGreeting } from '../hooks/use-local-greeting';

export default function HomeScreen() {
  const { colors, t } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  const store = useWishStore();
  const greeting = useLocalGreeting();
  const person = store.couple.members.find(member => member.id === store.actor)!;
  return <AppScreen navigation home contentStyle={{ paddingHorizontal: 0, paddingBottom: 15 }}>
    <View style={s.greeting}>
      <View style={s.greetingCopy}>
        <Heading style={{ color: t('#6E3D49') }}>{greeting}</Heading>
        <Heading style={{ color: t('#33212B'), fontFamily: fonts.headingBold }}>{person.name} ♡</Heading>
      </View>
      <View style={s.greetingActions}>
        <NotificationBell />
      </View>
    </View>
    <View style={{ marginTop: 24 }}><HomeWishJars members={store.couple.members} wishes={store.wishes} /></View>
    <View style={s.together}><Body style={{ color: colors.burgundy, fontSize: 12 }}>Chúng ta đã bên nhau</Body><View className="flex-row items-baseline" style={{ gap: 6 }}><Heading style={{ fontSize: 37, lineHeight: 47 }}>{togetherDays(store.couple.anniversaryDate)}</Heading><Heading style={{ fontSize: 22 }}>ngày</Heading></View></View>
  </AppScreen>;
}
const baseStyles = StyleSheet.create({
  greeting: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: spacing.lg },
  greetingCopy: { flex: 1, minWidth: 0 },
  greetingActions: { alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  together: { marginTop: 18, marginHorizontal: spacing.lg, borderRadius: 25, backgroundColor: 'rgba(255,248,241,0.72)', paddingVertical: 17, alignItems: 'center' },
});
