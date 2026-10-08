# Thông báo hoàn thành điều ước và hộp quà

Mã nguồn đã có hai chế độ. Khi chưa cấu hình Supabase, app dùng hồ sơ demo Minh/Linh và lưu hộp thư trên thiết bị. Khi có cấu hình, app dùng Supabase Auth, ghép đôi bằng mã mời, dữ liệu chung trên máy chủ và Expo Push Service. Hai chế độ không trộn dữ liệu.

## 1. Tạo Supabase

Tạo dự án trong [Supabase Dashboard](https://supabase.com/dashboard). Bật đăng nhập Email/Password; giữ xác nhận email và cấu hình SMTP nếu đưa app vào sử dụng thực tế. Sao chép Project URL và publishable key vào `.env.local` theo `.env.example`. Publishable key được phép nằm trong app; service-role key chỉ ở backend.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
EXPO_PUBLIC_EAS_PROJECT_ID=YOUR_EAS_PROJECT_ID
```

Chạy migration `supabase/migrations/202610080001_gift_notifications.sql` trong SQL Editor. Hoặc dùng CLI từ thư mục dự án:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy wish-action
npx supabase functions deploy deliver-gifts
```

`wish-action` xác thực JWT với Supabase Auth, lấy danh tính từ membership và dùng cùng hàm xử lý điều ước với app. Người gọi không được chọn người nhận push. Snapshot, thông báo và hàng đợi gửi được ghi trong một transaction. Version của snapshot chống ghi đè khi hai điện thoại cập nhật cùng lúc. RPC đọc dữ liệu lọc các bất ngờ đang chuẩn bị của người còn lại.

Ảnh được tải vào bucket riêng `wish-photos`, giới hạn 10 MB mỗi ảnh. Chỉ thành viên cặp đôi được tải lên/đọc; app dùng URL ký có hạn. Dữ liệu thật của cặp đôi mới bắt đầu trống, không có kỷ niệm mẫu.

## 2. Bật worker gửi lại và kiểm tra receipt

Tạo chuỗi ngẫu nhiên dài cho `GIFT_WORKER_SECRET`, đặt qua Dashboard → Edge Functions → Secrets. Có thể dùng `supabase/functions/.env.example` làm mẫu file bí mật **ở ngoài repo** rồi chạy:

```powershell
npx supabase secrets set --env-file PATH_TO_PRIVATE_ENV_FILE
```

Backend thử gửi ngay sau khi hoàn thành. Worker chạy mỗi phút để gửi lại khi Expo tạm lỗi, kiểm tra receipt sau 15 phút, và vô hiệu hóa token `DeviceNotRegistered`. Mỗi lần gửi có lease để hai worker không gửi đồng thời; timeout mạng vẫn có thể gây gửi lặp vì Expo không cung cấp idempotency key. Một thông báo trong app chỉ được tạo một lần cho mỗi lần hoàn thành hợp lệ.

Bật extensions `pg_cron`, `pg_net` và Vault trong Supabase. Lưu URL và secret vào Vault qua giao diện, với tên `gift_worker_url` và `gift_worker_secret`:

- URL: `https://YOUR_PROJECT.supabase.co/functions/v1/deliver-gifts`
- Secret: cùng giá trị `GIFT_WORKER_SECRET`

Chạy SQL:

```sql
select cron.schedule('ourwish-gift-worker', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'gift_worker_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'gift_worker_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);
```

`verify_jwt = false` trong config là có chủ đích: `wish-action` tự xác thực người dùng bằng `Auth.getUser`, còn `deliver-gifts` yêu cầu secret riêng. Không bỏ hai bước kiểm tra này.

Kiểm tra `gift_push_deliveries`: `pending` → `sending` → `accepted` → `delivered`. `accepted` là Expo đã nhận; `delivered` là nhà cung cấp APNs/FCM đã chấp nhận theo receipt, không chứng minh người nhận đã nhìn thấy. `gift_notifications.read_at` được ghi khi người nhận mở quà.

## 3. Cấu hình EAS và cài app lên hai điện thoại

Theo [hướng dẫn push của Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/), push cần credentials APNs/FCM và development/release build. Không kiểm tra push bằng trình duyệt; màn hộp quà và hộp thư vẫn chạy trên web.

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build:configure
```

Ghi EAS project ID vào `.env.local` và `extra.eas.projectId` trong app config nếu `eas init` chưa thêm. Chọn `android.package` và `ios.bundleIdentifier` của bạn; cấu hình FCM V1 cho Android/APNs cho iOS theo hướng dẫn Expo. EAS có thể giúp tạo credentials iOS; Android cần Firebase project và service account tương ứng. Không commit các file credentials.

`.env.local` không tự được gửi lên EAS. Tạo ba biến `EXPO_PUBLIC_*` ở EAS Dashboard cho environment dùng khi build. Profile development dùng environment `development`, preview dùng `preview`, production dùng `production`.

```powershell
npx eas-cli@latest build --profile development --platform android
# Hoặc iOS với Apple Developer account và thiết bị đã đăng ký:
npx eas-cli@latest build --profile development --platform ios
npx expo start --dev-client --clear
```

Package `expo-dev-client` và plugin `expo-notifications` đã có trong app. Sau thay đổi native modules, cài lại bản build mới. Có thể dùng profile `preview` để cài bản hoạt động độc lập với Metro.

## 4. Kiểm tra luồng trên hai điện thoại

### Thử hiệu ứng nhận quà trên một điện thoại bằng Expo Go

Trong bản phát triển, đăng nhập và ghép đôi rồi mở màn **Thông báo**:

1. Chọn **Thử nhận quà từ người ấy 🎁** và cho phép thông báo.
2. Đưa app xuống nền. Sau 5 giây, thông báo mô phỏng hoàn thành điều ước xuất hiện trên chính điện thoại này.
3. Chạm thông báo: màn hộp quà mở ra, chạy hiệu ứng mở nắp và tung tua rua. Chọn **Mở lại** để xem lại animation.
4. Có thể chọn **Xem thử hiệu ứng hộp quà** để mở trực tiếp, không cần chờ thông báo.

Quà thử không tạo điều ước, kỷ niệm hoặc thông báo trong database và không gửi sang điện thoại đối phương. Các nút thử chỉ xuất hiện trong bản phát triển. Nếu điện thoại bật Reduce Motion, hộp quà hiển thị trạng thái đã mở và không chạy animation.

### Thử gửi thật sang người nhận bằng development build

1. Tạo hai tài khoản bằng email khác nhau, xác nhận email và đăng nhập.
2. Người A tạo không gian. Trong **Của chúng ta**, sao chép mã mời. Người B nhập mã để ghép đôi. Mã chỉ dùng một lần, hết hạn sau 7 ngày.
3. Cả hai mở biểu tượng chuông → **Bật thông báo trên điện thoại** và cấp quyền.
4. B thêm điều ước. A vào hũ của B → bắt đầu chuẩn bị → hoàn thành → **Hoàn thành & gửi bất ngờ**.
5. B nhận push. Chạm khi app đang mở, ở nền và đã đóng: cả ba phải vào `/gift/[id]` của đúng người nhận. Hộp quà mở nắp, trái tim hiện lên, tua rua bay ra; nút cuối mở đúng kỷ niệm.
6. Thử lưu lại yêu cầu hoàn thành: backend không tạo thêm kỷ niệm/thông báo. Thử tài khoản khác mở URL hộp quà: không xem được nội dung.
7. Tắt mạng lúc gửi: app báo lỗi nếu chưa lưu. Nếu đã commit nhưng phản hồi mất, lần thử lại trả trạng thái đã hoàn thành; worker vẫn xử lý push.
8. Đăng xuất: token thiết bị được gỡ khỏi tài khoản trước khi đổi người dùng. Token không nhận quà của tài khoản cũ.

Trong demo trên web, hoàn thành điều ước bằng Minh rồi vào **Của chúng ta → Cài đặt → Linh**, mở chuông và thông báo để xem animation. Làm mới trang vẫn giữ kỷ niệm, thông báo và trạng thái đã đọc.

## Kiểm tra mã nguồn

```powershell
npx expo lint
npx tsc --noEmit
node --test tests/domain.test.cjs
deno check --config supabase/functions/deno.json supabase/functions/wish-action/index.ts supabase/functions/deliver-gifts/index.ts
```

Chưa triển khai hoặc xác minh push tới điện thoại thật khi chưa có Supabase/EAS project và credentials. Việc chạy lint/typecheck không thay thế bước kiểm tra trên hai điện thoại.
