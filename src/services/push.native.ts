import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './cloud';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});
const tokenKey = 'ourwish:push-token';
export async function registerPush(requestPermission = true): Promise<string> {
  if (!supabase) throw new Error('Chưa kết nối Supabase.');
  if (Constants.appOwnership === 'expo') throw new Error('Mở app bằng development build để bật thông báo.');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) throw new Error('Chưa cấu hình EAS project ID.');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('gifts', {
    name: 'Bất ngờ từ người ấy', importance: Notifications.AndroidImportance.HIGH, sound: 'default',
  });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Bạn chưa cho phép thông báo. Có thể bật lại trong cài đặt điện thoại.');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
  if (error) throw new Error('Chưa lưu được thiết bị nhận thông báo. Bạn thử lại nhé.');
  await AsyncStorage.setItem(tokenKey, token);
  return token;
}
export async function unregisterPush() {
  const token = await AsyncStorage.getItem(tokenKey);
  if (token && supabase) {
    const { error } = await supabase.rpc('unregister_push_token', { p_token: token });
    if (error) throw error;
  }
  await AsyncStorage.removeItem(tokenKey);
}
