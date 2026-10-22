import type { RefObject } from 'react';
import { PixelRatio, Platform, type View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import type { CheckInTemplate } from '../features/check-in/templates';
import { optimizePickedPhoto } from './optimize-photo';

export async function composeCheckIn(view: RefObject<View | null>, uris: string[], template: CheckInTemplate) {
  if (uris.length !== template.cells.length || uris.some(uri => !uri)) throw new Error('Bạn thêm đủ ảnh trước nhé.');
  // iOS renders in points at device scale; Android accepts output pixels.
  const side = Platform.OS === 'ios' ? 1600 / PixelRatio.get() : 1600;
  const uri = await captureRef(view, { format: 'jpg', quality: 1, width: side, height: side, result: 'tmpfile' });
  try { return await optimizePickedPhoto({ uri, width: 1600, height: 1600 }); }
  finally { releaseCapture(uri); }
}
