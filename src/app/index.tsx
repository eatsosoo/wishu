import { useAppTheme, useThemeStyles } from '../hooks/use-app-theme';
import { StyleSheet, View } from 'react-native';
import { CalendarHeart } from 'lucide-react-native';
import { router } from 'expo-router';
import { AppScreen } from '../components/AppScreen';
import { Body, Heading, IconButton } from '../components/ui';
import { NotificationBell } from '../components/NotificationBell';
import { Artwork } from '../components/Artwork';
import { WishJar } from '../components/WishJar';
import { fonts, spacing } from '../constants/theme';
import { useWishStore } from '../hooks/use-wish-store';
import { togetherDays } from '../features/couple/selectors';

export default function HomeScreen() {
  const { colors, t } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  const store = useWishStore();
  const person = store.couple.members.find(member => member.id === store.actor)!;
  return <AppScreen navigation home contentStyle={{ paddingHorizontal: 0, paddingBottom: 15 }}>
    <View style={s.greeting}>
      <View style={s.greetingCopy}>
        <Heading style={{ color: t('#6E3D49') }}>Chào buổi sáng,</Heading>
        <Heading style={{ color: t('#33212B'), fontFamily: fonts.headingBold }}>{person.name} ♡</Heading>
      </View>
      <View style={s.greetingActions}>
        <NotificationBell />
        <IconButton icon={CalendarHeart} label="Ngày kỷ niệm của chúng ta" onPress={() => router.push('/us')} />
      </View>
    </View>
    <View style={{ marginTop: 24 }}><Artwork name="home" label="Hai hũ điều ước chứa những ngôi sao và trái tim pastel" />{store.couple.members.map((member, index) => <WishJar key={member.id} owner={member.id} name={member.name} count={store.wishes.filter(wish => wish.createdBy === member.id).length} side={index === 0 ? 'left' : 'right'} />)}</View>
    <View style={s.together}><Body style={{ color: colors.burgundy, fontSize: 12 }}>Chúng ta đã bên nhau</Body><View className="flex-row items-baseline" style={{ gap: 6 }}><Heading style={{ fontSize: 37, lineHeight: 47 }}>{togetherDays(store.couple.anniversaryDate)}</Heading><Heading style={{ fontSize: 22 }}>ngày</Heading></View></View>
  </AppScreen>;
}
const baseStyles = StyleSheet.create({
  greeting: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: spacing.lg },
  greetingCopy: { flex: 1, minWidth: 0 },
  greetingActions: { alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  together: { marginTop: 18, marginHorizontal: spacing.lg, borderRadius: 25, backgroundColor: 'rgba(255,248,241,0.72)', paddingVertical: 17, alignItems: 'center' },
});
