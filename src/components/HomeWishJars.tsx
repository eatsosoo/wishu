import { Image } from 'expo-image';
import { Heart } from 'lucide-react-native';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { homeJarSlots } from '../features/couple/selectors';
import { useThemeStyles } from '../hooks/use-app-theme';
import type { Couple, Wish } from '../types/domain';
import { JarLabel, WishJar } from './WishJar';

const images = {
  male: require('../../assets/artwork/home/male.webp'),
  female: require('../../assets/artwork/home/female.webp'),
  neutral: require('../../assets/artwork/home/neutral.webp'),
  waiting: require('../../assets/artwork/home/waiting.webp'),
};

// Pixel anchors measured on the 640 × 1280 reference canvases. Equal canvas
// sizes do not imply equal jar placement: align the glass, not the characters.
const jarAnchors = {
  male: { centerX: 331, baseY: 1244 },
  female: { centerX: 332.5, baseY: 1222 },
  neutral: { centerX: 333, baseY: 1257 },
  waiting: { centerX: 332.5, baseY: 1222 },
};

export function HomeWishJars({ members, wishes }: { members: Couple['members']; wishes: Wish[] }) {
  const s = useThemeStyles(styles);
  const slots = homeJarSlots(members);
  return <View style={s.container}>
    <View pointerEvents="none" style={s.images}>
      {slots.map(slot => <View key={slot.side} style={[s.slot, slot.side === 'right' && s.faceLeft]}>
        <Image source={images[slot.appearance]} contentFit="contain" cachePolicy="memory-disk" transition={150}
        accessibilityLabel={slot.member ? `Nhân vật bên hũ của ${slot.member.name}, quay vào giữa` : 'Hình bóng dịu dàng đang chờ người ấy'}
        style={[s.image, {
          left: `${(320 - jarAnchors[slot.appearance].centerX) / 640 * 100}%`,
          top: `${(1244 - jarAnchors[slot.appearance].baseY) / 1280 * 100}%`,
        }]} />
      </View>)}
    </View>
    <View pointerEvents="none" style={s.heart}><Heart size={32} fill="#F88B9E" color="#EC728D" strokeWidth={1.2} /></View>
    {slots.map(slot => slot.member ? <WishJar key={slot.side} owner={slot.member.id} name={slot.member.name} count={wishes.filter(wish => wish.createdBy === slot.member!.id).length} side={slot.side} />
      : <Pressable key={slot.side} accessibilityRole="button" accessibilityLabel="Mời người ấy vào không gian chung" onPress={() => router.push('/us')} style={[s.waiting, slot.side === 'left' ? { left: 0 } : { right: 0 }]}>
        {({ pressed }) => <JarLabel title="Chờ người ấy" subtitle="Mời vào hũ ♡" pressed={pressed} />}
      </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  container: { width: '95%', aspectRatio: 1, alignSelf: 'center' },
  images: { flexDirection: 'row', width: '100%', height: '100%' },
  slot: { width: '50%', height: '100%' },
  image: { position: 'absolute', width: '100%', height: '100%' },
  faceLeft: { transform: [{ scaleX: -1 }] },
  heart: { position: 'absolute', top: '4%', left: '44%', width: '12%', alignItems: 'center' },
  waiting: { position: 'absolute', top: 0, bottom: 0, width: '50%' },
});
