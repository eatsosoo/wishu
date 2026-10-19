import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { Photo } from '../types/domain';
import { PHOTO_LIMITS, photoResize, validatePhotoSource } from '../features/photos/limits';
import { photoSize } from './photo-bytes';

export async function optimizePickedPhoto(asset: ImagePickerAsset): Promise<Photo> {
  const size = asset.file?.size ?? asset.fileSize ?? await photoSize(asset.uri);
  if (asset.mimeType && !/^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(asset.mimeType)) throw new Error('Chọn ảnh JPEG, PNG, WebP hoặc HEIC.');
  validatePhotoSource(asset.width, asset.height, size);
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    const resize = photoResize(asset.width, asset.height);
    if (resize) context.resize(resize);
    const rendered = await context.renderAsync();
    try {
      for (const compress of [0.8, 0.6, 0.45]) {
        const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress });
        const optimizedSize = await photoSize(result.uri);
        if (optimizedSize > 0 && optimizedSize <= PHOTO_LIMITS.uploadBytes) return { uri: result.uri };
      }
      throw new Error('Ảnh sau tối ưu vẫn vượt 2 MB. Bạn chọn ảnh khác nhé.');
    } finally { rendered.release(); }
  } finally { context.release(); }
}
