import { useAppTheme } from '../hooks/use-app-theme';
import { useState } from 'react';
import { View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { ClayObject } from '../components/Artwork';
import { Body, Heading, PrimaryButton, SecondaryButton } from '../components/ui';
import { useWishStore } from '../hooks/use-wish-store';

const slides = [
  { art: 'couple' as const, title: 'Một góc nhỏ của hai đứa', text: 'Giữ những mong muốn, bất ngờ và kỷ niệm\nở cùng một nơi thật dịu dàng.' },
  { art: 'jar' as const, title: 'Gửi điều ước vào hũ', text: 'Một món quà, một chuyến đi, một buổi hẹn.\nNhững điều nhỏ cũng xứng đáng được nhớ.' },
  { art: 'openGift' as const, title: 'Dành cho nhau bất ngờ', text: 'Bí mật chuẩn bị điều người ấy mong muốn,\nrồi lưu lại khoảnh khắc thành kỷ niệm.' },
];
export default function Onboarding() {
  const { colors, t } = useAppTheme();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const store = useWishStore();
  const slide = slides[step];
  async function finish() { setBusy(true); await store.finishOnboarding(); setBusy(false); }
  return <AppScreen contentStyle={{ justifyContent: 'center', gap: 28, paddingVertical: 42 }}>
    <Body style={{ textAlign: 'center', color: colors.primary, letterSpacing: 3 }}>OUR WISH ♡</Body>
    <View style={{ height: 235, justifyContent: 'center', alignItems: 'center' }}><ClayObject name={slide.art} width={slide.art === 'jar' ? 160 : 300} /></View>
    <View style={{ gap: 14 }}><Heading style={{ textAlign: 'center', fontSize: 28 }}>{slide.title}</Heading><Body style={{ textAlign: 'center', color: colors.muted }}>{slide.text}</Body></View>
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>{slides.map((_, i) => <View key={i} style={{ width: i === step ? 24 : 7, height: 7, borderRadius: 8, backgroundColor: i === step ? colors.primary : t('#E3C9CF') }} />)}</View>
    <PrimaryButton disabled={busy} onPress={() => step < 2 ? setStep(step + 1) : void finish()}>{step < 2 ? 'Tiếp tục' : 'Bắt đầu cùng nhau ♡'}</PrimaryButton>
    {step < 2 && <SecondaryButton onPress={() => void finish()}>Bỏ qua</SecondaryButton>}
  </AppScreen>;
}
