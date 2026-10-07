import { router } from 'expo-router';
import { AppScreen } from '../components/AppScreen';
import { EmptyState } from '../components/ui';
export default function NotFound() { return <AppScreen><EmptyState title="Mình quay về nhé" description="Trang này chưa có trong không gian của hai đứa." action="Về trang chủ" onAction={() => router.replace('/')} /></AppScreen>; }
