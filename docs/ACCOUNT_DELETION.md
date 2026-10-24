# Vô hiệu hoá tài khoản

Trong **Của chúng ta → Cài đặt → Vô hiệu hoá tài khoản**, người dùng xác nhận
chuyển tài khoản sang `inactive` và được đăng xuất khỏi thiết bị hiện tại.

- Giữ nguyên bản ghi Supabase Auth, email, role, plan và liên kết cặp đôi.
- Giữ nguyên toàn bộ ảnh, điều ước, check-in, kỷ niệm và thông báo.
- Người còn lại tiếp tục sử dụng không gian chung bình thường.
- Dừng push tới tài khoản inactive bằng `enabled=false` cho token/subscription.
- JWT cũ không thể đọc/ghi dữ liệu app, tải/upload ảnh, tạo/tham gia cặp đôi
  hoặc đăng ký lại push. RLS và RPC đều kiểm tra trạng thái.
- Auth vẫn tồn tại: đăng nhập lại chỉ hiển thị màn hình tài khoản vô hiệu hoá,
  không tự kích hoạt lại và không tạo tài khoản mới bằng cùng email.

Endpoint vẫn mang tên `delete-account` để tương thích client đã phát hành,
nhưng chỉ gọi RPC service-only `deactivate_account` với ID user đã xác thực.
Không gọi xoá Auth hoặc Storage. Body mới là `{"confirmation":"DEACTIVATE"}`;
backend mới chấp nhận cả `DELETE` từ client cũ nhưng cũng chỉ vô hiệu hoá.
Backend cũ từ chối `DEACTIVATE`, tránh xoá hẳn khi client mới chạy trước backend.

## Triển khai

Áp dụng migration theo thứ tự, gồm `202610240002_account_access.sql` và
`202610240003_inactive_accounts.sql`, rồi triển khai Edge Function:

```sh
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase functions deploy delete-account
```

Migration mới thu hồi quyền service role với RPC dọn dữ liệu cũ, để worker cũ
không thể bắt đầu xoá Auth/ảnh trong khoảng chuyển tiếp. Các migration cũ giữ
nguyên cho lịch sử và môi trường đã triển khai.

## Kích hoạt lại

Chỉ môi trường tin cậy (SQL Editor hoặc backend có service role) được đổi trạng
thái. Thay `USER_UUID` bằng UUID thật:

```sql
update public.account_access
set status = 'active', inactive_at = null
where user_id = 'USER_UUID';
```

User đăng nhập lại sẽ dùng được dữ liệu và không gian cũ. Push cần được bật lại
trên thiết bị. Client không có quyền tự sửa status; role admin hiện là nền tảng,
chưa có màn hình quản trị để kích hoạt tài khoản.

## Kiểm thử

```sh
node --test tests/account-deletion.test.cjs tests/account-access.test.cjs
npm run lint
npm run typecheck
```

Kiểm thử xác nhận giữ dữ liệu và Auth, endpoint không nhận ID từ caller, retry
an toàn, partner còn quyền truy cập, JWT cũ bị chặn và kích hoạt lại không làm
mất dữ liệu. Không thay đổi trạng thái tài khoản thật khi chạy kiểm thử.
