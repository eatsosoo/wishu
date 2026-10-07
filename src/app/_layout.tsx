import '../global.css';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { PlayfairDisplay_500Medium } from '@expo-google-fonts/playfair-display/500Medium';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold';
import { NunitoSans_400Regular } from '@expo-google-fonts/nunito-sans/400Regular';
import { NunitoSans_600SemiBold } from '@expo-google-fonts/nunito-sans/600SemiBold';
import { NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans/700Bold';
import { WishStoreProvider } from '../hooks/use-wish-store';
import { LoadingState } from '../components/ui';

export default function RootLayout() {
  const { width } = useWindowDimensions();
  const [loaded, error] = useFonts({ PlayfairDisplay_500Medium, PlayfairDisplay_600SemiBold, NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold });
  const framed = Platform.OS === 'web' && width > 600;
  if (!loaded && !error) return <LoadingState />;
  return <SafeAreaProvider><WishStoreProvider><View style={s.outer}><StatusBar style="dark" /><View style={[s.app, framed && s.framed]}>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FBF1EE' }, animation: 'fade', animationDuration: 180 }} />
  </View></View></WishStoreProvider></SafeAreaProvider>;
}
const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#EEDFDB', alignItems: 'center' },
  app: { width: '100%', maxWidth: 430, flex: 1, overflow: 'hidden', backgroundColor: '#FBF1EE' },
  framed: { marginVertical: 20, borderRadius: 36, boxShadow: '0 18px 65px rgba(112, 65, 73, 0.13)' },
});
