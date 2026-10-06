# KẾ HOẠCH TRIỂN KHAI — Web App Phòng Thuốc Đông Y

> Phiên bản: 1.3 — Ngày: 2026-10-06
> Cập nhật theo ưu tiên của Tony + review ChatGPT (2 vòng).
> Trạng thái: ✅ Tony đã duyệt — đang triển khai MVP-0

---

## Nguyên tắc triển khai

1. Mỗi phase xong phải **chạy được thật** (demo được cho phòng thuốc).
2. Schema đi trước UI: migration → seed → server actions → UI.
3. Không làm tính năng của phase sau trong phase trước.
4. Mỗi phase kết thúc: ChatGPT review code → Tony confirm → merge.
5. **Ưu tiên của Tony (2026-10-06):** bài thuốc là trung tâm → hồ sơ bệnh nhân → quá trình điều trị. Kho và tự động hóa để sau.

---

## MVP-0: Nền tảng (tối giản)

**Mục tiêu:** Đăng nhập được, phân quyền cơ bản.

| # | Task | Ghi chú |
|---|------|---------|
| 0.1 | Auth: login/logout (email+password), đổi mật khẩu | Bỏ qua quên mật khẩu, SMS OTP ở phase này |
| 0.2 | Middleware bảo vệ routes theo role (admin/practitioner/dispenser) |  |
| 0.3 | Quản lý người dùng tối giản (admin tạo user, gán role, khóa/mở) |  |
| 0.4 | Layout + sidebar theo role |  |
| 0.5 | Audit log infrastructure (ghi từ đầu, dùng dần) | Theo góp ý ChatGPT |

**Schema:** users (+ auth), audit_logs.
**Deliverable:** Đăng nhập 3 role hoạt động.
**Rủi ro:** Thấp.

---

## MVP-1: Bài thuốc ⭐ (ưu tiên số 1 của Tony)

**Mục tiêu:** Xây dựng được thư viện bài thuốc của phòng thuốc.

| # | Task | Ghi chú |
|---|------|---------|
| 1.1 | CRUD bài thuốc: tên bài, nguồn (cổ phương/tự chế), hội chứng tương ứng, chỉ định, cách dùng |  |
| 1.2 | Chi tiết bài thuốc: danh sách vị + liều mặc định từng vị — **structured text**: mỗi vị 1 dòng riêng (herb_name, herb_name_key, dosage_text, note, sort_order), KHÔNG dùng textarea blob | Theo review ChatGPT: blob text làm migrate MVP-3 thành bài toán data cleaning |
| 1.3 | **Canonical key** cho vị thuốc ngay từ MVP-1: `herb_name_key` (vd "Hoàng kỳ" → `hoang-ky`) — identity hint cho migrate sau, chưa phải FK |  |
| 1.4 | **Versioning bài thuốc**: v1, v2, v3… — đơn đã kê từ v1 giữ nguyên v1 khi bài thuốc được sửa | Rule từ ChatGPT: không sửa lịch sử |
| 1.5 | Phân loại bài thuốc (cổ phương / bài gia truyền / bài tự chế) |  |
| 1.6 | Tìm kiếm bài thuốc theo tên / triệu chứng / hội chứng |  |
| 1.7 | Nhân bản bài thuốc (từ cổ phương tạo bài biến thể của phòng thuốc) |  |

**Schema mới:** prescription_templates (+ version), prescription_template_items (herb_name, herb_name_key, dosage_text, note, sort_order).
**Deliverable:** Nhập và tra cứu được thư viện bài thuốc.
**Rủi ro:** Thấp — chủ yếu là CRUD + tìm kiếm.

---

## MVP-2: Hồ sơ bệnh nhân + quá trình điều trị ⭐ (ưu tiên số 2 của Tony)

**Mục tiêu:** Lưu được hồ sơ bệnh nhân và theo dõi quá trình điều trị.

| # | Task | Ghi chú |
|---|------|---------|
| 2.1 | CRUD hồ sơ bệnh nhân: mã BN tự sinh, họ tên, ngày sinh, giới tính, SĐT, địa chỉ, tiền sử, dị ứng |  |
| 2.2 | Tìm kiếm bệnh nhân nhanh |  |
| 2.3 | Lượt khám: ngày khám, thầy thuốc, triệu chứng (vọng/văn/vấn), bộ mạch (6 vị trí thốn/quan/xích) |  |
| 2.4 | Chẩn đoán: hội chứng/bệnh danh, ghi chú |  |
| 2.5 | Kê đơn từ bài thuốc: chọn bài mẫu → **gia giảm** (sửa liều, thêm/bớt vị) → chốt đơn → **snapshot tại lúc CONFIRM** (không phải lúc in) → in đơn A5 | Snapshot bất biến, gồm cả thông tin BN; theo review ChatGPT |
| 2.6 | Timeline quá trình điều trị theo bệnh nhân: danh sách lượt khám → chẩn đoán → đơn thuốc → tái khám — **giữ đơn giản**, chưa làm EMR đầy đủ |  |

