import { router } from 'expo-router';
import { AppHeader, AppScreen } from '../components/AppScreen';
import { AvatarStudio } from '../features/avatar/AvatarStudio';
import { useWishStore } from '../hooks/use-wish-store';

export default function AvatarScreen() {
  const store = useWishStore();
  const userId = store.session?.user.id ?? `demo:${store.actor}`;
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/us');
  }

  return <AppScreen>
    <AppHeader title="Tùy chỉnh avatar" back onBack={goBack} />
    <AvatarStudio key={`${userId}:${store.personalProfile.gender}`} userId={userId} gender={store.personalProfile.gender} onCancel={goBack} />
  </AppScreen>;
}
