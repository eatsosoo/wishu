export type SquareCropSelection = { centerX: number; centerY: number; zoom: number };
export const centeredSquare: SquareCropSelection = { centerX: 0.5, centerY: 0.5, zoom: 1 };

export function clampSquareSelection(width: number, height: number, selection: SquareCropSelection, aspectRatio = 1): SquareCropSelection {
  const zoom = Math.max(1, Math.min(4, Number.isFinite(selection.zoom) ? selection.zoom : 1));
  const cropWidth = Math.max(1, Math.floor(Math.min(width, height * aspectRatio) / zoom));
  const cropHeight = Math.max(1, Math.floor(cropWidth / aspectRatio));
  const halfX = cropWidth / (2 * width), halfY = cropHeight / (2 * height);
  return {
    zoom,
    centerX: Math.max(halfX, Math.min(1 - halfX, Number.isFinite(selection.centerX) ? selection.centerX : 0.5)),
    centerY: Math.max(halfY, Math.min(1 - halfY, Number.isFinite(selection.centerY) ? selection.centerY : 0.5)),
  };
}

export function squareCrop(width: number, height: number, selection: SquareCropSelection = centeredSquare, aspectRatio = 1) {
  const bounded = clampSquareSelection(width, height, selection, aspectRatio);
  const cropWidth = Math.max(1, Math.floor(Math.min(width, height * aspectRatio) / bounded.zoom));
  const cropHeight = Math.max(1, Math.floor(cropWidth / aspectRatio));
  return {
    originX: Math.max(0, Math.min(width - cropWidth, Math.round(bounded.centerX * width - cropWidth / 2))),
    originY: Math.max(0, Math.min(height - cropHeight, Math.round(bounded.centerY * height - cropHeight / 2))),
    width: cropWidth,
    height: cropHeight,
  };
}
