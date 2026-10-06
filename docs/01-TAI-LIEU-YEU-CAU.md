# TÀI LIỆU YÊU CẦU — Web App Phòng Thuốc Đông Y

> Phiên bản: 1.1 — Ngày: 2026-10-06
> Cập nhật sau review của ChatGPT (vai trò BA/PO).

---

## 1. Tổng quan dự án

### 1.1. Mục tiêu
Xây dựng web app số hóa toàn bộ vận hành của phòng thuốc Đông y: từ quản lý kho dược liệu, kê đơn bốc thuốc theo chẩn đoán Đông y, đến tra cứu danh mục vị thuốc.

### 1.2. Phạm vi (Scope)
App gồm **đúng 3 phân hệ**:

| # | Phân hệ | Mô tả ngắn |
|---|---------|-----------|
| 1 | Quản lý kho thuốc | Nhập kho, quản lý tồn theo lô, check hư hỏng/hết hạn |
| 2 | Kê đơn bốc thuốc | Chẩn đoán (triệu chứng + bộ mạch) → đơn thuốc → bốc thuốc → trừ kho FEFO |
| 3 | Danh mục vị thuốc | Đặc điểm nhận dạng, dược lực, tương kỵ, chỉ định điều trị |

### 1.3. Ngoài phạm vi (Out of scope — MVP)
- Telemedicine (khám online), AI tự động kê đơn, marketplace, ERP đầy đủ, loyalty phức tạp, thanh toán online đa cổng.
- **Lưu ý:** thanh toán tại quầy (tiền mặt/chuyển khoản, in biên lai) NẰM TRONG phạm vi MVP (US-2.4) — chỉ thanh toán online đa cổng mới nằm ngoài.

### 1.4. Đối tượng sử dụng

| Vai trò | Mã role | Mô tả | Thiết bị chính |
|---------|---------|-------|----------------|
| Chủ phòng thuốc | `admin` | Quản lý toàn hệ thống, duyệt phiếu, xem báo cáo | Desktop |
| Thầy thuốc | `practitioner` | Khám, bắt mạch, kê đơn | Desktop |
| Nhân viên bốc thuốc | `dispenser` | Bốc thuốc theo đơn, kiểm kho, nhập kho | Desktop |
| (Tương lai) Bệnh nhân | `patient` | Xem đơn, nhắc uống thuốc | Mobile |

> RBAC: **3 vai trò** trong MVP (admin, practitioner, dispenser). Role `patient` để dành cho giai đoạn patient portal sau MVP.

---

## 2. Định nghĩa nghiệp vụ chung (Business Glossary)

Các định nghĩa này phải được chốt trước khi code (Definition of Ready):

| Thuật ngữ | Định nghĩa |
|-----------|-----------|
| Đơn vị tính chuẩn | Mọi khối lượng trong DB quy về **gram (g)**. UI có thể hiển thị kg nhưng DB luôn lưu gram. Bảng `units` quản lý đơn vị + tỷ lệ quy đổi. |
| Công thức giá bán | Giá bán = giá nhập × (1 + margin). Margin mặc định do admin cấu hình theo nhóm vị thuốc; cho phép giá bán thủ công từng vị. Giá snapshot tại thời điểm kê đơn (không tính lại đơn cũ bằng giá mới). |
| Thuốc quý | Vị thuốc có `is_valuable = true` (do admin đánh dấu) HOẶC giá trị lô > ngưỡng cấu hình. Quy trình riêng: kiểm kho luôn cần duyệt + ảnh minh chứng. |
| Hao hụt tự nhiên | Hao hụt do bay hơi tinh dầu, khô héo mất nước trong bảo quản (không phải rơi vãi/hư hỏng/mất cắp). Tỷ lệ cho phép cấu hình theo từng vị thuốc. |
| FEFO | **First Expired First Out** — lô hết hạn trước xuất trước (thay cho FIFO, vì dược liệu có hạn dùng). Sắp xếp: `expiry_date ASC, import_date ASC, id ASC`. |
| Lifecycle đơn thuốc | `draft` → `confirmed` → `dispensing` → `completed`. Nhánh `cancelled` từ confirmed/dispensing (cần quyền admin, ghi lý do, hoàn kho nếu đã trừ). |

---

