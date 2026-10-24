import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image, type ImageProps } from 'expo-image';
import { RotateCcw } from 'lucide-react-native';
import { useAppTheme } from '../hooks/use-app-theme';
import { WishSpinner } from './WishLoading';

type PhotoImageProps = ImageProps & { showLoading?: boolean };
export function PhotoImage({ showLoading = false, ...props }: PhotoImageProps) {
  // Remount the loading state when a reused card receives another source.
  return showLoading ? <LoadingPhotoImage key={JSON.stringify(props.source)} {...props} /> : <Image {...props} />;
}
function LoadingPhotoImage({ onDisplay, onError, ...props }: ImageProps) {
  const { colors } = useAppTheme();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const label = props.accessibilityLabel || 'điều ước';
  return <View style={styles.frame}>
    <Image key={attempt} {...props} onDisplay={() => { setStatus('ready'); onDisplay?.(); }} onError={event => { setStatus('error'); onError?.(event); }} />
    {status !== 'ready' ? <View pointerEvents={status === 'error' ? 'auto' : 'none'} style={[styles.placeholder, { backgroundColor: colors.rose }]}>
      {status === 'error' ? <Pressable accessibilityRole="button" accessibilityLabel={`Tải lại ảnh ${label}`} onPress={event => {
        event.stopPropagation(); setStatus('loading'); setAttempt(value => value + 1);
      }} style={styles.retry}><RotateCcw size={21} color={colors.primary} strokeWidth={1.7} /></Pressable>
        : <WishSpinner colors={colors} size={42} label={`Đang tải ảnh ${label}`} />}
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: '100%', height: '100%' },
  placeholder: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  retry: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
