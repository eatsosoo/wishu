# Rà soát bảo mật — 24/10/2026

## Phạm vi và kết quả

Rà soát source hiện tại, toàn bộ migration SQL trong repository, Edge Functions, auth/session, quyền thiết bị, Storage, push và dependencies npm. Kiểm chứng SQL bằng PGlite và kiểm chứng bất đồng bộ bằng mock chạy code hiện tại, dùng Node 24.22.1. Không thử tải, dò mã, tạo tài khoản hoặc sửa cấu hình production. Không có kết nối quản trị Supabase trong phiên này; chưa xác nhận migration thực tế đã triển khai hay cấu hình Dashboard.

Có **4 vấn đề đã tái hiện cục bộ**: một P1 và ba P2. Ba lỗi mã mời/logout/push race từng được ghi trong audit 19/10 và vẫn tồn tại trong code hiện tại. Không tìm thấy đường vượt quyền giữa các không gian trong những kiểm thử đã chạy; đây không phải bảo đảm không còn lỗ hổng.

| Kiểm tra | Kết quả |
| --- | --- |
| 8 file test về quyền, ảnh, Edge Functions, push và xoá tài khoản | 62/62 đạt |
| Probe nhập sai mã mời | 100 lần sai; mã đúng vẫn được nhận ngay sau đó |
| Probe số lượng push token | Một user đăng ký được 100 token khác nhau |
| Probe logout khi huỷ push lỗi | Không gọi signOut, không dọn ảnh riêng tư |
| Probe register/unregister push native chạy đồng thời | RPC huỷ không được gọi; token được lưu sau khi huỷ |
| Lint / TypeScript | Đạt / đạt |
| npm audit online | 10 package bị đánh dấu: 5 high, 5 moderate; 3 advisory gốc |
| Quét mẫu secret trong file tracked | Không có mẫu private key, Supabase secret key, GitHub token hoặc AWS access key trùng khớp |

Quét secret theo mẫu không bao quát mọi dạng credential và chưa kiểm tra lịch sử Git. `.env` không được track; chỉ `.env.example` được track. Không đưa giá trị credential vào báo cáo.

## Phát hiện đã kiểm chứng

### SEC-01 — P1: Mã mời ngắn thiếu giới hạn thử ở RPC trực tiếp

Vị trí: `supabase/migrations/202610190003_normalize_wish_data.sql:185`, `supabase/migrations/202610080003_five_character_invite_codes.sql:3`, `src/app/pair.tsx:29`.

`join_couple` được cấp EXECUTE cho authenticated, và app gọi RPC trực tiếp. Function không có bộ đếm thử, cửa sổ thời gian, cooldown hoặc phê duyệt của chủ không gian. Advisory lock theo user chỉ tuần tự hoá transaction, không giới hạn tần suất. Mã gồm 5 ký tự trên bảng chữ cái 32 ký tự, tức tối đa 33.554.432 mã; thời hạn mặc định là 7 ngày.

Probe trên migration hiện tại gọi mã sai 100 lần với cùng user, sau đó dùng mã đúng: user được thêm vào không gian ngay và nhận snapshot. Probe chứng minh thiếu throttle ở SQL, không chứng minh đã đoán trúng mã ngẫu nhiên hoặc vượt giới hạn hạ tầng production.

Nếu đoán được mã còn hiệu lực của không gian chưa đủ người, tài khoản lạ có đầy đủ quyền thành viên thứ hai: đọc dữ liệu chung và thực hiện thao tác chung, gồm luồng xoá không gian khi xoá tài khoản của chính mình.

Đề xuất: giới hạn thử bền vững theo user trên chính đường RPC; thêm giới hạn theo IP ở gateway/Edge nếu có thể ngăn gọi vòng; tăng entropy hoặc thêm phê duyệt của chủ không gian. Rút ngắn TTL và giữ tính dùng một lần. Không lưu bộ đếm thất bại rồi RAISE EXCEPTION trong cùng transaction vì bộ đếm sẽ rollback. Rate limit Auth không thay thế limiter cho RPC nghiệp vụ.

