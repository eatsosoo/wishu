import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, PanResponder, Platform, Pressable, View, type PanResponderInstance } from 'react-native';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react-native';
import { PhotoView } from './Artwork';
import { Body, CategoryChip, EmptyState, Heading, IconButton } from './ui';
import { useAppTheme } from '../hooks/use-app-theme';
import { useWishStore } from '../hooks/use-wish-store';
import type { Memory, Photo } from '../types/domain';

type Slide = { key: string; photo: Photo; memory: Memory };
export function MemoryCarousel({ memories }: { memories: Memory[] }) {
  const { colors } = useAppTheme();
  const { toggleMemoryFavorite } = useWishStore();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<Slide>>(null);
  const scrollOffset = useRef(0);
  const dragStart = useRef(0);
  const slides = useMemo(() => memories.flatMap(memory => memory.photos.map((photo, i) => ({ key: `${memory.id}:${i}`, photo, memory }))), [memories]);
  const currentIndex = Math.min(index, Math.max(0, slides.length - 1));
  const active = slides[currentIndex];
  const [mouseDrag, setMouseDrag] = useState<PanResponderInstance | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setMouseDrag(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Platform.OS === 'web' && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => { dragStart.current = scrollOffset.current; },
    onPanResponderMove: (_, gesture) => {
      const offset = Math.max(0, Math.min((slides.length - 1) * width, dragStart.current - gesture.dx));
      scrollOffset.current = offset;
      list.current?.scrollToOffset({ offset, animated: false });
    },
    onPanResponderRelease: (_, gesture) => {
      if (!width) return;
      const destination = Math.max(0, Math.min(slides.length - 1, Math.round((dragStart.current - gesture.dx) / width)));
      list.current?.scrollToOffset({ offset: destination * width, animated: true });
      setIndex(destination);
    },
    onPanResponderTerminate: () => {
      if (!width) return;
      const destination = Math.max(0, Math.min(slides.length - 1, Math.round(scrollOffset.current / width)));
      list.current?.scrollToOffset({ offset: destination * width, animated: true });
      setIndex(destination);
    },
    }));
  }, [slides.length, width]);
  function jump(next: number) {
    const bounded = Math.max(0, Math.min(next, slides.length - 1));
    list.current?.scrollToOffset({ offset: bounded * width, animated: true });
    setIndex(bounded);
  }
  if (!active) return <EmptyState title="Chưa có ảnh trong ngày này" description="Mình lưu thêm một khoảnh khắc nhé ♡" />;
  const dotsStart = Math.max(0, Math.min(currentIndex - 3, slides.length - 7));
  return <View style={{ gap: 19 }}>
    <View {...(Platform.OS === 'web' ? mouseDrag?.panHandlers : {})} onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: '100%', aspectRatio: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.rose }}>
      {width > 0 && <FlatList key={width} ref={list} data={slides} horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces={false}
        initialNumToRender={1} maxToRenderPerBatch={3} windowSize={3} initialScrollIndex={currentIndex}
        keyExtractor={slide => slide.key} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        disableScrollViewPanResponder={Platform.OS === 'web'}
        onScroll={event => { scrollOffset.current = event.nativeEvent.contentOffset.x; setIndex(Math.max(0, Math.min(slides.length - 1, Math.round(scrollOffset.current / width)))); }} scrollEventThrottle={32}
        renderItem={({ item }) => <PhotoView photo={item.photo} width={width} height={width} fit="contain" label={item.memory.title} />} />}
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Ảnh trước" accessibilityState={{ disabled: currentIndex === 0 }} disabled={currentIndex === 0} onPress={() => jump(currentIndex - 1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', opacity: currentIndex === 0 ? 0.35 : 1 }}><ChevronLeft size={21} color={colors.primary} /></Pressable>
      <View style={{ alignItems: 'center', gap: 7 }}><Body accessibilityLiveRegion="polite" style={{ fontSize: 12, color: colors.muted }}>Ảnh {currentIndex + 1} / {slides.length}</Body><View style={{ flexDirection: 'row', gap: 6 }}>{slides.slice(dotsStart, dotsStart + 7).map((slide, i) => <Pressable key={slide.key} accessibilityRole="button" accessibilityLabel={`Xem ảnh ${dotsStart + i + 1}`} accessibilityState={{ selected: currentIndex === dotsStart + i }} onPress={() => jump(dotsStart + i)} hitSlop={8} style={{ width: currentIndex === dotsStart + i ? 19 : 6, height: 6, borderRadius: 4, backgroundColor: currentIndex === dotsStart + i ? colors.primary : colors.line }} />)}</View></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Ảnh sau" accessibilityState={{ disabled: currentIndex === slides.length - 1 }} disabled={currentIndex === slides.length - 1} onPress={() => jump(currentIndex + 1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', opacity: currentIndex === slides.length - 1 ? 0.35 : 1 }}><ChevronRight size={21} color={colors.primary} /></Pressable>
    </View>
    <View style={{ padding: 19, borderRadius: 24, backgroundColor: colors.surface, gap: 13 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}><Heading style={{ flex: 1, fontSize: 24, lineHeight: 31 }}>{active.memory.title}</Heading><IconButton icon={Heart} color={active.memory.favorite ? colors.primary : colors.muted} label={active.memory.favorite ? 'Bỏ yêu thích kỷ niệm' : 'Yêu thích kỷ niệm'} onPress={() => toggleMemoryFavorite(active.memory.id)} /></View>
      <CategoryChip category={active.memory.category} />
      {!!active.memory.note && <Body style={{ color: colors.muted, lineHeight: 25 }}>{active.memory.note}</Body>}
    </View>
    <Body style={{ textAlign: 'center', color: colors.muted, fontSize: 12 }}>Lướt ngang để xem những khoảnh khắc của ngày hôm ấy ♡</Body>
  </View>;
}
