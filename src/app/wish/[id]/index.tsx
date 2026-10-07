import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ExternalLink, Heart, MoreHorizontal } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { AppScreen } from '../../../components/AppScreen';
import { BearHero, PhotoView, ReferenceArt } from '../../../components/Artwork';
import { Body, BottomSheet, CategoryChip, EmptyState, Heading, IconButton, PrimaryButton, SecondaryButton } from '../../../components/ui';
import { colors, fonts } from '../../../constants/theme';
import { formatCost } from '../../../features/wishes/format';
import { useWishStore } from '../../../hooks/use-wish-store';

export default function WishDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useWishStore();
  const wish = store.wishes.find(item => item.id === id);
  const [confirm, setConfirm] = useState(false);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState('');
  if (!wish) return <AppScreen><EmptyState title="Điều ước chưa có ở đây" description="Mình trở lại hũ và chọn một điều ước khác nhé." action="Về hũ điều ước" onAction={() => router.replace('/wishes')} /></AppScreen>;
  const ownWish = wish.createdBy === store.actor;
  async function openReference() {
    try { await Linking.openURL(wish!.referenceUrl); } catch { setError('Chưa mở được liên kết. Bạn thử lại nhé.'); }
  }
  return <AppScreen contentStyle={{ paddingHorizontal: 0, paddingTop: 0 }}>
    <View>{'art' in wish.cover && wish.cover.art === 'bear' ? <BearHero height={350} /> : <PhotoView photo={wish.cover} height={350} label={wish.title} />}
      <View style={s.heroButtons}><IconButton icon={ChevronLeft} label="Quay lại hũ" onPress={() => router.canGoBack() ? router.back() : router.replace('/wishes')} /><IconButton icon={MoreHorizontal} label="Thêm lựa chọn" onPress={() => setMenu(true)} /></View>
    </View>
    <View style={s.detail}>
      <View className="flex-row items-center justify-between" style={{ gap: 7 }}><Heading style={{ flex: 1, color: '#261D24', fontFamily: fonts.headingBold }}>{wish.title}</Heading><Pressable onPress={() => store.toggleWishFavorite(wish.id)} accessibilityRole="button" accessibilityLabel={wish.favorite ? 'Bỏ yêu thích' : 'Yêu thích'} style={s.favorite}><Heart size={23} strokeWidth={1.6} color="#EF718D" fill={wish.favorite ? '#EF718D' : 'transparent'} /></Pressable></View>
      <View className="flex-row items-center" style={{ gap: 14, marginTop: 14 }}><CategoryChip category={wish.category} /><Body style={{ color: colors.muted, fontSize: 14 }}>{formatCost(wish.estimatedCost)}</Body></View>
      <Body style={{ marginTop: 20, color: '#85717A', lineHeight: 23 }}>“{wish.description}”</Body>
      <Body style={s.label}>Hình ảnh tham khảo</Body>
      <View className="flex-row" style={{ gap: 11 }}>
        {('art' in wish.cover && wish.cover.art === 'bear') ? <><ReferenceArt name="bearPortrait" width={75} height={75} style={s.thumbnail} /><ReferenceArt name="bear" width={75} height={75} style={s.thumbnail} /><ReferenceArt name="bearReference" width={115} height={75} style={s.thumbnail} /></> : <PhotoView photo={wish.cover} width={100} height={85} style={s.thumbnail} />}
      </View>
      {!!wish.referenceUrl && <><Body style={[s.label, { marginTop: 18 }]}>Link tham khảo</Body><Pressable accessibilityRole="link" onPress={openReference} style={s.link}><Body numberOfLines={1} style={{ flex: 1, color: '#784755', fontSize: 13 }}>{wish.referenceUrl}</Body><ExternalLink size={17} color={colors.primary} /></Pressable></>}
      {!!error && <Body accessibilityRole="alert" style={{ color: colors.primary, marginTop: 10 }}>{error}</Body>}
      <View style={{ marginTop: 17 }}>{ownWish ? <Body style={{ textAlign: 'center', color: colors.muted }}>Một điều nhỏ mình đang mong chờ ♡</Body> : <PrimaryButton onPress={() => setConfirm(true)}>Biến điều ước thành hiện thực 🎁</PrimaryButton>}</View>
    </View>
    <BottomSheet visible={confirm} onClose={() => setConfirm(false)} title="Một bất ngờ dành cho người ấy"><Body style={{ color: colors.muted, marginBottom: 22 }}>Điều ước này sẽ nằm trong danh sách riêng của bạn. Người ấy chỉ biết khi bất ngờ trở thành hiện thực ♡</Body><PrimaryButton onPress={() => { store.prepareWish(wish.id); setConfirm(false); router.push('/preparing'); }}>Bắt đầu chuẩn bị 🎁</PrimaryButton></BottomSheet>
    <BottomSheet visible={menu} onClose={() => setMenu(false)} title="Điều ước nhỏ"><View style={{ gap: 12 }}><SecondaryButton onPress={() => { setMenu(false); router.push('/preparing'); }}>Những điều mình đang chuẩn bị</SecondaryButton><SecondaryButton onPress={() => { setMenu(false); router.replace('/wishes'); }}>Về hũ điều ước</SecondaryButton></View></BottomSheet>
  </AppScreen>;
}
const s = StyleSheet.create({
  heroButtons: { position: 'absolute', top: 18, left: 22, right: 22, flexDirection: 'row', justifyContent: 'space-between' },
  detail: { backgroundColor: '#FFF8F5', borderTopLeftRadius: 34, borderTopRightRadius: 34, marginTop: -13, padding: 24, paddingBottom: 18 },
  favorite: { width: 40, height: 40, borderRadius: 999, backgroundColor: '#FCE5E5', alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 23, marginBottom: 9, color: '#8B5969', fontSize: 14 },
  thumbnail: { borderRadius: 14 },
  link: { minHeight: 44, borderRadius: 15, borderWidth: 1, borderColor: '#F0E3DF', backgroundColor: '#FFFDFC', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
});
