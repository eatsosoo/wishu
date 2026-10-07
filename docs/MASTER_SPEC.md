Xây dựng một ứng dụng dành cho các cặp đôi, tạm gọi là "Our Wish".

MỤC TIÊU SẢN PHẨM
==================

Our Wish là một ứng dụng private dành cho 2 người trong một mối quan hệ.

Ý tưởng chính:

Mỗi người có một "Wish Jar" riêng, nơi lưu những điều mình mong muốn:
- Quà tặng
- Chuyến đi
- Buổi hẹn hò
- Trải nghiệm
- Đồ ăn
- Hoạt động muốn làm cùng nhau
- Những mong muốn nhỏ trong cuộc sống

Người còn lại có thể xem Wish Jar của partner và bí mật chọn một wish để biến nó thành hiện thực.

Flow chính:

Create account
    ↓
Create / Join Couple
    ↓
Couple Space
    ↓
My Wish Jar ←→ Partner Wish Jar
    ↓
Partner chọn một Wish
    ↓
Preparing Surprise
    ↓
Complete Wish
    ↓
Add photos / note
    ↓
Couple Memory

Quan trọng:
Khi partner chọn "Prepare this wish", người tạo wish KHÔNG được biết wish đang được chuẩn bị để giữ yếu tố bất ngờ.


TECH STACK
==========

Sử dụng:

- Expo
- React Native
- React Native Web
- TypeScript
- Expo Router
- NativeWind
- React Native Reanimated
- Lucide React Native

Backend:

- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime

Deployment:

Phase 1:
Expo Web → Vercel

Phase 2:
Expo → iOS
Expo → Android

Mục tiêu là sử dụng chung một codebase cho:

Web
iOS
Android

Không xây website desktop riêng rồi sau đó rewrite mobile.

Thiết kế mobile-first ngay từ đầu.


DESIGN DIRECTION
================

Visual direction:

"Soft Editorial UI + Clay 3D Objects + Warm Pastel"

App phải mang cảm giác:

- cute
- romantic
- warm
- intimate
- feminine-friendly
- premium
- gần gũi
- không trẻ con
- không quá nhiều màu hồng
- không giống các dating/couple app đại trà

Không sử dụng Claymorphism cho toàn bộ UI.

UI layer:
- clean
- minimal
- flat
- nhiều whitespace
- border radius lớn
- shadow rất nhẹ

Emotional layer:
Sử dụng Clay 3D illustration.

3D chỉ tập trung vào các object quan trọng:

- Wish Jar
- Gift box
- Heart
- Camera
- Cake
- Love letter
- Couple characters
- Stars
- Memory objects

Không biến button/input/card thành các object 3D.


COLOR SYSTEM
============

Sử dụng warm pastel palette.

Gợi ý:

Background:
#FFF9F5

Surface:
#FFFDFB

Primary:
#A84F68

Soft Pink:
#F4D9DF

Lavender:
#DDD8EF

Text:
#3B3034

Secondary Text:
#8B7E82

Có thể tinh chỉnh palette nếu cần để UI hài hòa hơn.

Pink chỉ là accent color.

Không sử dụng toàn bộ background màu hồng.

Có thể sử dụng:

User A → Dusty Rose
User B → Soft Lavender

Together / Couple → Cream + Burgundy


TYPOGRAPHY
==========

Kết hợp:

Editorial Serif
+
Modern Sans-serif

Heading:
Serif font có cảm giác romantic/editorial.

Body/UI:
Sans-serif sạch, dễ đọc.

Ví dụ:

"Kỷ niệm"
"Hũ điều ước của Linh ♡"
"Của chúng ta"

→ Serif

Button, form, metadata, navigation

→ Sans-serif

Typography phải tạo cảm giác trưởng thành, không giống ứng dụng dành cho trẻ em.


SHAPE SYSTEM
============

Card:
20–28px radius

Main Card:
24px

Input:
16–18px

Button:
pill / 999px hoặc 18–24px tùy context

Modal / Bottom Sheet:
28px+

Shadow:
soft
diffuse
low opacity

Không sử dụng border đậm.


HOME SCREEN
===========

Home là màn hình quan trọng nhất.

Hiển thị:

Greeting

"Chào buổi sáng,
Linh ♡"

