import type { MockSnapshot } from '../types/domain';

const seedSnapshot = (): MockSnapshot => ({
  notifications: [],
  couple: {
    name: 'Minh & Linh', anniversaryDate: '2024-02-14',
    members: [{ id: 'minh', name: 'Minh' }, { id: 'linh', name: 'Linh' }],
  },
  wishes: [
    { id: 'bear', createdBy: 'linh', title: 'Gấu bông Jellycat', category: 'Quà tặng', description: 'Mình thích con này lắm, trông đáng yêu quá 🥺', shortDescription: 'Mình thích con này lắm 🥺', estimatedCost: 1200000, priority: 5, referenceUrl: 'https://jellycat.com/', cover: { art: 'bear' }, favorite: true },
    { id: 'dalat', createdBy: 'linh', title: 'Đi Đà Lạt cùng nhau', category: 'Du lịch', description: 'Ngắm hoàng hôn ở đồi', estimatedCost: 3000000, priority: 4, referenceUrl: '', cover: { art: 'travel' }, favorite: false },
    { id: 'photobooth', createdBy: 'linh', title: 'Chụp photobooth', category: 'Trải nghiệm', description: 'Lưu lại thật nhiều khoảnh khắc của hai đứa ♡', estimatedCost: 500000, priority: 3, referenceUrl: '', cover: { art: 'photobooth' }, favorite: false },
    { id: 'concert', createdBy: 'linh', title: 'Đi concert cùng anh', category: 'Trải nghiệm', description: 'Nhất định phải đi một lần!', estimatedCost: 2500000, priority: 4, referenceUrl: '', cover: { art: 'concert' }, favorite: false },
    { id: 'dinner', createdBy: 'linh', title: 'Một bữa tối thật chậm', category: 'Ăn uống', description: 'Chỉ có hai đứa, và món mình thích', estimatedCost: 700000, priority: 2, referenceUrl: '', cover: { art: 'travelMemory' }, favorite: false },
    { id: 'minh-photo', createdBy: 'minh', title: 'Chụp photobooth cùng nhau', category: 'Trải nghiệm', description: 'Muốn lưu lại thật nhiều khoảnh khắc dễ thương của hai đứa ♡', estimatedCost: 500000, priority: 3, referenceUrl: '', cover: { art: 'photoMemory' }, favorite: false },
    { id: 'minh-trip', createdBy: 'minh', title: 'Một chuyến đi với em', category: 'Du lịch', description: 'Đi đâu cũng được, miễn là có em', estimatedCost: 3000000, priority: 4, referenceUrl: '', cover: { art: 'travel' }, favorite: false },
    { id: 'minh-gift', createdBy: 'minh', title: 'Gấu bông để ôm mỗi ngày', category: 'Quà tặng', description: 'Một món quà nhỏ xinh từ em', estimatedCost: 1200000, priority: 2, referenceUrl: '', cover: { art: 'bearPortrait' }, favorite: true },
  ],
  preparations: [
    { id: 'p-bear', wishId: 'bear', preparedBy: 'minh', status: 'preparing', startedAt: '2024-10-07' },
    { id: 'p-dalat', wishId: 'dalat', preparedBy: 'minh', status: 'preparing', startedAt: '2024-10-01' },
  ],
  memories: [
    { id: 'm-bear', wishId: 'bear', title: 'Gấu bông Jellycat', category: 'Quà tặng', completedAt: '2024-10-20', note: 'Anh tặng mình vào sinh nhật 26 tuổi.\nYêu lắm ♡', photos: [{ art: 'bearPortrait' }, { art: 'memoryOne' }, { art: 'memoryTwo' }, { art: 'memoryThree' }], favorite: false },
    { id: 'm-dalat', wishId: 'dalat', title: 'Đi Đà Lạt cùng nhau', category: 'Du lịch', completedAt: '2024-09-15', note: 'Hoàng hôn đẹp nhất là hoàng hôn có anh bên cạnh ♡', photos: [{ art: 'travelMemory' }, { art: 'travel' }], favorite: false },
    { id: 'm-concert', wishId: 'concert', title: 'Đi concert cùng anh', category: 'Trải nghiệm', completedAt: '2024-08-28', note: 'Cùng hát thật to những bài mình yêu thích.', photos: [{ art: 'concert' }], favorite: false },
    { id: 'm-photo', wishId: 'photobooth', title: 'Những khoảnh khắc nhỏ', category: 'Khoảnh khắc', completedAt: '2024-08-12', note: 'Một ngày bình thường mà đáng nhớ.', photos: [{ art: 'photoMemory' }, { art: 'photobooth' }], favorite: false },
    { id: 'm-little-day', wishId: 'dinner', title: 'Một buổi hẹn dịu dàng', category: 'Khoảnh khắc', completedAt: '2024-07-22', note: 'Một ngày chỉ có hai đứa ♡', photos: [{ art: 'memoryTwo' }], favorite: false },
  ],
});

// Keep the two jar counts in the supplied reference (12 and 18), with real list items.
export function createMockSnapshot(): MockSnapshot {
  const seed = seedSnapshot();
  const ideas = [
    ['Một ngày ở biển', 'Du lịch', 'travel'],
    ['Đi ăn món Nhật', 'Ăn uống', 'travelMemory'],
    ['Một bó hoa nhỏ', 'Quà tặng', 'bearPortrait'],
    ['Cùng ngắm bình minh', 'Khoảnh khắc', 'travel'],
    ['Làm bánh cùng nhau', 'Trải nghiệm', 'photobooth'],
    ['Một buổi picnic', 'Ăn uống', 'travelMemory'],
    ['Đi xem phim', 'Trải nghiệm', 'concert'],
    ['Viết thư cho nhau', 'Khoảnh khắc', 'photoMemory'],
    ['Chuyến đi cuối tuần', 'Du lịch', 'travel'],
    ['Một món quà bất ngờ', 'Quà tặng', 'bear'],
    ['Đi dạo dưới ánh trăng', 'Khoảnh khắc', 'travelMemory'],
    ['Một buổi cà phê thật lâu', 'Ăn uống', 'photoMemory'],
    ['Lưu lại một ngày của mình', 'Trải nghiệm', 'photobooth'],
  ] as const;
  for (const [owner, total] of [['minh', 12], ['linh', 18]] as const) {
    const current = seed.wishes.filter(wish => wish.createdBy === owner).length;
    for (let index = 0; index < total - current; index++) {
      const [title, category, art] = ideas[index];
      seed.wishes.push({ id: `${owner}-${index}`, createdBy: owner, title, category, cover: { art }, description: 'Thêm một điều nhỏ để mong chờ cùng nhau ♡', estimatedCost: 300000, priority: 3, referenceUrl: '', favorite: false });
    }
  }
  return seed;
}