### SEC-02 — P2: Huỷ push lỗi làm đăng xuất không hoàn tất

Vị trí: `src/hooks/use-wish-store.tsx:109`, `src/services/push.native.ts:47`, `src/services/push.web.ts:71`.

`logout()` đợi `unregisterPush()` trước khi `auth.signOut()` và dọn state. Nếu huỷ token RPC lỗi/mất mạng, catch chỉ hiện lỗi: signOut không chạy, dữ liệu và session cũ còn lại. Lỗi trực tiếp từ signOut cũng bỏ qua phần cleanup.

Probe chạy thân hàm logout hiện tại với unregisterPush trả lỗi Offline: signOut được gọi 0 lần và clearPrivatePhotos không chạy. Đây là vấn đề thiết bị dùng chung/không đăng xuất được; chưa phải chứng minh người dùng khác trên mạng đọc được phiên.

Đề xuất: bảo đảm xoá session đã lưu và state local ngay cả khi thu hồi push/phiên server lỗi; huỷ các tác vụ đang chạy bằng generation trước khi dọn. Tách retry thu hồi push khỏi kết quả đăng xuất local, đồng thời xử lý SEC-03 để tránh giữ push của tài khoản cũ.

### SEC-03 — P2: Race đăng ký push native giữ token sau khi đã huỷ

Vị trí: `src/services/push.native.ts:30–54`, `src/components/NotificationBridge.native.tsx`.

registerPush chưa theo dõi tác vụ đang chạy, user/generation hoặc trạng thái đang logout. RPC có thể đã commit, nhưng client chưa nhận phản hồi nên AsyncStorage chưa có token. unregisterPush đọc rỗng và không huỷ server; tác vụ cũ sau đó tiếp tục lưu token.

Probe trì hoãn phản hồi register RPC sau khi server đã ghi: unregister RPC được gọi 0 lần, token vẫn enabled và được lưu local sau unregisterPush. Worker kiểm tra người nhận không sửa được tình huống này vì database vẫn gắn token với user cũ. Native gift push còn chứa tiêu đề điều ước, nên thiết bị có thể nhận nội dung riêng tư của phiên trước.

Đề xuất: quản lý tác vụ đăng ký theo user/generation, chặn tác vụ mới khi logout, chờ hoặc huỷ và dọn registration đang chạy trước khi mất credential. Thêm kiểm thử thứ tự phản hồi đảo ngược và chuyển tài khoản. Dùng nội dung push chung để giảm hậu quả lộ trên màn khoá.

### SEC-04 — P2: Thiếu quota và rate limit cho ghi dữ liệu/đăng ký thiết bị

Vị trí: `supabase/functions/wish-action/index.ts:49`, `supabase/migrations/202610080001_gift_notifications.sql:133`, `supabase/migrations/202610190001_web_push.sql:29`, policy upload trong `202610190003_normalize_wish_data.sql:312`.

Không thấy limiter theo user/IP cho wish-action hoặc quota số token/subscription/đối tượng lưu trữ trong code. Probe đăng ký 100 Expo token đúng định dạng bằng cùng user: cả 100 được lưu. Đây là token giả chỉ lưu trong DB cục bộ, không gửi ra Expo. Mỗi notification có thể tạo delivery cho toàn bộ thiết bị enabled; attacker tạo nhiều subscription/token và thao tác hợp lệ có thể khuếch đại outbox, tài nguyên DB và chi phí xử lý.

Giới hạn 2 MB/MIME mỗi upload và 4 ảnh/kỷ niệm có hiệu lực ở cấu hình/SQL nhưng không phải quota tổng. Upload trực tiếp bằng Storage API có thể bỏ qua kiểm tra/UI của app; policy hiện ràng buộc user/couple, chưa giới hạn tổng file/byte theo user. Không đo tốc độ hay tải production.

Đề xuất: cap số thiết bị hoạt động, dọn token cũ, quota file/byte theo user/couple, limiter thao tác ghi và tạo notification. Áp dụng trong SQL/RPC/Storage hoặc gateway bao phủ toàn bộ đường gọi; limiter ở UI không đủ. Không dùng bộ đếm trong memory của Edge worker làm giới hạn toàn cục.

