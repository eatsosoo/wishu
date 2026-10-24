# Review cấu trúc database Wishu

## Bản sửa ngày 2026-10-25

Ba phát hiện P2 bên dưới đã có bản sửa trong migration
`202610250001_review_integrity.sql`: composite FK cho người gửi/nhận và người tạo
check-in, CHECK một đích và payload khớp loại/ID, unique theo memory_id thực,
partial index cho hàng đợi native và kiểm tra receipt. Các mục bên dưới giữ lại
để ghi nhận trạng thái tại thời điểm review; phần cải thiện tiếp theo chưa thuộc
phạm vi bản sửa này. Xem `DATABASE.md` để kiểm tra và triển khai.

Đã áp dụng lên Supabase ngày 2026-10-25. Kiểm tra sau triển khai xác nhận đủ bảy
constraint đã validated và năm index của bản sửa; migration local/remote đồng bộ.
47 kiểm thử hồi quy, lint và typecheck đều đạt.

Review schema trực tiếp trên Supabase đã liên kết, đối chiếu các migration đến
`202610240003_inactive_accounts.sql`. Truy vấn production chỉ đọc metadata và số
lượng bản ghi vi phạm; không đọc nội dung riêng tư hoặc thay đổi dữ liệu.
Hai tình huống lỗi toàn vẹn dữ liệu được tái hiện bằng PGlite riêng biệt.

## Kết quả chính

Chưa xác nhận lỗ hổng cho phép client thường tự nâng quyền hoặc vượt trạng thái
inactive trong phạm vi kiểm tra này. Đây là review cấu trúc và quyền, không phải
kiểm thử xâm nhập toàn bộ hệ thống.

Có ba điểm nên sửa ở schema/index:

### 1. [P2] Thông báo chưa ràng buộc người gửi/nhận thuộc đúng cặp đôi

`gift_notifications.sender_id` và `recipient_id` chỉ tham chiếu `auth.users`;
không có FK bảo đảm hai tài khoản thuộc `couple_id` của thông báo. Đồng thời
`memory_id` và `check_in_id` đều nullable, thiếu CHECK bảo đảm đúng một đích.

Đã tái hiện trên database test: service insert một thông báo có recipient là
user ngoài cặp đôi và không có đích vẫn thành công; recipient đó đọc được hàng
này qua RLS `recipient_reads_gifts`. RPC hiện tại chọn recipient đúng, nên đây
là thiếu lớp bảo vệ trước lỗi backend/import, không phải khả năng client tự
insert trực tiếp. Production hiện có **0** thông báo sai cặp đôi/sai số đích.

Đề xuất:

- Thêm unique `(couple_id,user_id)` ở `wish_members` để tạo composite FK cho
  sender và recipient, chọn hành vi khi gỡ membership phù hợp yêu cầu giữ dữ liệu.
- Thêm CHECK `num_nonnulls(memory_id,check_in_id)=1` và `sender_id<>recipient_id`.
- Ràng buộc loại/ID trong payload khớp các cột quan hệ, hoặc dựng payload từ cột.
- Unique quà theo `(couple_id,memory_id)` thay vì chỉ dựa vào `payload.memoryId`.

Nguồn: `202610080001_gift_notifications.sql:18`,
`202610190003_normalize_wish_data.sql`, `202610230001_check_in_notifications.sql`.

### 2. [P2] Check-in thiếu khóa ngoại đến người tạo trong cặp đôi

`check_ins.created_by` chỉ CHECK `minh|linh`, khác với `wishes.created_by` và
`preparations.prepared_by` có FK đến `(couple_id,actor)` của `wish_members`.
Trigger kiểm tra ảnh chỉ chạy khi insert/update ảnh, không bảo vệ khi membership
bị gỡ sau đó.

Đã tái hiện trên database test: tạo check-in rồi gỡ membership người tạo;
check-in vẫn còn và không còn membership tương ứng. Luồng inactive hiện tại giữ
membership nên không kích hoạt lỗi này. Production hiện có **0** check-in mồ côi.

Đề xuất composite FK `(couple_id,created_by)` đến `wish_members(couple_id,actor)`.
Với yêu cầu giữ kỷ niệm, ưu tiên `RESTRICT/NO ACTION` khi gỡ membership, không tự
cascade xoá check-in. Nếu sau này hỗ trợ rời cặp đôi, cần thiết kế tác giả ổn định
bằng `user_id` hoặc bản ghi membership lưu lịch sử trước khi mở luồng đó.

Nguồn: `202610220001_check_ins.sql:3`,
`202610220002_check_in_privacy.sql:20`.

### 3. [P2] Hàng đợi push native thiếu index phục vụ worker

