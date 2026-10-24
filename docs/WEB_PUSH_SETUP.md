# Web Push trên Vercel + Supabase

Web Push dùng subscription trình duyệt, độc lập với Expo Push cho Android/iOS.
Frontend phục vụ qua HTTPS; Supabase Edge Functions gửi thông báo. Không cần Vercel Function hoặc cron mới trên Vercel.

## 1. Tạo khóa một lần

```powershell
node scripts/generate-web-push-keys.cjs mailto:YOUR_CONTACT_EMAIL
```

Script tạo `.env.web-push.local` (đã được gitignore), chỉ in khóa **public**.
Không ghi đè file có sẵn. Lưu giữ cặp khóa này; đổi khóa sẽ buộc trình duyệt đăng ký lại.
Không đưa khóa private vào biến `EXPO_PUBLIC_*`, source code hoặc Git.

## 2. Cấu hình frontend

Trong Vercel → Project → Settings → Environment Variables, thêm:

```dotenv
EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=PUBLIC_KEY_FROM_SCRIPT
```

Giữ hai biến `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` hiện có.
Đặt biến cho đúng môi trường Production/Preview rồi build lại; Expo nhúng biến public khi build.
Để thử local, thêm khóa public vào `.env.local`.

`vercel.json` dùng `npm run build:web`, phục vụ thư mục `dist`, ưu tiên file tĩnh trước fallback SPA.
`/sw.js` phải trả JavaScript và header không cache; `/manifest.json` phải trả JSON.
Manifest, icon và service worker được Expo sao chép từ `public/`.
Service worker chỉ xử lý push, không lưu cache HTML/dữ liệu người dùng.

## 3. Migration và backend

Đảm bảo CLI đã đăng nhập và link đúng Supabase project hiện có. Project cần đang hoạt động:

```powershell
npx supabase db push --dry-run
npx supabase db push
npx supabase secrets set --env-file .env.web-push.local
npx supabase functions deploy wish-action
npx supabase functions deploy deliver-gifts
```

Migration mới: `supabase/migrations/202610190001_web_push.sql`; cần các migration trước đó, bao gồm account deletion.
Các secrets mới: `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, `WEB_PUSH_VAPID_SUBJECT`.
Public key ở Supabase và Vercel phải giống nhau.

Worker `deliver-gifts` và `GIFT_WORKER_SECRET` dùng lại lịch chạy mỗi phút trong [PUSH_SETUP.md](PUSH_SETUP.md).
Gửi ngay sau khi hoàn thành điều ước; worker thử lại lỗi mạng/408/429/5xx tối đa 8 lần, hết hạn sau 1 ngày.
Không có secrets Web Push thì nhánh web chưa gửi, nhánh native vẫn hoạt động.

Hai bảng mới:

- `wish_web_push_subscriptions`: endpoint, khóa mã hóa và tài khoản sở hữu; không mở quyền đọc trực tiếp cho client.
- `gift_web_push_deliveries`: hàng đợi được tạo trong transaction lưu quà; trạng thái `accepted` chỉ là push service đã nhận, không chứng minh điện thoại hiển thị hay người dùng đọc.

Chỉ hỗ trợ endpoint HTTPS của FCM, Mozilla, Apple và WNS (`*.notify.windows.com`, gồm endpoint có query token của Edge).
Subscription trả 404/410 bị vô hiệu hóa. Khi chuyển tài khoản, worker kiểm tra lại người nhận trước khi gửi.
Đăng xuất gỡ subscription khỏi tài khoản, unsubscribe ở trình duyệt và đóng thông báo đang hiển thị.
Vô hiệu hoá tài khoản giữ subscription nhưng đặt `enabled=false`; xoá quà cascade xoá hàng đợi.

## 4. Kiểm tra thực tế

1. Deploy lại frontend sau khi cấu hình public key; triển khai migration/functions trước khi thử.
2. Hai tài khoản đăng nhập và ghép đôi. Người nhận mở chuông → **Bật thông báo trên trình duyệt này** → cho phép.
3. Người nhận đóng trang. Người gửi hoàn thành một điều ước của người nhận.
4. Xác nhận thông báo xuất hiện; chạm vào phải mở đúng hộp quà, với kiểm tra quyền người nhận hiện có.
5. Thử lúc trang đang mở: chuông/hộp thư cập nhật; chạm thông báo tái sử dụng cửa sổ app nếu có.
6. Thử tắt thông báo, tải lại, đăng xuất/đổi tài khoản: thiết bị không tiếp tục nhận quà của tài khoản cũ.
7. Thử thu hồi quyền ở cài đặt trình duyệt; app phải hướng dẫn bật lại thay vì tự mở lời nhắc liên tục.
8. Kiểm tra hàng đợi và logs của `deliver-gifts`; 401/403 thường cần kiểm tra lại cặp khóa VAPID/subject.

**iPhone/iPad:** iOS/iPadOS 16.4 trở lên; Chia sẻ → Thêm vào Màn hình chính, mở app từ biểu tượng đó rồi bật thông báo.
Tab thông thường sẽ hiện hướng dẫn thay vì nút xin quyền. Trình duyệt không hỗ trợ sẽ hiện thông báo phù hợp.
Thông báo dùng nội dung chung, không chứa tiêu đề điều ước trên màn hình khóa. Trình duyệt/hệ điều hành vẫn quyết định thời điểm hiển thị.

## Kiểm tra mã

```powershell
npm run lint
npm run typecheck
npm run test:web-push
npm run test:domain
npm run test:account-deletion
npm run build:web
npx deno check --config supabase/functions/deno.json supabase/functions/wish-action/index.ts supabase/functions/deliver-gifts/index.ts
```

Tests dùng mock push service; cần bước hai thiết bị ở trên để xác nhận gửi thật sau triển khai.

Tham khảo: [Expo PWA](https://docs.expo.dev/guides/progressive-web-apps/), [Web Push library](https://github.com/web-push-libs/web-push), [WebKit iOS Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
