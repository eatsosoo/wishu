import type { RefObject } from 'react';
import type { View } from 'react-native';
import { coverCrop, type CheckInTemplate } from '../features/check-in/templates';
import { optimizePickedPhoto } from './optimize-photo';

export async function composeCheckIn(_view: RefObject<View | null>, uris: string[], template: CheckInTemplate) {
  if (uris.length !== template.cells.length || uris.some(uri => !uri)) throw new Error('Bạn thêm đủ ảnh trước nhé.');
  const images = await Promise.all(uris.map(uri => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Chưa đọc được ảnh để ghép. Bạn thử lại nhé.'));
    image.src = uri;
  })));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1600;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt chưa hỗ trợ ghép ảnh.');
  images.forEach((image, index) => {
    const cell = template.cells[index];
    const crop = coverCrop(image.naturalWidth, image.naturalHeight, cell);
    context.drawImage(image, crop.originX, crop.originY, crop.width, crop.height, cell.x * 1600, cell.y * 1600, cell.width * 1600, cell.height * 1600);
  });
  return optimizePickedPhoto({ uri: canvas.toDataURL('image/jpeg', 0.95), width: 1600, height: 1600 });
}