## 3. Yêu cầu chức năng chi tiết

### MVP-0 — NỀN TẢNG (làm đầu tiên, trước mọi phân hệ)

#### US-AUTH.1 Đăng nhập / đăng xuất
- Đăng nhập bằng email + mật khẩu; đăng xuất; đổi mật khẩu; quên mật khẩu (reset qua email).
- Session timeout sau 8 giờ không hoạt động.

#### US-AUTH.2 Quản lý người dùng (admin)
- Admin tạo/sửa/khóa/mở tài khoản nhân viên, gán vai trò, reset mật khẩu, xem lịch sử đăng nhập.

#### US-0.1 Quản lý nhà cung cấp (NCC)
- CRUD NCC: tên, SĐT, địa chỉ, mã số thuế; xem lịch sử nhập hàng theo NCC.

#### US-0.2 Quản lý bệnh nhân
- CRUD hồ sơ bệnh nhân: mã BN, họ tên, ngày sinh, giới tính, SĐT, địa chỉ, tiền sử bệnh, dị ứng.
- Tìm kiếm bệnh nhân; xem lịch sử khám + đơn thuốc theo bệnh nhân; phân biệt BN mới / tái khám.

#### US-0.3 Đơn vị tính
- Danh mục đơn vị tính + tỷ lệ quy đổi về gram.

---

### PHÂN HỆ 3 — DANH MỤC VỊ THUỐC (MVP-1)

#### US-3.1 Quản lý vị thuốc (CRUD)
- Mỗi vị thuốc lưu: tên thường gọi, tên Hán Việt, tên khoa học, bộ phận dùng, tính/vị/quy kinh, dược lực (công năng chủ trị), đặc điểm nhận dạng (hình dáng, màu sắc, mùi vị), ảnh minh họa, đơn vị chuẩn (gram), cờ `is_valuable`.
- Admin thêm/sửa/xóa mềm vị thuốc.

#### US-3.2 Quản lý tương kỵ
- Link các cặp vị thuốc kỵ nhau (dựa trên Thập bát phản, Thập cửu úy...), ghi rõ: mức độ (critical/warning/info), lý do, nguồn tham khảo, người kiểm duyệt, ngày hiệu lực.
- Khi kê đơn có cặp kỵ nhau → hệ thống cảnh báo real-time.

#### US-3.3 Quản lý liều lượng an toàn
- Cấu hình liều tối đa/thang cho từng vị thuốc (kèm đơn vị, phạm vi áp dụng, nguồn) → cảnh báo khi vượt ngưỡng.

#### US-3.4 Tìm kiếm nhanh
- Tìm theo tên (thường gọi / Hán Việt / tên khác), theo triệu chứng, theo bệnh.
- Ví dụ: gõ "ho" → trả về các vị thuốc trị ho.
- Yêu cầu tốc độ: < 300ms, gõ phím → hiện gợi ý ngay (debounce, keyboard-first).

#### US-3.5 Quản lý giá
- Lưu lịch sử giá nhập/giá bán theo thời điểm (loại giá, đơn vị, ngày hiệu lực); giá mới nhất có hiệu lực.

#### US-3.6 Quản lý bộ mạch (mạch tượng)
- Danh mục 28 mạch tượng: tên Việt, tên Hán Việt, mô tả cảm giác mạch, ý nghĩa lâm sàng, chủ bệnh.
- Seed dữ liệu ban đầu đầy đủ 28 mạch (nguồn: sách chuẩn do chủ phòng thuốc cung cấp, có kiểm duyệt).

> **US-3.7 (ma trận gợi ý lâm sàng) DỜI sang MVP-3** — tính năng gần với "AI gợi ý chẩn đoán", rủi ro y tế cao, không phải danh mục thuần túy. Khi làm cần disclaimer pháp lý rõ ràng: "chỉ tham khảo, thầy thuốc chịu trách nhiệm cuối cùng".

---

### PHÂN HỆ 1 — QUẢN LÝ KHO THUỐC (MVP-2, tách 2a/2b)

#### MVP-2a — Nhập kho & tồn kho cơ bản

