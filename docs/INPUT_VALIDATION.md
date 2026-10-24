# Validation dữ liệu đầu vào

Quy tắc dùng chung nằm trong `src/features/input-validation.ts`. App kiểm tra command trước khi upload ảnh; Edge Function kiểm tra JSON thực tế và ràng buộc ảnh với membership đã xác thực. Validation không thay thế authentication, RLS hoặc rate limit.

| Dữ liệu | Quy tắc |
| --- | --- |
| Email / mật khẩu | Email tối đa 254 ký tự, đúng cấu trúc cơ bản; mật khẩu tối đa 1024 ký tự, signup giữ mức tối thiểu 6 hiện có; không trim mật khẩu |
| Tên thành viên / không gian | Bắt buộc, tối đa 40 / 60 ký tự, không có ký tự điều khiển; UI tên thành viên vẫn giới hạn 20 như trước |
| Mã mời | 5 ký tự trong bảng chữ cái sinh mã; chuẩn hoá chữ hoa; có kiểm tra tại RPC trực tiếp |
| Tiêu đề / mô tả / lời nhắn | Tối đa 100 / 1000 / 2000 ký tự; tiêu đề bắt buộc; mô tả và lời nhắn cho phép xuống dòng và tab |
| Ngân sách / ưu tiên | Số nguyên không âm an toàn trong JavaScript / số nguyên 1–5; DB cũng ràng buộc ngân sách |
| URL | URL HTTP(S) có hostname, tối đa 2048 ký tự; không có credentials, khoảng trắng hoặc backslash; ảnh ngoài chỉ HTTPS |
| Ngày | Ngày thực, năm 1900–2100; loại ngày tràn và chuỗi số mũ/hex; sinh nhật và check-in không ở tương lai theo ngày kiểm tra |
| ID | 1–100 ký tự chữ/số/gạch ngang/gạch dưới, bắt đầu bằng chữ hoặc số |
| Hồ sơ / toạ độ | Kiểm tra kiểu runtime; giới tính trong enum hoặc null; toạ độ hữu hạn trong [-90,90] và [-180,180] |
| Ảnh | Art có trong danh sách hoặc URI hợp lệ; không trộn art với URI; Storage path đúng UUID/UUID/filename, không traversal/query/percent; ảnh check-in trên server thuộc uploader đã xác thực |
| Hoàn thành điều ước | Tối đa 4 ảnh; kiểm tra từng ảnh |
| Native push token | Chuỗi Expo token đúng định dạng, tối đa 256 ký tự; platform ios/android, không null |
| Request body | wish-action tối đa 100.000 byte, delete-account tối đa 1.024 byte; đọc stream, dừng khi vượt ngưỡng, UTF-8 và JSON hợp lệ |

Ảnh local chỉ được chấp nhận ở app trước upload, với URI file/content/blob/data ảnh. Server không chấp nhận các URI local. API không tin vào createdBy từ client để phân quyền: membership vẫn là nguồn xác định người thực hiện.

Ngày check-in ở app dùng lịch local của điện thoại. Edge dùng ngày hiện tại muộn nhất trên thế giới (UTC+14) để tránh từ chối ngày hợp lệ sau nửa đêm local; vì vậy server có thể chấp nhận một ngày trước khi ngày đó bắt đầu trong múi giờ UTC. Kiểm tra ngày sinh ở SQL vẫn giữ giới hạn current_date như trước.

SQL migration `202610240001_input_validation.sql` giữ các RPC public create_couple/join_couple nhưng thu hồi quyền gọi trực tiếp các hàm nội bộ cũ. Ràng buộc ngân sách dùng NOT VALID để giữ dữ liệu lịch sử; mọi row mới hoặc được cập nhật vẫn phải đạt ràng buộc. Migration không dọn hoặc sửa dữ liệu cũ và không tự bật rate limit.

## Triển khai

Migration `202610240001_input_validation.sql` đã được áp dụng ngày 24/10/2026 vào project Supabase liên kết `rpodnpatutevydgpkzzd`. Dry-run sau triển khai xác nhận database đã đồng bộ. Kiểm tra trực tiếp xác nhận constraint ngân sách tồn tại, authenticated vẫn gọi được create/join nhưng không gọi được hàm nội bộ để bỏ qua validation; anon không được join và client không được gọi service mutation RPC. Preflight không phát hiện ngân sách ngoài quy tắc mới.

**wish-action** và **delete-account** vẫn cần triển khai lại để phần validation Edge có hiệu lực; lượt triển khai này chỉ áp dụng migration database.

## Kiểm thử

`tests/input-validation.test.cjs` kiểm tra các trường hợp biên, dữ liệu sai kiểu và gọi RPC trực tiếp trong PGlite. `tests/wish-action.test.cjs` và `tests/account-deletion.test.cjs` kiểm tra request malformed/oversized không gọi mutation. `tests/check-in-photo-privacy.test.cjs` xác nhận dữ liệu sai bị chặn trước upload.

Nhóm test liên quan đã đạt 95/95 ở lần chạy sau migration và kiểm tra token. Full suite trước lần bổ sung test token có 150/157 đạt; 7 lỗi thuộc mock Artwork (thiếu use-private-photo), mock BottomSheet (thiếu useAppTheme) và test dùng subpath nội bộ Expo ImageManipulator không được export trong SDK 58. Những file code/test đó không bị sửa bởi thay đổi validation này.