## Authentication và phân quyền đã kiểm tra

- wish-action và delete-account xác thực bearer bằng `admin.auth.getUser(token)`; p_user lấy từ user đã xác thực, không từ request body. `verify_jwt=false` không có nghĩa endpoint bỏ auth vì đã kiểm tra riêng trong handler.
- deliver-gifts yêu cầu GIFT_WORKER_SECRET và từ chối khi thiếu secret. Không coi endpoint cron là endpoint user thông thường.
- RPC mutation `apply_wish_command` và phiên bản trước check-in bị thu hồi quyền client; authenticated không được ghi trực tiếp các bảng ứng dụng. Function có quyền cao ràng buộc membership và dùng search_path cố định.
- RLS/get_my_couple giới hạn dữ liệu theo không gian; preparations theo người chuẩn bị, notification theo người nhận; chủ điều ước kiểm soát xoá/ẩn; check-in chỉ người tạo sửa/xoá. Các bài kiểm thử tương ứng đạt.
- Ảnh check-in bắt buộc dùng path Storage riêng tư của uploader, không dùng ảnh HTTPS hoặc path người kia; policy và trigger chặn tham chiếu sai. Thumbnail giữ ranh giới không gian và quyền nguồn, cả cover điều ước ẩn.
- Bucket wish-photos đặt private; upload chỉ vào thư mục user trong đúng couple và bị chặn khi xoá không gian. Xoá tài khoản dùng user đã xác thực, lấy path từ DB, dọn file trước khi xoá Auth.
- Web push có allowlist endpoint và kiểm tra lại chủ thiết bị, giảm SSRF/trộn tài khoản. Web iframe dùng sandbox allow-scripts và kiểm tra message source; native WebView có chặn navigation. originWhitelist `*` riêng lẻ chưa chứng minh bypass.
- CORS `*` với bearer token không tự chứng minh CSRF/vượt quyền; chưa thấy auth cookie tự động được dùng cho các Edge endpoint này.

## Quyền thiết bị và bảo vệ dữ liệu: cần tăng cường hoặc xác minh

- **Session native:** cloud.ts dùng AsyncStorage cho access/refresh session. Đây là storage không mã hoá; cân nhắc SecureStore/Keychain/Keystore với adapter phù hợp và migration phiên. Không coi đây là lỗ hổng đọc token từ xa. Chưa kiểm thử backup/root/jailbreak.
- **Auth production:** config.toml chưa khai báo chính sách mật khẩu, email confirmation, CAPTCHA, rate limit login/signup, redirect allowlist, thời hạn session hoặc MFA. UI chỉ yêu cầu mật khẩu tối thiểu 6 ký tự. Cần xác minh giá trị thực trong Dashboard; không kết luận các bảo vệ mặc định bị tắt. Auth có rate limit tích hợp nhưng không bao phủ mọi RPC nghiệp vụ.
- **Xoá tài khoản:** bearer hợp lệ + confirmation DELETE là đủ; chưa có kiểm tra xác thực lại gần thời điểm xoá. Cân nhắc reauthentication cho hành động phá huỷ dữ liệu chung.
- **Body request:** wish-action đọc toàn bộ request.text trước khi kiểm tra độ dài thực; Content-Length có thể thiếu và body.length tính ký tự, không phải byte. delete-account đọc JSON không có giới hạn trong handler. Nên đọc stream với giới hạn byte trước parse; chưa đo DoS hoặc giới hạn gateway production.
- **Ảnh riêng tư:** check-in dùng cache trong bộ nhớ và scope tài khoản. Wish/memory còn tạo signed URL 3.600 giây; không thể coi logout hoặc ẩn điều ước là thu hồi tức thì URL đã cấp. Rà soát cache ảnh trên build thật và kỳ vọng thu hồi dữ liệu.
- **Ảnh bên ngoài:** wish/memory chấp nhận ảnh HTTPS bất kỳ; người kia mở ảnh có thể phát sinh request đến máy chủ do thành viên kiểm soát. Cân nhắc giới hạn về Storage dự án nếu không cần ảnh ngoài. Chưa thấy server fetch ảnh này nên không kết luận SSRF.
- **Bản đồ:** WebView/iframe tải JS MapLibre từ unpkg, có pin version nhưng chưa có integrity hoặc bundle local. Script này xử lý vị trí và thumbnail riêng tư; cân nhắc đóng gói asset và giới hạn CSP. Chưa có bằng chứng CDN bị chiếm.
- **Web headers:** vercel.json chưa khai báo CSP/frame-ancestors, Referrer-Policy, X-Content-Type-Options. Chưa đọc response production; nền tảng có thể đã bổ sung.
- **Camera/vị trí:** camera chỉ được hiển thị khi được cấp quyền, có focus và foreground; xử lý quyền bị từ chối/canAskAgain. Vị trí chỉ xin foreground khi người dùng chọn định vị; có chọn vị trí thủ công. app.json tắt recordAudioAndroid và microphonePermission của picker; không thấy yêu cầu background location trong source đã rà soát. Quyền native cuối cùng vẫn cần kiểm tra manifest/Info.plist của development/release build.