**US-1.1 Phiếu nhập kho**
- Tạo phiếu nhập: chọn NCC (từ US-0.1), ngày nhập, thêm từng dòng (vị thuốc, số lượng, đơn giá, hạn dùng).
- Phiếu có trạng thái `draft` → `confirmed` → (`cancelled`). Chỉ phiếu confirmed mới tạo lô + ghi lịch sử kho.
- Hệ thống tự sinh mã lô (batch_code, format: `LÔ-YYYYMMDD-XXX`, đảm bảo unique) → in mã vạch (chuẩn Code128) dán lên bao bì.

**US-1.2 Quản lý lô thuốc**
- Mỗi lô: mã lô, vị thuốc, số lượng tồn (gram), hạn dùng, trạng thái (active/expired/damaged/disposed), ghi chú chất lượng, giá vốn (unit_cost snapshot lúc nhập).
- Cảnh báo: lô sắp hết hạn (≤ 30 ngày), lô đã hết hạn (tự động đánh dấu theo expiry_date, không chờ cập nhật tay).

**US-1.5 Xem tồn kho & báo cáo cơ bản**
- Tra cứu tồn theo vị thuốc (tổng) và chi tiết theo lô.

#### MVP-2b — Kiểm soát kho nâng cao

**US-1.3 Check hư hỏng & loại bỏ**
- Nhân viên kiểm tra thực tế → đánh dấu lô ẩm mốc/hư hỏng (ghi chú + ảnh).
- Hỏng một phần: ghi transaction DAMAGE theo số lượng hỏng, lô vẫn active với số còn lại. Hỏng toàn bộ → phiếu loại bỏ → disposed.

**US-1.4 Kiểm kho & cân bằng kho**
- Tạo phiếu kiểm kho: quét mã vạch lô (hoặc chọn thủ công) → nhập số cân thực tế → hệ thống tự tính chênh lệch.
- Quy tắc duyệt: chênh lệch < ngưỡng giá trị (cấu hình, % theo giá trị lô — không dùng số tuyệt đối cố định) VÀ < 2% lô VÀ lý do hao hụt tự nhiên → tự động duyệt; các trường hợp còn lại → bắt buộc chủ phòng thuốc duyệt. Thuốc quý (`is_valuable`) luôn cần duyệt + ảnh minh chứng.
- Duyệt xong: cập nhật tồn lô theo delta điều chỉnh (không gán đè mù quáng), ghi lịch sử giao dịch kho, log đầy đủ (ai kiểm, khi nào, số liệu trước/sau).

---

### PHÂN HỆ 2 — KÊ ĐƠN BỐC THUỐC (MVP-3)

**US-2.0 (đã có ở MVP-0: US-0.2)** — chọn bệnh nhân từ danh sách (tìm kiếm nhanh) trước khi tạo lượt khám.

#### US-2.1 Khám & ghi nhận chẩn đoán
- Tạo lượt khám cho bệnh nhân: nhập triệu chứng (vọng/văn/vấn chẩn), nhập bộ mạch (thốn/quan/xích × tay trái/phải, chọn từ danh mục 28 mạch; cho phép bỏ trống vị trí, ghi chú thêm).
- Thầy thuốc chốt chẩn đoán (hội chứng/bệnh danh).

#### US-2.2 Kê đơn thuốc ⚠️ RỦI RO RẤT CAO
- Từ bài thuốc mẫu hoặc kê mới: thêm/sửa/xóa vị thuốc, chỉnh liều lượng từng vị, số thang, cách sắc, ghi chú.
- Check khi kê (mỗi lần thêm/sửa vị hoặc đổi liều): tương kỵ theo cặp, quá liều an toàn, vị thuốc hết hàng.
  - `critical`: chặn lưu đơn → thầy thuốc phải tick "chịu trách nhiệm lâm sàng" + nhập lý do bắt buộc → lưu audit.
  - `warning`: hiện rõ nhưng cho qua.
- Đơn có lifecycle: draft → confirmed → dispensing → completed (+ cancelled). Đơn confirmed mới vào hàng đợi bốc thuốc.
- Chốt đơn → in đơn thuốc (khổ A5, gồm: tên phòng thuốc, thông tin BN, chi tiết vị + liều/thang, số thang, cách sắc, chữ ký thầy thuốc).
- **Khuyến nghị:** làm prototype luồng kê đơn trước, review với thầy thuốc thật trước khi code production.

