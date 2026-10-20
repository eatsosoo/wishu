# Rà soát bảo mật và phân quyền — 19/10/2026

Mã nguồn được rà soát: commit `3d9387f`, workspace `/Users/Jin/Developer/projects/AI/wishu`.

Đã kiểm tra luồng đăng nhập/đăng xuất, điều hướng bảo vệ, Edge Functions, SQL migrations và RPC, RLS/grants, quyền sở hữu điều ước, dữ liệu cặp đôi, Storage, push native/web, xoá tài khoản, cấu hình web, dependency lockfiles và một số mẫu secret trong các tệp Git theo dõi.

Đây là đánh giá mã nguồn và kiểm chứng local. Không thực hiện dò mã mời, tải dữ liệu hoặc thử khai thác trên production. Chưa xác minh cấu hình thực tế của Supabase Auth, gateway/rate limit, database grants/policies đang triển khai, response headers, backup hay cấu hình EAS/Vercel. Mô hình kiểm tra SQL dùng PGlite với schema Auth/Storage giả lập, không thay thế kiểm tra Storage API và giao dịch đồng thời trên Supabase thật.

## Kết quả kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `node --test tests/*.test.cjs` | 63/63 pass |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| Thử sai mã mời 80 lần trong SQL local, sau đó dùng mã đúng | 80 lỗi thông thường; lần tiếp theo vẫn ghép đôi thành công, không có cooldown trong RPC |
| Giả lập lỗi mạng khi huỷ push rồi gọi đăng xuất | `auth.signOut()` không được gọi; `signedIn` vẫn là `true` |
| Giả lập đăng ký push native đang chờ phản hồi trong lúc huỷ | Không gọi RPC huỷ; token vẫn gắn tài khoản và được ghi local sau khi huỷ |
| Kiểm tra RLS upload bằng 20 bản ghi metadata local | Cùng thành viên có thể thêm liên tiếp; không có quota số lượng ở policy |
| `npm audit --json` | 35 package bị đánh dấu: 21 high, 14 moderate; 0 critical; gồm cảnh báo lan truyền qua cây dependency |
| Kiểm tra advisory cho npm dependencies trong `supabase/functions/deno.lock` | 29 package, không có advisory được npm registry trả về tại thời điểm kiểm tra |
| Quét mẫu secret trong 183 đường dẫn Git theo dõi | Không tìm thấy mẫu private key, Supabase secret/service-role JWT, GitHub token hoặc AWS access key đã kiểm tra |

Các probe bổ sung chỉ dùng dữ liệu giả trong bộ nhớ, mock hoặc database local. Probe quota không tải file thật. Kết quả quét secret không phải chứng minh rằng mọi loại secret hoặc mọi commit lịch sử đều an toàn.

## Phát hiện cần khắc phục

### SEC-01 — P1: Mã mời 5 ký tự thiếu giới hạn số lần thử

Vị trí:

- [Hàm sinh mã](/Users/Jin/Developer/projects/AI/wishu/supabase/migrations/202610080003_five_character_invite_codes.sql:3).
- [RPC ghép đôi đang có hiệu lực](/Users/Jin/Developer/projects/AI/wishu/supabase/migrations/202610190003_normalize_wish_data.sql:185).
- [Thời hạn mặc định 7 ngày](/Users/Jin/Developer/projects/AI/wishu/supabase/migrations/202610080001_gift_notifications.sql:5).

Mã dùng 32 ký tự, dài 5 ký tự: tổng cộng 33.554.432 khả năng, tương đương 25 bit. Một tài khoản đã đăng nhập nhưng chưa ghép đôi có thể gọi trực tiếp `join_couple` liên tục. Advisory lock chỉ tuần tự hoá yêu cầu của cùng người dùng, không giới hạn số lần hoặc khoảng thời gian. UI kiểm tra định dạng không bảo vệ đường gọi RPC trực tiếp.