Couple visual:

3D avatar/character của hai người
+
heart nhỏ ở giữa.

Hiển thị:

"Chúng ta đã bên nhau"

486 ngày

Phần quan trọng nhất:

2 Wish Jar 3D.

Ví dụ:

[ 3D Jar ]
Hũ của mình
12 điều ước

[ 3D Jar ]
Hũ của người ấy
18 điều ước

Wish Jar phải trở thành visual identity chính của ứng dụng.

Jar có thể bán trong suốt.

Bên trong chứa:

heart
star
small paper
pastel objects

Số lượng object trong jar có thể thay đổi dựa trên số wish.

Có thể thêm subtle animation:
- floating
- breathing
- small particles

Không animation quá mạnh.


NAVIGATION
==========

Bottom Navigation:

Home
Wishes
+
Memories
Us

Nút + ở giữa dùng để thêm Wish.

Navigation phải mobile-first.


WISH LIST
=========

Màn hình:

"Hũ điều ước của Linh ♡"

Có filter:

Tất cả
Quà tặng
Du lịch
Ăn uống
Trải nghiệm

Wish Card:

thumbnail
title
category
short description
estimated price
favorite

Ví dụ:

🧸

Gấu bông Jellycat
[Quà tặng]

"Mình thích con này lắm 🥺"

~1.200.000đ


ADD WISH
========

Form tạo wish:

Image

Tên điều ước

Mô tả

Category

Estimated budget

Priority

Reference URL

Optional target date

Priority có thể dùng:

♡ ♡ ♡ ♡ ♡

CTA:

"Thêm vào hũ ✨"


WISH DETAIL
===========

Hiển thị:

Large image

Wish name

Category

Estimated price

Description

Reference images

Reference URL

Nếu đang xem wish của partner:

CTA:

"Biến điều ước thành hiện thực 🎁"

Sau khi chọn CTA:

Wish chuyển vào private Preparing list.

Người tạo wish KHÔNG thấy trạng thái này.


SURPRISE SYSTEM
===============

Screen:

"Đang chuẩn bị"

Header sử dụng Clay 3D Gift Box.

Tabs:

Đang chuẩn bị
Đã hoàn thành

Card:

Wish image
Wish name
Category
Budget
Started date

CTA:

"Hoàn thành điều ước"


COMPLETE WISH
=============

Khi hoàn thành:

Hiển thị Clay 3D open gift box + heart.

Form:

Completion date

Photos

Optional message/note

Ví dụ:

"Anh tặng mình vào sinh nhật 26 tuổi.
Yêu lắm ♡"

CTA:

"Lưu vào kỷ niệm"


MEMORIES
========

Screen:

"Kỷ niệm"

Subtitle:

"Những điều ước đã trở thành hiện thực"

Grid layout.

Memory Card:

photo
title
date
heart

Filter:

Tất cả
Quà tặng
Du lịch
Trải nghiệm
Khoảnh khắc

Click memory → Memory Detail.


COUPLE PAGE
===========

Screen:

"Của chúng ta"

Hiển thị:

Clay 3D couple character.

Settings:

Thông tin cặp đôi
Ngày kỷ niệm
Giao diện
Cài đặt

Có thể hiển thị thêm:

Together for XXX days
Completed wishes
Memories count


AUTHENTICATION
==============

Sử dụng Supabase Auth.

Flow:

Register
Login
Create Couple
Invite Partner

Couple có invite code hoặc invite link.

Ví dụ:

OUR-7X92

Partner nhập code để join Couple Space.

Một couple mặc định chỉ có 2 members.


DATABASE
========

Thiết kế database tối thiểu gồm:

profiles

id
display_name
avatar_url
created_at


couples

id
name
anniversary_date
invite_code
created_at


couple_members

id
couple_id
user_id
joined_at


wishes

id
couple_id
created_by
title
description
category
estimated_cost
priority
reference_url
cover_image
target_date
created_at


wish_preparations

id
wish_id
prepared_by
status
started_at
completed_at


memories

id
wish_id
couple_id
completed_at
note
created_at


memory_images

id
memory_id
image_url
created_at


SECURITY
========

Sử dụng Supabase Row Level Security.

User chỉ được truy cập dữ liệu của couple mình tham gia.