#### US-2.3 Bốc thuốc & trừ kho FEFO ⚠️ RỦI RO CAO
- Đơn confirmed vào hàng đợi bốc thuốc (real-time).
- Nhân viên mở đơn → hệ thống **tự phân bổ FEFO** (lô nào, bao nhiêu gram) → nhân viên tick xác nhận từng vị đã bốc (đối chiếu lô thực tế).
- Hoàn thành → trừ kho trong 1 transaction (khóa dòng chống race condition khi 2 nhân viên bốc cùng lúc).
- Nếu thiếu hàng: báo rõ vị nào thiếu bao nhiêu → thầy thuốc quyết định (chờ nhập / thay vị / hủy bớt).

#### US-2.4 Thanh toán tại quầy (MVP-3)
- Tính tiền đơn theo giá snapshot lúc kê đơn; thu tiền mặt/chuyển khoản; in biên lai; ghi nhận công nợ (nếu có).
- Báo cáo doanh thu theo ngày/tháng.

#### US-2.5 Hủy đơn thuốc
- Admin được hủy đơn ở trạng thái confirmed/dispensing (ghi lý do); nếu đã trừ kho → hoàn kho tương ứng.

---

## 4. Yêu cầu phi chức năng

| # | Yêu cầu | Chi tiết |
|---|---------|----------|
| NFR-1 | Hiệu năng | Tìm kiếm vị thuốc p95 < 300ms; check tương kỵ real-time (debounce 300ms) |
| NFR-2 | Bảo mật | RBAC 3 vai trò (admin, practitioner, dispenser); audit log append-only cho mọi thao tác sửa đơn/kho; RLS ở tầng database; ma trận phân quyền chi tiết theo chức năng |
| NFR-3 | Toàn vẹn dữ liệu | Trừ kho trong transaction; khóa dòng chống race condition; idempotency key chống double-submit |
| NFR-4 | Khả dụng | Backup/restore định kỳ (Supabase tự động); RPO ≤ 24h |
| NFR-5 | UX | Desktop-first cho nhân viên (keyboard-first, quét mã vạch); thao tác nhanh, ít click |
| NFR-6 | Y tế & pháp lý | Hệ thống CHỈ gợi ý tham khảo, KHÔNG tự động chẩn đoán/kê đơn. Disclaimer rõ ràng trên UI. Đơn thuốc cần chữ ký thầy thuốc (tay hoặc số). |
| NFR-7 | In ấn | Khổ giấy: A5 (đơn thuốc, biên lai), nhãn mã vạch Code128; có preview trước khi in |

---

## 5. Lộ trình MVP (điều chỉnh sau review)

| Giai đoạn | Nội dung |
|-----------|----------|
| **MVP-0** | Auth + quản lý người dùng + NCC + bệnh nhân + đơn vị tính |
| **MVP-1** | Phân hệ 3 (rút gọn): CRUD vị thuốc, tương kỵ, liều an toàn, tìm kiếm, giá, bộ mạch (US-3.1 → 3.6) |
| **MVP-2a** | Phân hệ 1 (cơ bản): nhập kho, quản lý lô, tra cứu tồn (US-1.1, 1.2, 1.5) |
| **MVP-2b** | Phân hệ 1 (nâng cao): check hư hỏng, kiểm kho (US-1.3, 1.4) |
| **MVP-2.5** | Kê đơn tối giản: khám + kê tay + in đơn (chưa có gợi ý, chưa trừ kho tự động) → **có thể dùng thật, demo giá trị sớm** |
| **MVP-3** | Phân hệ 2 đầy đủ: bốc thuốc + trừ kho FEFO + check tương kỵ + thanh toán + ma trận gợi ý (US-3.7) + báo cáo |

---

## 6. Definition of Ready (checklist trước khi code 1 US)

- [ ] Đơn vị tính, công thức giá, quy tắc FEFO đã chốt (nếu liên quan)
- [ ] Acceptance criteria dạng Given-When-Then đã viết
- [ ] Nguồn dữ liệu seed đã rõ (nếu liên quan đến dữ liệu y tế)
- [ ] Ma trận phân quyền cho các action trong US đã định nghĩa
- [ ] Đã review với chủ phòng thuốc / thầy thuốc (với US rủi ro cao)