Đã tái hiện 80 lần nhập sai liên tiếp không bị khoá hoặc trì hoãn; dùng mã đúng ngay sau đó vẫn tham gia được và nhận snapshot. Đây là bằng chứng thiếu throttle trong RPC, không phải bằng chứng đã đoán trúng mã ngẫu nhiên. Tốc độ tấn công thực tế phụ thuộc giới hạn hạ tầng chưa kiểm tra.

Nếu dò trúng mã còn hiệu lực của một không gian chưa đủ người, tài khoản lạ có thể trở thành thành viên thứ hai, đọc điều ước/kỷ niệm/ảnh theo quyền thành viên và thực hiện các thao tác chung. Vì `delete-account` xoá cả không gian của thành viên đang xác thực, việc ghép đôi trái phép còn có thể dẫn đến mất dữ liệu chung.

Khắc phục: giới hạn thử theo user và IP, dùng TTL ngắn hơn, thêm xác nhận của người tạo trước khi cấp quyền thành viên. Nếu sản phẩm cho phép, tăng độ dài hoặc dùng token ngẫu nhiên đủ dài trong link mời. Rate limit cần nằm trên đường RPC thực tế; đặt riêng ở UI hoặc một Edge Function có thể bị gọi vòng qua. Nếu lưu lần thử trong cùng transaction rồi `RAISE EXCEPTION`, bản ghi lần thử cũng rollback: cần thiết kế cách ghi nhận thất bại vẫn tồn tại.

### SEC-02 — P2: Lỗi huỷ push có thể ngăn đăng xuất và giữ phiên cùng dữ liệu trên thiết bị

Vị trí: [logout()](/Users/Jin/Developer/projects/AI/wishu/src/hooks/use-wish-store.tsx:84), [huỷ push native](/Users/Jin/Developer/projects/AI/wishu/src/services/push.native.ts:46), [huỷ push web](/Users/Jin/Developer/projects/AI/wishu/src/services/push.web.ts:71).

`logout()` đợi `unregisterPush()` trước khi gọi `supabase.auth.signOut()` và xoá snapshot. Khi RPC huỷ push lỗi hoặc thiết bị mất mạng, hàm nhảy vào `catch`; phiên và dữ liệu trong bộ nhớ vẫn giữ nguyên. Người dùng dùng chung thiết bị có thể tưởng đã thoát sau khi đóng bảng cài đặt, trong khi ứng dụng vẫn mở bằng tài khoản cũ. Ngoài ra, lỗi từ chính `signOut()` cũng khiến phần dọn dữ liệu bị bỏ qua.

Probe mock trả lỗi `Offline` từ `unregisterPush`: số lần gọi `signOut` bằng 0, trạng thái `signedIn` vẫn `true`.

Khắc phục: vô hiệu hoá phiên sử dụng trong UI và dọn dữ liệu local theo một luồng đảm bảo chạy; xử lý huỷ push và thu hồi phiên server với retry độc lập. Kiểm tra rõ hành vi xoá token lưu trữ khi mạng lỗi, tránh ứng dụng khôi phục lại phiên cũ ở lần mở tiếp theo. Lưu ý xoá phiên local không tự bảo đảm push đã bị huỷ ở server; cần xử lý đồng thời SEC-03.

### SEC-03 — P2: Đăng ký push native có thể hoàn tất sau khi huỷ và giữ liên kết với tài khoản cũ

Vị trí: [registerPush()/unregisterPush()](/Users/Jin/Developer/projects/AI/wishu/src/services/push.native.ts:29), [tự đăng ký khi mở app](/Users/Jin/Developer/projects/AI/wishu/src/components/NotificationBridge.native.tsx:31).

Bản native không có cơ chế quản lý tác vụ đăng ký đang chạy/generation như bản web. RPC đăng ký có thể đã ghi token trên server nhưng chưa trả phản hồi, trong khi token chưa được lưu vào AsyncStorage. `unregisterPush()` lúc đó đọc được giá trị rỗng và bỏ qua RPC huỷ. Sau khi đăng xuất, tác vụ đăng ký cũ nhận phản hồi rồi lưu token local.

