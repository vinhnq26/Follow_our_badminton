# Nhóm cầu lông Vé Xe Rẻ nè

Landing page React/Vite giúp nhóm theo dõi lịch đánh, thu chi và điểm danh từng buổi cầu.

## Thông tin nhóm

- **Lịch đánh:** linh hoạt, có thể sắp vào nhiều ngày khác nhau
- **Tên sân:** Sân cầu lông PIXIHUB
- **Địa chỉ:** 10 Bế Văn Cấm, Tân Hưng, Hồ Chí Minh
- **Tài khoản admin demo:** `admin` / `admin123`

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`.

## Tính năng chính

- Trang thành viên: trận sắp tới, ngày giờ, địa điểm/số sân, địa chỉ và breakdown tiền sân/nước/cầu/khác.
- Lịch sử trận với bộ lọc tháng, sân và modal xem chi tiết.
- Admin có thể thêm, sửa, xóa trận; ngày giờ buổi cầu có thể chọn linh hoạt.
- Admin nhập các khoản thu/chi, điểm danh thành viên trong từng buổi và xem tổng kết tháng.
- Trang `/admin/members` cho phép thêm, xóa khỏi danh sách hoạt động và khôi phục thành viên.
- Dữ liệu prototype lưu trong `localStorage` của trình duyệt; chưa phù hợp làm authentication production.
- Trong `/admin/reports`, admin có thể chọn từng tháng và xuất hóa đơn dạng `.txt` hoặc tải snapshot dữ liệu dạng `.json`.
- File xuất được tải xuống từ trình duyệt; trình duyệt không thể tự ghi trực tiếp file vào thư mục `src`. Không tạo thêm key `localStorage` cho thao tác xuất báo cáo.

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

Phiên bản mới dùng key `foflo-matches-v2`. Trong lần mở đầu tiên, dữ liệu cũ ở `foflo-matches-v1` và các trận mẫu trước đây sẽ được xóa một lần; lịch sử bắt đầu trống để admin nhập từ thời điểm sử dụng thật. Sau đó dữ liệu trận, thành viên và điểm danh được lưu lại trong trình duyệt hiện tại.