Đặc biệt:

wish_preparations

chỉ người đang chuẩn bị surprise được đọc trạng thái preparation.

Người tạo wish không được biết partner đã chọn wish của mình.


STORAGE
=======

Supabase Storage dùng cho:

avatars
wish-images
memory-images

Optimize ảnh trước khi upload nếu có thể.


REALTIME
========

Sử dụng Supabase Realtime cho các event phù hợp.

Ví dụ:

Partner thêm wish mới.

Wish Jar của người còn lại cập nhật.

Không realtime các thông tin secret preparation cho người tạo wish.


ANIMATION
=========

Sử dụng React Native Reanimated.

Animation phải subtle.

Ví dụ:

Add Wish:

heart/star nhỏ rơi vào Wish Jar.

Complete Wish:

gift box mở
heart xuất hiện
confetti pastel nhẹ.

Favorite:

heart scale animation.

Page transition:
soft fade / slide.

Không sử dụng animation quá nhiều.


HAPTIC
======

Trên mobile có thể sử dụng Expo Haptics.

Ví dụ:

Add Wish
Favorite
Complete Wish
Open Gift

Web phải gracefully ignore haptic.


RESPONSIVE
==========

Mobile-first.

Target chính:

375–430px width.

Web trên mobile phải giống native app.

Tablet:
responsive layout.

Desktop:
không stretch UI quá rộng.

Có thể sử dụng centered app container hoặc adaptive layout.

Ví dụ:

Desktop

----------------------------------

        [ Couple App ]

        max-width ~ 480px
        hoặc adaptive 2-column
        ở những screen phù hợp

----------------------------------

Không biến desktop thành một website hoàn toàn khác.


CODE QUALITY
============

Yêu cầu:

- TypeScript strict
- reusable components
- clean architecture
- không hard-code business logic trong UI
- shared design tokens
- shared spacing
- shared typography
- shared colors
- shared radius
- reusable form components
- reusable card components

Tách:

components/
features/
hooks/
services/
types/
constants/


DESIGN COMPONENTS
=================

Tạo reusable components như:

AppScreen
AppHeader
BottomNavigation

WishJar
WishCard
MemoryCard

ClayObject
CoupleAvatar

PrimaryButton
SecondaryButton

AppInput
AppTextarea

CategoryChip
PrioritySelector

EmptyState
LoadingState

BottomSheet
ConfirmDialog


MVP
===

Ưu tiên hoàn thiện:

1. Authentication
2. Create / Join Couple
3. Home
4. Two Wish Jars
5. Add Wish
6. View Partner Wishes
7. Prepare Surprise
8. Complete Wish
9. Upload Memory Photos
10. Memories
11. Couple Profile

Không thêm quá nhiều chức năng ngoài scope MVP.


IMPORTANT DESIGN RULE
=====================

Không copy trực tiếp UI của Wishlove hoặc bất kỳ app tham khảo nào.

Các app tham khảo chỉ dùng để hiểu product flow.

Visual identity của sản phẩm phải dựa trên:

Soft Editorial UI
+
Clay 3D Objects
+
Warm Pastel
+
Wish Jar concept

Wish Jar phải trở thành signature visual của ứng dụng.

Mục tiêu cuối cùng:

Khi nhìn screenshot, người dùng có thể nhận ra đây là Our Wish ngay cả khi chưa nhìn logo.


DEVELOPMENT ORDER
=================

Triển khai theo thứ tự:

Phase 1
Setup Expo + TypeScript + Expo Router.

Phase 2
Setup NativeWind và Design System.

Phase 3
Tạo static UI cho:
Home
Wish List
Wish Detail
Add Wish
Preparing
Complete Wish
Memories
Couple Profile.

Phase 4
Setup Supabase.

Phase 5
Authentication + Couple pairing.

Phase 6
Wish CRUD.

Phase 7
Surprise logic + RLS.

Phase 8
Memories + Storage.

Phase 9
Realtime.

Phase 10
Animation + polish.

Phase 11
Responsive Web testing.

Phase 12
Deploy Expo Web lên Vercel.

Sau khi Web MVP ổn định mới bắt đầu:

iOS build
Android build
Push Notification
Haptic/native enhancements
App Store / Google Play release.