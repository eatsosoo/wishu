import { Stack } from 'expo-router';
import { CheckInDraftProvider } from '../../features/check-in/draft';

export default function CheckInLayout() {
  return <CheckInDraftProvider><Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} /></CheckInDraftProvider>;
}
