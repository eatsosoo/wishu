export type SquareCropSelection = { centerX: number; centerY: number; zoom: number };
export const centeredSquare: SquareCropSelection = { centerX: 0.5, centerY: 0.5, zoom: 1 };

export function clampSquareSelection(width: number, height: number, selection: SquareCropSelection): SquareCropSelection {
  const zoom = Math.max(1, Math.min(4, Number.isFinite(selection.zoom) ? selection.zoom : 1));
  const side = Math.max(1, Math.floor(Math.min(width, height) / zoom));
  const halfX = side / (2 * width), halfY = side / (2 * height);
  return {
    zoom,
    centerX: Math.max(halfX, Math.min(1 - halfX, Number.isFinite(selection.centerX) ? selection.centerX : 0.5)),
    centerY: Math.max(halfY, Math.min(1 - halfY, Number.isFinite(selection.centerY) ? selection.centerY : 0.5)),
  };
}

export function squareCrop(width: number, height: number, selection: SquareCropSelection = centeredSquare) {
  const bounded = clampSquareSelection(width, height, selection);
  const side = Math.max(1, Math.floor(Math.min(width, height) / bounded.zoom));
  return {
    originX: Math.max(0, Math.min(width - side, Math.round(bounded.centerX * width - side / 2))),
    originY: Math.max(0, Math.min(height - side, Math.round(bounded.centerY * height - side / 2))),
    width: side,
    height: side,
  };
}
