import type { ArtName, Category, Photo } from '../../types/domain.ts';

const categoryArtwork: Record<Category, ArtName> = {
  'Quà tặng': 'categoryGift',
  'Du lịch': 'categoryTravel',
  'Ăn uống': 'categoryDining',
  'Trải nghiệm': 'categoryExperience',
  'Khoảnh khắc': 'categoryMoments',
};

export function defaultWishCover(category: Category): Photo {
  return { art: categoryArtwork[category] };
}
