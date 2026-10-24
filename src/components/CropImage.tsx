import { Image, type ImageProps } from 'expo-image';
import { squareCrop, type SquareCropSelection } from '../features/photos/square-crop';

/** The same pixel geometry is used by both inline and full-screen crop editors. */
export function CropImage({ source, selection, previewWidth, aspectRatio, ...props }: {
  source: { uri: string; width: number; height: number };
  selection: SquareCropSelection;
  previewWidth: number;
  aspectRatio: number;
} & Pick<ImageProps, 'onLoad' | 'onError' | 'cachePolicy'>) {
  const crop = squareCrop(source.width, source.height, selection, aspectRatio);
  const scale = previewWidth / crop.width;
  const baseScale = previewWidth / Math.min(source.width, source.height * aspectRatio);
  return <Image {...props} source={{ uri: source.uri }} pointerEvents="none" contentFit="fill" transition={0}
    style={{ position: 'absolute', width: source.width * baseScale, height: source.height * baseScale,
      left: (previewWidth - source.width * baseScale) / 2, top: (previewWidth / aspectRatio - source.height * baseScale) / 2,
      transform: [{ translateX: (source.width / 2 - crop.originX - crop.width / 2) * scale }, { translateY: (source.height / 2 - crop.originY - crop.height / 2) * scale }, { scale: Math.min(source.width, source.height * aspectRatio) / crop.width }] }} />;
}