**Schema mới:** patients, practitioners, visits, visit_pulses, pulse_patterns (+ seed 28 mạch), prescriptions, prescription_items, **prescription_snapshots** (JSONB bất biến, có version, tạo lúc CONFIRM).
**Deliverable:** Chọn bệnh nhân → khám → kê đơn từ bài thuốc → in đơn → xem được lịch sử điều trị.
**Rủi ro:** Trung bình — cần thầy thuốc dùng thử và feedback. **Đây là milestone quan trọng nhất** (vertical slice chứng minh giá trị).

---

## MVP-3: Danh mục vị thuốc (chuẩn hóa)

**Mục tiêu:** Chuẩn hóa dữ liệu vị thuốc, link cứng với bài thuốc.

| # | Task | Ghi chú |
|---|------|---------|
| 3.1 | CRUD vị thuốc đầy đủ (tên, Hán Việt, khoa học, bộ phận dùng, tính/vị/quy kinh, dược lực, nhận dạng, ảnh, is_valuable) |  |
| 3.2 | Tên khác (aliases), liều an toàn, giá nhập/bán + lịch sử |  |
| 3.3 | **Migrate dữ liệu:** bảng `herb_migration_mappings` (old_text, normalized_key, herb_id, confidence, status, reviewed_by) — AI gợi ý, **người có chuyên môn duyệt** các case mập mờ; báo cáo matched/ambiguous/unmatched; chỉ khi 100% confirmed mới enforce herb_id NOT NULL | Theo review ChatGPT: không auto-link 100% |
| 3.4 | Quản lý tương kỵ (cặp vị, mức độ, nguồn) — chỉ lưu dữ liệu ở phase này |  |
| 3.5 | Tìm kiếm vị thuốc nhanh (p95 < 300ms) |  |

**Deliverable:** Dữ liệu vị thuốc chuẩn hóa, bài thuốc link cứng vào danh mục.
**Rủi ro:** Trung bình — task migrate 3.3 cần làm cẩn thận (đây là rủi ro lớn nhất của roadmap, đã có phương án giảm thiểu).

---

## MVP-4: Kho cơ bản

**Mục tiêu:** Nhập kho, biết tồn kho thực tế.

| # | Task | Ghi chú |
|---|------|---------|
| 4.1 | CRUD nhà cung cấp |  |
| 4.2 | Phiếu nhập kho (draft → confirmed) |  |
| 4.3 | Sinh mã lô + in mã vạch Code128 |  |
| 4.4 | Quản lý lô + cảnh báo hết hạn 30 ngày |  |
| 4.5 | Tra cứu tồn kho theo vị / theo lô |  |

**Rủi ro:** Trung bình.

---

## MVP-5A: Kho an toàn (để sau khi validate)

- Bốc thuốc + trừ kho FEFO tự động (transaction, locking)
- Kiểm kho (delta, duyệt), xử lý hỏng/mốc

## MVP-5B: An toàn lâm sàng (sau 5A)

- Check tương kỵ real-time khi kê đơn (+ override có audit)
- Cảnh báo liều

**Lý do tách** (theo review ChatGPT): bug kho chỉ sai tồn kho; bug tương kỵ là rủi ro lâm sàng — không làm cùng lúc.

**Rủi ro:** Cao — chỉ đầu tư sau khi các MVP trước đã được phòng thuốc dùng thật và xác nhận giá trị.

---

## Tóm tắt thứ tự mới

| Phase | Tên | Giá trị đem lại |
|-------|-----|-----------------|
| MVP-0 | Nền tảng | Đăng nhập, phân quyền |
| MVP-1 | Bài thuốc | Thư viện bài thuốc số hóa ⭐ |
| MVP-2 | Bệnh nhân + điều trị | Khám, kê đơn, theo dõi điều trị ⭐ |
| MVP-3 | Danh mục vị thuốc | Chuẩn hóa dữ liệu |
| MVP-4 | Kho cơ bản | Quản lý tồn kho |
| MVP-5A | Kho an toàn | FEFO, trừ kho tự động |
| MVP-5B | An toàn lâm sàng | Tương kỵ realtime, cảnh báo liều |

**Logic:** Tony ưu tiên giá trị lâm sàng (bài thuốc → bệnh nhân → điều trị) trước giá trị vận hành (kho). Kho chỉ đầu tư sau khi đã validate với phòng thuốc thật.

## Test budget theo phase (theo review ChatGPT — test theo risk, không theo coverage %)

| Phase | Unit | Integration | E2E/GWT |
|-------|------|-------------|---------|
| MVP-0 | Thấp | Cao (RBAC + audit) | Ít (login → phân quyền) |
| MVP-1 | Vừa (formula validation/version) | Vừa (CRUD + permission) | Ít |
| MVP-2 | Cao (tính toán đơn/snapshot) | Cao (patient/visit/prescription) | 1 happy path |
| MVP-3 | Cao (normalize/mapping) | Cao (migration + constraints) | Migration test (100% classified) |
| MVP-4 | Cao | Rất cao (transaction, concurrency) | Critical flow |
| MVP-5 | Rất cao | Rất cao | Critical flow |

**Nguyên tắc:** Không test mọi thứ. Test những thứ mà nếu sai thì dữ liệu bệnh nhân, đơn thuốc, tồn kho hoặc quyền truy cập bị sai.
**Definition of Done mỗi phase:** happy path ✓, permission denied ✓, validation failure ✓, duplicate submission ✓, audit ✓, rollback (nếu transaction) ✓.