## Dependencies

npm audit online tại thời điểm kiểm tra trả về 10 package bị đánh dấu, không tương đương 10 lỗi độc lập. Có 3 advisory gốc:

| Package đã cài | Advisory | Phạm vi xác định trong dependency tree |
| --- | --- | --- |
| node-forge 1.4.0 | GHSA-86w9-cpqp-85rv, high | Expo CLI và code-signing certificates |
| zod 3.25.76 | GHSA-mrhx-c7xc-m3w5, high | Expo CLI và eslint-plugin-react-hooks |
| postcss-selector-parser 6.1.4 | GHSA-rj75-hqrm-r3gf, moderate | Tailwind/PostCSS build tooling |

Chưa chứng minh advisory nào có đường khai thác từ input người dùng trong bản app. Không chạy npm audit fix --force: đề xuất tự động có hạ Expo xuống 44 và nâng major Tailwind, không phù hợp SDK 58. Cần vá dependency có kiểm soát và xác minh API tương thích.

## Thứ tự xử lý

1. Chặn brute force mã mời trên đường RPC thực tế và tăng độ an toàn cơ chế ghép đôi.
2. Sửa logout và race đăng ký push cùng nhau; kiểm thử offline và đổi tài khoản.
3. Bổ sung limiter/quota cho ghi dữ liệu, Storage và thiết bị push; xác minh Auth production.
4. Cứng hoá lưu session, giới hạn body, reauthentication, signed URL/cache và nội dung push.
5. Cập nhật tooling dependencies, bundle bản đồ/CSP và kiểm tra quyền trên binary thật.

## Tái kiểm tra

Chạy bằng Node 24:

```powershell
node --test tests/wish-visibility.test.cjs tests/check-in-photo-privacy.test.cjs tests/check-ins.test.cjs tests/check-in-native-push.test.cjs tests/account-deletion.test.cjs tests/relational-db.test.cjs tests/wish-action.test.cjs tests/web-push.test.cjs
node tmp/security-audit-probes.cjs
npm run lint
npm run typecheck
npm audit --json
```

Script probe trong tmp dùng fixture DB và mock, không kết nối production. Nó xác nhận hành vi hiện tại đang có vấn đề; sau khi sửa, không dùng kết quả assert của probe này làm chuẩn bảo mật mong muốn.

## Tài liệu đối chiếu

- [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Rate limiting Edge Functions](https://supabase.com/docs/guides/functions/examples/rate-limiting)
- [React Native security: AsyncStorage](https://reactnative.dev/docs/security)
- [Supabase private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Supabase serving downloads and signed URLs](https://supabase.com/docs/guides/storage/serving/downloads)
- [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
- [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
- [PostCSS selector parser advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)

Rà soát này chỉ thêm báo cáo và probe cục bộ; không sửa hành vi ứng dụng, migration hoặc cấu hình production.
