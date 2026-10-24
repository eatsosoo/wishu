import { AppThemeProvider, useAppTheme, useThemeStyles } from '../hooks/use-app-theme';
import '../global.css';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { NunitoSans_400Regular } from '@expo-google-fonts/nunito-sans/400Regular';
import { NunitoSans_600SemiBold } from '@expo-google-fonts/nunito-sans/600SemiBold';
import { NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans/700Bold';
import { WishStoreProvider, useWishStore } from '../hooks/use-wish-store';
import { LoadingState } from '../components/ui';
import { NotificationBridge } from '../components/NotificationBridge';
import { NavigationHighlightProvider } from '../hooks/use-navigation-highlight';
import { PopupLayer, PopupMessage, PopupProvider } from '../components/PopupMessage';

export default function RootLayout() {
  return <AppThemeProvider><RootContent /></AppThemeProvider>;
}
function RootContent() {
  const { id } = useAppTheme();
  const s = useThemeStyles(baseStyles);

  const { width } = useWindowDimensions();
  const [loaded, error] = useFonts({
    'Pacifico-Regular': require('../../assets/fonts/Pacifico-Regular.ttf'),
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });
  const framed = Platform.OS === 'web' && width > 600;
  if (!loaded && !error) return <LoadingState fontsReady={false} />;
  return <SafeAreaProvider><PopupProvider><WishStoreProvider><View style={s.outer}><StatusBar style={id === 'monochrome' ? 'light' : 'dark'} /><View style={[s.app, framed && s.framed]}>
    <PopupLayer><NavigationHighlightProvider><SessionNavigator /></NavigationHighlightProvider>
    <NotificationBridge />
    </PopupLayer>
  </View></View></WishStoreProvider></PopupProvider></SafeAreaProvider>;
}
function SessionNavigator() {
  const { t } = useAppTheme();

  const { ready, accountReady, onboarded, signedIn, accountInactive, paired, profileComplete, storageError } = useWishStore();
  const activeSession = signedIn && !accountInactive;
  if (!ready || !accountReady) return <LoadingState />;
  return <><PopupMessage message={storageError} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t('#FBF1EE') }, animation: 'fade', animationDuration: 180 }}>
    <Stack.Protected guard={!onboarded}><Stack.Screen name="onboarding" /></Stack.Protected>
    <Stack.Protected guard={onboarded && !signedIn}><Stack.Screen name="login" /></Stack.Protected>
    <Stack.Protected guard={onboarded && signedIn && accountInactive}><Stack.Screen name="inactive" /></Stack.Protected>
    <Stack.Protected guard={onboarded && activeSession && !profileComplete}><Stack.Screen name="complete-profile" /></Stack.Protected>
    <Stack.Protected guard={onboarded && activeSession && profileComplete && !paired}><Stack.Screen name="pair" /></Stack.Protected>
    <Stack.Protected guard={onboarded && activeSession && profileComplete && paired}>
      <Stack.Screen name="notifications" /><Stack.Screen name="gift/[id]" /><Stack.Screen name="avatar" />
      <Stack.Screen name="check-in-map" /><Stack.Screen name="check-in" />
      <Stack.Screen name="index" /><Stack.Screen name="wishes" /><Stack.Screen name="wish/new" /><Stack.Screen name="wish/[id]/index" /><Stack.Screen name="wish/[id]/complete" /><Stack.Screen name="preparing" /><Stack.Screen name="memories" /><Stack.Screen name="memory/[id]" /><Stack.Screen name="memory-day/[date]" /><Stack.Screen name="us" /><Stack.Screen name="+not-found" />
    </Stack.Protected>
  </Stack></>;
}
const baseStyles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#EEDFDB', alignItems: 'center' },
  app: { width: '100%', maxWidth: 430, flex: 1, overflow: 'hidden', backgroundColor: '#FBF1EE' },
  framed: { marginVertical: 20, borderRadius: 36, boxShadow: '0 18px 65px rgba(112, 65, 73, 0.13)' },
});
