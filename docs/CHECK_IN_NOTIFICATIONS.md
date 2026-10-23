# Thông báo check-in

Khi lưu một check-in mới, người còn lại trong cặp nhận thông báo trong hộp thư và qua các thiết bị đã bật push. Chạm thông báo mở bản đồ tại check-in và đánh dấu đã đọc. Sửa hoặc gửi lại cùng check-in không tạo thông báo mới. Nếu chưa có người ghép đôi, check-in vẫn được lưu.

Thông báo được tạo cùng giao dịch lưu check-in. Hàng đợi push web và điện thoại dùng chung cơ chế thử lại hiện có. Nội dung trên màn hình khoá không chứa tên địa điểm, ảnh, lời nhắn hay toạ độ. Xoá check-in cũng xoá thông báo và các hàng đợi liên quan.

## Triển khai

1. Áp dụng migration `supabase/migrations/202610230001_check_in_notifications.sql` sau các migration hiện có.
2. Deploy lại Edge Functions `wish-action` và `deliver-gifts` vì chúng dùng các worker trong `_shared`. Giữ nguyên cấu hình push hiện có trong [PUSH_SETUP.md](PUSH_SETUP.md) và [WEB_PUSH_SETUP.md](WEB_PUSH_SETUP.md).
3. Phát hành lại web (bao gồm `public/sw.js`) và ứng dụng để hiển thị, mở đúng loại thông báo mới.

Không gửi bù thông báo cho các check-in có trước migration. Cần kiểm thử push trên hai tài khoản thật và thiết bị đã cấp quyền sau khi triển khai.
