# Nhóm cầu lông Vé Xe Rẻ nè

Landing page React/Vite giúp nhóm theo dõi lịch đánh, thu chi và điểm danh từng buổi cầu.

## Thông tin nhóm

- **Lịch đánh:** linh hoạt, có thể sắp vào nhiều ngày khác nhau
- **Tên sân:** Sân cầu lông PIXIHUB
- **Địa chỉ:** 10 Bế Văn Cấm, Tân Hưng, Hồ Chí Minh
- **Admin:** đăng nhập bằng tài khoản email được tạo trong Supabase Auth

## Cấu hình Supabase

1. Tạo project trên Supabase.
2. Mở SQL Editor và chạy toàn bộ file `supabase/schema.sql`.
3. Nếu cần nạp các buổi cầu đã cung cấp, chạy tiếp file `supabase/import-matches-2026-09.sql`.
4. Tạo tài khoản admin trong Supabase Auth, sau đó thêm UUID tài khoản vào bảng `admin_users`.
5. Tạo file `.env.local` từ `.env.example` và điền URL cùng anon key của project:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Không đưa service-role key vào frontend hoặc commit file `.env.local`.

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`. Dữ liệu lịch, thu chi, điểm danh và thành viên được đọc/ghi qua Supabase nên các thiết bị khác có thể xem cùng một dữ liệu.

## Tính năng chính

- Trang thành viên: trận sắp tới, ngày giờ, địa điểm/số sân, địa chỉ và breakdown tiền sân/nước/cầu/khác.
- Lịch sử trận với bộ lọc tháng, sân và modal xem chi tiết.
- Admin có thể thêm, sửa, xóa trận; ngày giờ buổi cầu có thể chọn linh hoạt.
- Admin nhập các khoản thu/chi, điểm danh thành viên trong từng buổi và xem tổng kết tháng.
- Trang `/admin/members` cho phép thêm, xóa khỏi danh sách hoạt động và khôi phục thành viên.
- Dữ liệu runtime được lưu tập trung trên Supabase, không phụ thuộc localStorage của một thiết bị.
- Trong `/admin/reports`, admin có thể chọn từng tháng và xuất hóa đơn dạng `.txt` hoặc tải snapshot tháng dạng `.json`.
- Nút **Sao lưu toàn bộ JSON** tải danh sách thành viên, toàn bộ trận đấu, thu chi, điểm danh và metadata gốc để lưu trữ.
- File xuất được tải xuống từ trình duyệt để lưu trữ/chia sẻ; dữ liệu chính vẫn nằm trên Supabase.

## Danh sách thành viên ban đầu

1. Nguyễn Hoài Nhân
2. Nguyễn Thị Ý
3. Phạm Ngọc Bích Trâm
4. Trần Thị Thân Thương
5. Bạch Thị Mỹ Hạnh
6. Hồ Bảo Vy
7. Trần Thái Xông
8. Danh Minh Hoà
9. Lê Thị Gia Hân
10. Phan Nguyễn Anh Vinh
11. Nguyễn Quốc Vinh

## Lưu ý dữ liệu

Supabase là nguồn dữ liệu chính dùng chung cho mọi thiết bị. File JSON tải từ mục báo cáo là bản snapshot để lưu trữ/chia sẻ, không tự động ghi ngược vào thư mục `src` và cũng không thay thế cơ chế backup của Supabase.

Nếu trình duyệt trước đây đã có dữ liệu localStorage, hãy tải/ghi lại dữ liệu cần giữ trước khi chuyển sang Supabase. Chưa có cơ chế tự động nhập dữ liệu cũ, vì vậy không nên xóa dữ liệu trình duyệt cũ cho đến khi đã kiểm tra dữ liệu trên project Supabase.

Để sao lưu dài hạn, dùng chức năng backup/export của Supabase hoặc tải các báo cáo JSON định kỳ. Khi triển khai production, cần cấu hình hai biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trên hosting; chỉ dùng anon key ở frontend và luôn giữ Row Level Security bật.
