import { useAppTheme } from '../hooks/use-app-theme';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppScreen } from '../components/AppScreen';
import { ClayObject } from '../components/Artwork';
import { Body, EmptyState, Heading, IconButton } from '../components/ui';
import { MemoryCard, WishCard } from '../components/Cards';
import { useWishStore } from '../hooks/use-wish-store';

type PreparingTab = 'preparing' | 'completed';
const tabTransition = { duration: 280, easing: Easing.out(Easing.cubic) };

export default function Preparing() {
  const { colors, t } = useAppTheme();

  const store = useWishStore();
  const [tab, setTab] = useState<PreparingTab>('preparing');
  const [tabsWidth, setTabsWidth] = useState(0);
  const tabPosition = useSharedValue(0);
  const contentOffset = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const tabWidth = Math.max(0, tabsWidth - 4) / 2;
  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabPosition.get() * tabWidth }],
  }), [tabWidth]);
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: contentOffset.get() }],
    opacity: contentOpacity.get(),
  }));

  function selectTab(value: PreparingTab) {
    if (value === tab) return;
    setTab(value);
    tabPosition.set(withTiming(value === 'completed' ? 1 : 0, tabTransition));
    contentOffset.set(value === 'completed' ? 24 : -24);
    contentOpacity.set(0.6);
    contentOffset.set(withTiming(0, tabTransition));
    contentOpacity.set(withTiming(1, tabTransition));
  }

  const preparing = store.preparations.filter(item => item.status === 'preparing');
  return <AppScreen>
    <View><ClayObject name="gift" width={260} height={153} style={{ alignSelf: 'center' }} /><View style={{ position: 'absolute', top: 0, left: 0 }}><IconButton icon={ChevronLeft} label="Quay lại" onPress={() => router.canGoBack() ? router.back() : router.replace('/wishes')} /></View></View>
    <Heading style={{ textAlign: 'center', marginTop: 18 }}>Đang chuẩn bị</Heading><Body style={{ textAlign: 'center', color: t('#915365'), marginTop: 8 }}>Những điều bất ngờ đang được{ '\n' }chuẩn bị cho người ấy ♡</Body>
    <View onLayout={event => setTabsWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', marginTop: 25, marginBottom: 17, backgroundColor: t('#F0DCDA'), borderRadius: 999, padding: 2 }}>
      {tabsWidth > 0 && <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 2, bottom: 2, left: 2, width: tabWidth, borderRadius: 999, backgroundColor: colors.primary }, highlightStyle]} />}
      {([['preparing', `Đang chuẩn bị (${preparing.length})`], ['completed', `Đã hoàn thành (${store.memories.length})`]] as const).map(([value, title]) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => selectTab(value)} style={{ flex: 1, borderRadius: 999, paddingVertical: 11, alignItems: 'center' }}><Body style={{ fontSize: 13, color: tab === value ? t('#fff') : t('#9B6371') }}>{title}</Body></Pressable>)}
    </View>
    <Animated.View style={contentStyle}>
    {tab === 'preparing' ? preparing.map(preparation => {
      const wish = store.wishes.find(item => item.id === preparation.wishId);
      return wish ? <WishCard key={preparation.id} wish={wish} preparation={preparation} /> : null;
    }) : <View className="flex-row flex-wrap justify-between">{store.memories.map(memory => <MemoryCard key={memory.id} memory={memory} onFavorite={() => store.toggleMemoryFavorite(memory.id)} />)}</View>}
    {tab === 'preparing' && !preparing.length && <EmptyState title="Một bất ngờ đang chờ bạn" description="Ghé hũ của người ấy, chọn một điều ước để chuẩn bị nhé." action="Mở hũ của người ấy" onAction={() => router.push({ pathname: '/wishes', params: { owner: store.actor === 'minh' ? 'linh' : 'minh' } })} />}
    </Animated.View>
  </AppScreen>;
}
