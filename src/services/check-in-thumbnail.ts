import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { CHECK_IN_THUMBNAIL_SIZE } from '../features/check-in/privacy';

export async function createCheckInThumbnail(uri: string, inline = false): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  let original: Awaited<ReturnType<typeof context.renderAsync>> | undefined;
  try {
    original = await context.renderAsync();
    const side = Math.min(original.width, original.height);
    context.crop({ originX: Math.floor((original.width - side) / 2), originY: Math.floor((original.height - side) / 2), width: side, height: side });
    context.resize({ width: CHECK_IN_THUMBNAIL_SIZE, height: CHECK_IN_THUMBNAIL_SIZE });
    const rendered = await context.renderAsync();
    try {
      const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: inline });
      if (inline && !result.base64) throw new Error('Chưa tạo được ảnh xem trước.');
      return inline ? `data:image/jpeg;base64,${result.base64}` : result.uri;
    }
    finally { rendered.release(); }
  } finally { original?.release(); context.release(); }
}
