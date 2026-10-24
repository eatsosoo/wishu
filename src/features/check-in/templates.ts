export interface PhotoCell { x: number; y: number; width: number; height: number }
export interface CheckInTemplate { id: 'single' | 'halves' | 'columns' | 'grid'; label: string; cells: readonly PhotoCell[] }
export const checkInTemplates: readonly CheckInTemplate[] = [
  { id: 'single', label: 'Một ảnh', cells: [{ x: 0, y: 0, width: 1, height: 1 }] },
  { id: 'halves', label: 'Trên / dưới', cells: [{ x: 0, y: 0, width: 1, height: 0.5 }, { x: 0, y: 0.5, width: 1, height: 0.5 }] },
  { id: 'columns', label: 'Trái / phải', cells: [{ x: 0, y: 0, width: 0.5, height: 1 }, { x: 0.5, y: 0, width: 0.5, height: 1 }] },
  { id: 'grid', label: 'Bốn ảnh', cells: [{ x: 0, y: 0, width: 0.5, height: 0.5 }, { x: 0.5, y: 0, width: 0.5, height: 0.5 }, { x: 0, y: 0.5, width: 0.5, height: 0.5 }, { x: 0.5, y: 0.5, width: 0.5, height: 0.5 }] },
];

// Both preview and export use a centered cover crop for every cell.
export function coverCrop(width: number, height: number, cell: PhotoCell) {
  const ratio = cell.width / cell.height;
  const cropWidth = Math.min(width, height * ratio);
  const cropHeight = cropWidth / ratio;
  return { originX: (width - cropWidth) / 2, originY: (height - cropHeight) / 2, width: cropWidth, height: cropHeight };
}
