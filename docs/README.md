# Web App Phòng Thuốc Đông Y — Hồ sơ dự án

Tài liệu dự án (tổng hợp từ tư vấn Google AI Mode + ChatGPT review, ngày 2026-10-06).

## Tài liệu

| File | Nội dung |
|------|----------|
| [00-NGUYEN-TAC-LAM-VIEC.md](./00-NGUYEN-TAC-LAM-VIEC.md) | Nguyên tắc làm việc đã chốt với Tony: tài liệu là ngữ cảnh, review ChatGPT chỉ lấy điểm thật sự cần, ưu tiên MVP-0 gọn → dữ liệu thật → kê đơn thử |
| [00-DE-XUAT-KHOI-DONG-MVP-0.md](./00-DE-XUAT-KHOI-DONG-MVP-0.md) | **(Bản nháp chờ duyệt)** Đề xuất khởi động MVP-0: phạm vi gọn nhẹ, những gì cố tình bỏ qua, 4 câu hỏi cần Tony quyết |
| [01-TAI-LIEU-YEU-CAU.md](./01-TAI-LIEU-YEU-CAU.md) | Yêu cầu chức năng 3 phân hệ + MVP-0, định nghĩa nghiệp vụ, lộ trình MVP-0→3, Definition of Ready (v1.1) |
| [02-TAI-LIEU-HE-THONG.md](./02-TAI-LIEU-HE-THONG.md) | Kiến trúc layered, schema database đầy đủ, FEFO + stock-take delta, RLS matrix, ADR (v1.1) |
| [03-QUI-CHUAN-CODE.md](./03-QUI-CHUAN-CODE.md) | 3 lớp quy tắc, business invariant, testing 4 tầng, CI/CD, Definition of Done (v1.1) |

## Tóm tắt

**3 phân hệ:** (3) Danh mục vị thuốc → (1) Quản lý kho thuốc → (2) Kê đơn bốc thuốc
**Thứ tự MVP:** MVP-0 (nền tảng) → Vị thuốc → Kho (2a/2b) → Kê đơn tối giản (2.5) → Đầy đủ (3)
**Stack:** Next.js (App Router) + Tailwind CSS + Shadcn/ui + PostgreSQL (Supabase)
**Điểm kỹ thuật cốt lõi:** trừ kho **FEFO** bằng stored procedure PL/pgSQL (chống race condition), kiểm kho dùng **delta** (không gán đè), check tương kỵ real-time, RLS matrix 3 vai trò, audit log append-only, idempotency key.