`claim_gift_push` lọc `status`, `retry_at`, rồi sort `retry_at` để lấy tối đa 50
hàng. Bảng `gift_push_deliveries` chỉ có PK và unique `(notification_id,token)`;
không có index phục vụ lần worker quét toàn hàng đợi. Web push đã có partial
index `web_push_pending` tương ứng.

Khi lịch sử delivery tăng, worker phải xét nhiều hàng đã hoàn tất. Production
hiện có **0** hàng native delivery, nên chưa có bằng chứng chậm thực tế.

Đề xuất partial index `(retry_at)` cho `status IN ('pending','sending')`; cân nhắc
index riêng cho kiểm tra receipt `status='accepted'` dựa trên EXPLAIN khi có tải.

Nguồn: `202610080001_gift_notifications.sql:37` và `:149`.

## Tổng quan mô hình

| Nhóm | Bảng | Nhận xét |
| --- | --- | --- |
| Tài khoản | `auth.users`, `account_access` | Quan hệ 1–1; role, plan, status tách khỏi Auth metadata do user sửa |
| Cặp đôi | `wish_couples`, `wish_members` | Một user thuộc tối đa một cặp; unique actor giới hạn hai vị trí |
| Điều ước | `wishes`, `preparations` | FK theo cặp đôi; mỗi người chỉ có một preparation đang hoạt động cho một wish |
| Kỷ niệm | `memories`, `memory_photos`, `check_ins` | Dữ liệu quan hệ, ảnh giữ metadata JSONB; check-in có template riêng |
| Thông báo | `gift_notifications` | Đích memory/check-in có FK; cần bổ sung tính nhất quán người nhận/loại đích |
| Push | `wish_push_tokens`, `wish_web_push_subscriptions`, hai bảng delivery | Outbox tách khỏi dữ liệu nội dung, có retry và unique chống enqueue trùng |
| Legacy | `wish_state`, `account_deletion_requests` | Snapshot cũ và luồng xoá cũ; không phải nguồn dữ liệu runtime mới |

Có **15 bảng trong public**; `auth.users` và `storage.objects` thuộc schema dịch
vụ, không nằm trong con số 15.

## Các kiểm tra đạt

- Cả 15 bảng public đều bật RLS.
- Client thường chỉ được SELECT các bảng cần thiết; không có grant ghi trực tiếp.
- Role/plan/status chỉ cho client đọc bản ghi của chính mình.
- RPC mutation và `deactivate_account` chỉ cấp service role; các hàm wrapper cũ
  không cho anon/authenticated/service gọi trực tiếp.
- RLS restrictive và các entry RPC bảo vệ trạng thái inactive.
- Các truy vấn chuẩn bị riêng tư được lọc theo người chuẩn bị.
- Bucket `wish-photos` là private, giới hạn file 2 MiB.
- **0** user thiếu `account_access`; **0** cặp đôi vượt hai thành viên.
- **0** request xoá legacy đang treo; **0** status/inactive_at mâu thuẫn.
- **0** ngân sách cũ vi phạm CHECK số nguyên an toàn.

## Các cải thiện tiếp theo, không chặn hiện tại

1. `get_my_couple()` trả toàn bộ wishes, memories, check-ins và notifications;
   app gọi lại mỗi 15 giây. Nên phân trang hoặc đồng bộ theo thay đổi trước khi
   lịch sử tăng lớn. Wrapper template hiện còn đọc lại check-ins sau khi dựng JSON.
2. Thêm audit log cho thay đổi role/plan/status: ai thay, thời điểm và giá trị cũ/mới.
   Hiện `inactive_at` chỉ ghi thời điểm vô hiệu hoá, không phải lịch sử thay đổi.
3. CHECK `wish_safe_integer_budget` vẫn `NOT VALID`. Không phát hiện bản ghi vi
   phạm; có thể VALIDATE trong migration riêng. CHECK hiện vẫn áp dụng cho ghi mới.
4. Hợp nhất dần chuỗi function `*_before_*` thành implementation dễ theo dõi;
   giữ nguyên phân quyền và transaction khi refactor.
5. Thêm CHECK nhất quán giữa status và inactive_at. Quy tắc plan/expiry cần giữ
   khả năng Premium không hết hạn (`premium_expires_at IS NULL`).
6. Tách hồ sơ cá nhân khỏi `wish_members` nếu cần quản lý tài khoản đầy đủ trước
   khi ghép đôi: hiện birth_date/gender ở membership, dữ liệu ban đầu ở Auth metadata.

Lượt review ban đầu chỉ đọc dữ liệu. Bản sửa và việc triển khai sau review được
thực hiện riêng theo yêu cầu người dùng.
