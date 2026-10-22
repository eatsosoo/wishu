import { clampSquareSelection, squareCrop, type SquareCropSelection } from './square-crop.ts';

export interface CropTouch { id: string | number; x: number; y: number }
export function cropTouchKey(touches: CropTouch[]) {
  return touches.slice(0, 2).map(touch => String(touch.id)).sort().join(':');
}
function focal(touches: CropTouch[]) {
  const [first, second = first] = touches;
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2, distance: Math.hypot(first.x - second.x, first.y - second.y) };
}
export function startCropGesture(width: number, height: number, previewSize: number, selection: SquareCropSelection, touches: CropTouch[]) {
  const point = focal(touches);
  const bounded = clampSquareSelection(width, height, selection);
  const scale = previewSize / squareCrop(width, height, bounded).width;
  return {
    key: cropTouchKey(touches),
    zoom: bounded.zoom,
    distance: point.distance,
    anchorX: bounded.centerX * width + (point.x - previewSize / 2) / scale,
    anchorY: bounded.centerY * height + (point.y - previewSize / 2) / scale,
  };
}
export type CropGesture = ReturnType<typeof startCropGesture>;
export function moveCropGesture(width: number, height: number, previewSize: number, start: CropGesture, touches: CropTouch[]): SquareCropSelection {
  const point = focal(touches);
  const zoom = Math.max(1, Math.min(4, start.distance > 0 ? start.zoom * point.distance / start.distance : start.zoom));
  const side = Math.max(1, Math.floor(Math.min(width, height) / zoom));
  const scale = previewSize / side;
  return clampSquareSelection(width, height, {
    zoom,
    centerX: (start.anchorX - (point.x - previewSize / 2) / scale) / width,
    centerY: (start.anchorY - (point.y - previewSize / 2) / scale) / height,
  });
}