Đã tái hiện bằng cách trì hoãn phản hồi RPC đăng ký: số lần gọi RPC huỷ bằng 0, liên kết server vẫn còn và token được lưu sau khi thao tác huỷ hoàn tất. Thiết bị có thể tiếp tục nhận thông báo tài khoản cũ. Worker kiểm tra chủ sở hữu token không giải quyết trường hợp này, vì token vẫn thuộc tài khoản cũ trong database.

Khắc phục: quản lý tác vụ đăng ký đang chạy, chặn tác vụ mới khi đăng xuất và chờ/dọn tác vụ đã bắt đầu trước khi kết thúc phiên; ràng buộc tác vụ với user/generation. Kiểm tra cả trường hợp RPC đã commit nhưng phản hồi chưa về. Nên dùng thông báo native dạng chung như bản web, vì worker hiện đưa tên điều ước vào nội dung có thể hiện trên màn hình khoá: [payload native](/Users/Jin/Developer/projects/AI/wishu/supabase/functions/_shared/deliver.ts:24).

### SEC-04 — P2: Storage và lệnh ghi thiếu quota theo người dùng/cặp đôi

Vị trí: [policy upload](/Users/Jin/Developer/projects/AI/wishu/supabase/migrations/202610190003_normalize_wish_data.sql:312), [giới hạn 2 MiB mỗi file](/Users/Jin/Developer/projects/AI/wishu/supabase/migrations/202610190002_photo_upload_limits.sql:2), [upload trước khi gửi lệnh](/Users/Jin/Developer/projects/AI/wishu/src/services/cloud.ts:59).

Policy kiểm tra đúng cặp đôi và thư mục người tải, bucket giới hạn MIME/2 MiB mỗi file. Tuy nhiên không có giới hạn số lượng, tổng dung lượng hay tốc độ tải theo tài khoản. Giới hạn 8 ảnh chỉ áp dụng cho một kỷ niệm; người dùng có thể gọi Storage API trực tiếp để tạo nhiều file không gắn với bản ghi. File upload cũng có thể thành file mồ côi khi lệnh tạo điều ước/kỷ niệm thất bại.

Probe local xác nhận policy cho phép thêm liên tiếp 20 metadata object của cùng người dùng. Đây là kiểm chứng policy, chưa đo chi phí hoặc tải lên dịch vụ thật. Lệnh tạo điều ước cũng không có quota; `get_my_couple()` trả toàn bộ danh sách và client refresh mỗi 15 giây, nên dữ liệu tăng không giới hạn còn làm tăng chi phí đọc/database.

Khắc phục: quota dung lượng và số file theo cặp đôi, kiểm tra nguyên tử khi cấp quyền upload, rate limit lệnh ghi, dọn file mồ côi sau một thời gian an toàn và phân trang dữ liệu. Giữ nguyên ảnh còn được kỷ niệm tham chiếu khi dọn. Giới hạn tổng ngân sách hạ tầng không thay thế quota theo tài khoản.

### SEC-05 — P2: Dependency có advisory, gồm một đường giải mã URL trong runtime

Vị trí: [lockfile decode-uri-component](/Users/Jin/Developer/projects/AI/wishu/package-lock.json:4933), [node-forge](/Users/Jin/Developer/projects/AI/wishu/package-lock.json:8797), [braces](/Users/Jin/Developer/projects/AI/wishu/package-lock.json:4358).

`npm audit` báo 35 package bị đánh dấu, không đồng nghĩa có 35 lỗi độc lập khai thác được trong ứng dụng. Có 5 advisory gốc được trả về:

| Package đã khóa | Advisory | Phạm vi cần xem xét |
| --- | --- | --- |
| `decode-uri-component@0.2.2` | [GHSA-vcc3-ghjq-m6fr](https://github.com/SamVerschueren/decode-uri-component/security/advisories/GHSA-vcc3-ghjq-m6fr) | Runtime: `expo-router → query-string → decode-uri-component`; Router có gọi query-string trong xử lý đường dẫn |
| `node-forge@1.4.0` | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | Công cụ Expo CLI/chứng chỉ; chưa chứng minh khai thác trong bản app |
| `braces@3.0.3` | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | Công cụ theo dõi file/glob/CSS; cần dữ liệu pattern không tin cậy để khai thác |
| `postcss-selector-parser@6.1.4` | [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | Build CSS; chưa thấy CSS người dùng đi vào pipeline |
| `uuid@7.0.3` | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | Dependency của công cụ Xcode; chưa chứng minh đường gọi nguy hiểm trong app |

Advisory từ maintainer mô tả `decode-uri-component <=0.4.2` có thể làm cạn CPU khi giải mã input malformed và nêu bản vá `0.5.0`. Đã xác nhận dependency nằm trên đường xử lý URL của Router; chưa chạy payload làm treo app trên thiết bị/trình duyệt, nên chưa khẳng định mức độ khai thác end-to-end.

Khắc phục: cập nhật theo phiên bản tương thích Expo SDK, ưu tiên dependency xử lý URL; cân nhắc override sau khi kiểm tra API tương thích và kiểm thử deep link/query string. Không chạy `npm audit fix --force` một cách tự động: kết quả hiện tại có đề xuất hạ Expo xuống 44 và đổi major NativeWind/Tailwind, có thể phá dự án. Tách yêu cầu cập nhật công cụ build khỏi bằng chứng lỗ hổng runtime.

## Những lớp bảo vệ đã kiểm tra hoạt động

- Bearer token của `wish-action` và `delete-account` được xác thực qua `auth.getUser`; user ID đưa vào RPC lấy từ kết quả xác thực, không lấy từ body.
- `verify_jwt=false` không tự tạo đường gọi vô danh: hai endpoint ứng dụng có xác thực riêng; worker yêu cầu `GIFT_WORKER_SECRET`.
- RPC ghi `apply_wish_command` chỉ được cấp cho `service_role`; client không có quyền ghi trực tiếp bảng dữ liệu ứng dụng.
- RLS và RPC đọc giới hạn theo cặp đôi; chuẩn bị được lọc theo người thực hiện; thông báo theo người nhận.
- Tạo điều ước gán tác giả từ membership; xoá kiểm tra tác giả ở SQL; chuẩn bị/hoàn thành chỉ dùng điều ước của người kia.
- Khoá ngoại chứa `couple_id`, các lệnh giới hạn theo membership; kiểm thử truy cập chéo cặp đôi bị chặn.
- Bucket ảnh riêng tư, signed URL có hạn, upload kiểm tra thư mục user/couple, MIME và kích thước mỗi file.
- Hoàn thành kỷ niệm và tạo notification/outbox trong một transaction; các lỗi kiểm tra làm rollback.
- Xoá tài khoản dùng user ID đã xác thực, liệt kê file từ database và dọn file trước khi xoá Auth. Việc xoá cả không gian chung là hành vi đã được UI thông báo, không ghi nhận riêng như một lỗi vượt quyền.
- Web push có allowlist endpoint chống SSRF, kiểm tra lại người nhận ở worker, thông báo chung không chứa tiêu đề riêng tư; service worker giới hạn đường dẫn mở cùng origin.
- Không thấy sink `dangerouslySetInnerHTML`, `eval()` hoặc `new Function()` trong phần mã ứng dụng đã tìm kiếm. Không coi CORS `*` kèm bearer auth là bằng chứng tự thân của lỗ hổng vượt quyền.

## Đề xuất tăng cường bảo vệ và phần còn cần xác minh

Các mục dưới đây chưa được xếp là khai thác đã tái hiện:

- **Lưu phiên trên mobile:** `cloud.ts:11` dùng AsyncStorage cho cả web/native. AsyncStorage không cung cấp lớp mã hoá dữ liệu lưu trữ; cân nhắc secure storage trên native theo mô hình rủi ro thiết bị/backup. Đây không phải bằng chứng kẻ tấn công từ xa đọc được token. Xác minh trên build thật thay vì thay storage theo cảm tính.
- **Ảnh/URL bên ngoài:** validator chấp nhận mọi URI bắt đầu `https://`; thành viên có thể đưa URL theo dõi vào ảnh để thiết bị người kia tải. Nếu sản phẩm chỉ cần ảnh riêng tư, giới hạn ảnh về Storage của dự án hoặc proxy ảnh an toàn. Đây là request từ client, chưa phát hiện SSRF server từ đường ảnh.
- **Cache ảnh:** `PhotoView` dùng `memory-disk`, chưa thấy xoá cache khi logout/xoá tài khoản. Cần xác định yêu cầu giữ ảnh offline và bảo vệ thiết bị dùng chung; hạn signed URL không tự xoá bản ảnh đã cache.
- **Web headers:** `vercel.json` chưa khai báo CSP/frame-ancestors, Referrer-Policy hoặc X-Content-Type-Options. Chưa kiểm tra response production, vì hạ tầng có thể đã bổ sung. Xây CSP phù hợp Expo, thử trước khi bật enforce.
- **Thao tác xoá tài khoản:** xem xét yêu cầu xác thực lại gần thời điểm xoá để giảm hậu quả khi phiên bị chiếm. Hiện chỉ bearer token hợp lệ và chuỗi xác nhận tĩnh; chưa thấy kiểm tra thời điểm đăng nhập gần nhất.
- **Auth production:** cần kiểm tra email confirmation, chống lạm dụng signup/login, password policy/leaked-password protection, thời hạn session và redirect allowlist trên Supabase Dashboard. `config.toml` hiện không mô tả các giá trị này, nên chưa thể kết luận bật/tắt.
- **Giới hạn body:** `wish-action` gọi `request.text()` rồi mới kiểm tra độ dài; nên đọc stream có giới hạn byte để không giữ toàn bộ body lớn trong bộ nhớ. Mức phơi lộ thực tế phụ thuộc giới hạn request của gateway chưa kiểm tra.
- **Quyền SQL thực tế:** chạy catalog checks/read-only advisors trên môi trường triển khai, gồm quyền tạo object trong schema `public`, function grants/default privileges và RLS Storage. PGlite chỉ mô phỏng các grants được setup trong bộ kiểm tra.
- **Bằng chứng vận hành:** cần kiểm tra worker secret, VAPID/Expo credentials, log retention, backup/khôi phục, cấu hình signing/update và tính nhất quán của migration/function đang triển khai. Không có dữ liệu xác nhận trong lượt audit này.

## Thứ tự xử lý đề xuất

1. Bảo vệ đường ghép đôi trước khi mở rộng người dùng: rate limit thực thi được, TTL và xác nhận tham gia.
2. Sửa đăng xuất cùng race đăng ký push native; kiểm chứng khi offline, mạng chậm và chuyển tài khoản trên cùng thiết bị.
3. Xử lý dependency giải mã URL bằng bản vá tương thích Expo; cập nhật công cụ build theo một thay đổi riêng có kiểm tra build.
4. Thêm quota upload/lệnh ghi, dọn ảnh mồ côi, phân trang và theo dõi chi phí.
5. Kiểm tra cấu hình production và bổ sung các lớp bảo vệ theo chính sách bảo mật của sản phẩm.

## Tài liệu đối chiếu

- [Supabase: RLS và kết hợp grants/policies](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Supabase: bảo vệ API và kiểm soát request](https://supabase.com/docs/guides/api/securing-your-api).
- [Supabase: hành vi signOut](https://supabase.com/docs/reference/javascript/auth-signout).
- [React Native: AsyncStorage và lưu trữ nhạy cảm](https://reactnative.dev/docs/security#async-storage).
- [Advisory của maintainer decode-uri-component](https://github.com/SamVerschueren/decode-uri-component/security/advisories/GHSA-vcc3-ghjq-m6fr).

Báo cáo này chỉ ghi nhận kết quả audit và hướng khắc phục; chưa áp dụng bản sửa logic ứng dụng hoặc thay đổi cấu hình production.
