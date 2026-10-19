export const PHOTO_LIMITS = {
  sourceBytes: 20 * 1024 * 1024,
  uploadBytes: 2 * 1024 * 1024,
  maxDimension: 1600,
  maxPixels: 48_000_000,
  memoryCount: 8,
} as const;

export function validatePhotoSource(width: number, height: number, size: number) {
  if (!Number.isFinite(size) || size <= 0 || size > PHOTO_LIMITS.sourceBytes) throw new Error('Chọn ảnh có dung lượng tối đa 20 MB.');
  if (![width, height].every(value => Number.isFinite(value) && value > 0) || width * height > PHOTO_LIMITS.maxPixels) throw new Error('Chọn ảnh có độ phân giải tối đa 48 megapixel.');
}

export function photoResize(width: number, height: number) {
  if (Math.max(width, height) <= PHOTO_LIMITS.maxDimension) return null;
  return width >= height ? { width: PHOTO_LIMITS.maxDimension, height: null } : { width: null, height: PHOTO_LIMITS.maxDimension };
}
