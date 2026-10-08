import { Pressable, StyleSheet, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { router } from 'expo-router';
import { useWishStore } from '../hooks/use-wish-store';
import { useAppTheme } from '../hooks/use-app-theme';
import { Body } from './ui';

export function NotificationBell() {
  const { notifications } = useWishStore();
  const { colors } = useAppTheme();
  const unread = notifications.filter(item => !item.readAt).length;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Thông báo, ${unread} chưa đọc`} onPress={() => router.push('/notifications')} style={[styles.button, { backgroundColor: colors.surface }]}>
    <Bell size={21} color={colors.burgundy} strokeWidth={1.7} />
    {unread > 0 ? <View style={[styles.badge, { backgroundColor: colors.primary }]}><Body style={styles.count}>{unread > 9 ? '9+' : unread}</Body></View> : null}
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  badge: { position: 'absolute', right: -2, top: -2, minWidth: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  count: { color: '#fff', fontSize: 10, lineHeight: 14 },
});
