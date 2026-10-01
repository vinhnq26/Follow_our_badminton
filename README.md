# Foflơ badminton group

Landing page React/Vite giúp nhóm theo dõi lịch đánh và thu chi từng buổi cầu.

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`.

## Tính năng chính

- Trang thành viên: trận sắp tới, địa điểm/số sân, breakdown tiền sân/nước/cầu/khác.
- Lịch sử trận với bộ lọc tháng, sân và modal xem chi tiết.
- Khu vực quản trị: `/admin/login`.
- Tài khoản demo: `admin` / `admin123`.
- Admin có thể thêm, sửa, xóa trận, nhập khoản thu/chi và xem tổng kết tháng.
- Dữ liệu prototype lưu trong `localStorage` của trình duyệt; chưa phù hợp làm authentication production.
