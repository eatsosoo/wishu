# Role và plan

Mỗi tài khoản có `role: user | admin` và `plan: normal | premium`. Mặc định là
`user` / `normal`. Hai người trong một cặp đôi có gói độc lập. Role admin là nền
tảng cho quyền quản trị sau này, không tự cấp Premium hay quyền đọc dữ liệu của
cặp đôi khác. Chưa có màn hình quản trị hoặc thanh toán trong thay đổi này.

| Tính năng | Normal | Premium còn hạn |
| --- | --- | --- |
| Check-in mới | Ngày hôm nay theo múi giờ thiết bị, không có ô chọn ngày | Chọn hôm nay hoặc ngày đã qua |
| Sửa check-in | Giữ ngày cũ, không có ô chọn ngày | Được thay đổi ngày |
| Chụp/chọn ảnh đơn | Có | Có |
| Template ghép ảnh trong camera | Ẩn | Có |

Hạ gói hoặc hết hạn không làm mất ảnh, template hay ngày của check-in đã lưu.
Normal vẫn sửa nội dung và giữ ảnh cũ; ghép ảnh mới cần Premium. Không thể
phân biệt ảnh ghép từ bên ngoài với ảnh đơn đã chọn từ thư viện: giới hạn áp
dụng cho công cụ template của ứng dụng và metadata của lệnh lưu.

## Áp dụng backend

Áp dụng `supabase/migrations/202610240002_account_access.sql` sau các migration
hiện có, trước khi phát hành client mới. Migration tạo bảng `account_access`,
khởi tạo tài khoản cũ và mới, RPC `get_my_account_access`, và kiểm tra gói trong
transaction `apply_wish_command`. Không cần sửa Edge Function `wish-action`.

```sh
npx supabase db push --linked --dry-run
npx supabase db push --linked
```

Chỉ môi trường tin cậy (SQL Editor hoặc backend có service role) được đổi
role/plan. Ví dụ, thay UUID bằng ID tài khoản thật trong Supabase Auth:

```sql
update public.account_access
set plan = 'premium', premium_expires_at = now() + interval '30 days'
where user_id = 'USER_UUID';

update public.account_access
set role = 'admin'
where user_id = 'USER_UUID';

update public.account_access
set plan = 'normal', premium_expires_at = null
where user_id = 'USER_UUID';
```

`premium_expires_at = null` trên gói Premium nghĩa là không hết hạn. App tải lại
quyền khi về foreground và trong lần đồng bộ định kỳ (15 giây); database luôn
kiểm tra thời hạn lúc lưu. Client chỉ được đọc quyền của mình, không được ghi
bảng này; auth `user_metadata` không quyết định quyền.

Kiểm thử: `node --test tests/account-access.test.cjs tests/check-ins.test.cjs`.

## Trạng thái tài khoản

Migration `202610240003_inactive_accounts.sql` thêm `status: active | inactive`
và `inactive_at`. Vô hiệu hoá giữ nguyên role, plan, Auth và dữ liệu chung.
Tài khoản inactive không có quyền sử dụng tính năng quản trị hoặc Premium.
Xem [luồng vô hiệu hoá và triển khai](ACCOUNT_DELETION.md).
