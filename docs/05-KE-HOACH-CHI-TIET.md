# KẾ HOẠCH CHI TIẾT TỪNG PHASE — Web App Phòng Thuốc Đông Y

> Phiên bản: 1.3 — Ngày: 2026-10-06
> Cập nhật: gộp review ChatGPT (herb_name_key, versioning, snapshot tại CONFIRM, test theo risk).
> Trạng thái: ✅ Tony đã duyệt — đang triển khai MVP-0
> Mỗi phase gồm: **Code** (files) → **Test** → **Nghiệm thu** (Given-When-Then)

---

## MVP-0: Nền tảng

### 0.1 Auth — Đăng nhập/đăng xuất

**Code:**
| File | Nội dung |
|------|----------|
| `src/app/(auth)/login/page.tsx` | Form đăng nhập (Server Component + Server Action) |
| `src/app/(auth)/login/actions.ts` | `login(email, password)` — validate Zod, gọi Supabase Auth |
| `src/middleware.ts` | Bảo vệ routes: chưa login → redirect `/login`; kiểm tra role |
| `src/lib/supabase/client.ts` | ✅ đã có |
| `src/lib/supabase/server.ts` | ✅ đã có |

**Test:**
- [ ] Unit: Zod schema reject email sai format, password < 6 ký tự
- [ ] Integration: login đúng → session tạo; login sai → error `INVALID_CREDENTIALS`; logout → session xóa

**Nghiệm thu:**
- Given chưa đăng nhập, When truy cập `/admin/staff`, Then redirect về `/login`
- Given nhập sai mật khẩu, When bấm đăng nhập, Then hiện lỗi "Email hoặc mật khẩu không đúng"
- Given đăng nhập đúng với role practitioner, When vào app, Then thấy sidebar của practitioner

### 0.2 Quản lý người dùng (admin)

**Code:**
| File | Nội dung |
|------|----------|
| `src/app/admin/staff/page.tsx` | Danh sách nhân viên |
| `src/app/admin/staff/new/page.tsx` | Form tạo user (email, họ tên, role, SĐT) |
| `src/app/admin/staff/[id]/page.tsx` | Sửa user, đổi role, khóa/mở tài khoản |
| `src/features/users/actions.ts` | `createUser`, `updateUser`, `toggleActive` (Server Actions) |

**Test:**
- [ ] Integration: tạo user → user đăng nhập được với role đúng; khóa user → không đăng nhập được

**Nghiệm thu:**
- Given admin tạo user mới role `dispenser`, When user đó đăng nhập, Then thấy sidebar của dispenser
- Given admin khóa tài khoản, When user đó đăng nhập, Then báo "Tài khoản đã bị khóa"

### 0.3 Layout + sidebar theo role

**Code:**
| File | Nội dung |
|------|----------|
| `src/app/layout.tsx` | Root layout + Sonner toaster |
| `src/components/shared/Sidebar.tsx` | Menu theo role (client component) |
| `src/components/shared/Header.tsx` | Tên user, nút đăng xuất |

**Nghiệm thu:**
- Given đăng nhập role admin, Then sidebar hiện: Bài thuốc, Bệnh nhân, Nhân viên
- Given đăng nhập role practitioner, Then sidebar hiện: Bài thuốc, Bệnh nhân, Khám bệnh
- Given đăng nhập role dispenser, Then sidebar hiện: Bài thuốc, Bệnh nhân (xem)

---

## MVP-1: Bài thuốc

### 1.1 CRUD bài thuốc

**Schema** (migration mới) — theo review ChatGPT: structured text + canonical key + versioning:
```sql
CREATE TABLE prescription_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,              -- BT-0001
    name TEXT NOT NULL,                     -- Lục Vị Địa Hoàng Hoàn
    version INT NOT NULL DEFAULT 1,         -- v1, v2, v3... (đơn đã kê giữ version cũ)
    category TEXT CHECK (category IN ('co_phuong','gia_truyen','tu_che')),
    source_book TEXT,                       -- Thương Hàn Luận
    syndrome TEXT,                          -- Hội chứng: Thận âm hư
    indications TEXT,                       -- Chỉ định
    usage_note TEXT,                        -- Cách dùng
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(code, version)
);
CREATE TABLE prescription_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES prescription_templates(id) ON DELETE CASCADE,
    herb_name TEXT NOT NULL,                -- "Hoàng Kỳ" (tên hiển thị)
    herb_name_key TEXT NOT NULL,            -- "hoang-ky" (canonical key, identity hint cho migrate)
    dosage_text TEXT NOT NULL,              -- "12g" (text ở MVP-1)
    sort_order INT DEFAULT 0,
    note TEXT
);
-- Rule: sửa bài thuốc = tạo version mới, không sửa version đã có đơn tham chiếu
```

**Code:**
| File | Nội dung |
|------|----------|
| `src/app/formulas/page.tsx` | Danh sách + tìm kiếm bài thuốc |
| `src/app/formulas/new/page.tsx` | Form tạo bài thuốc (React Hook Form + Zod) |
| `src/app/formulas/[id]/page.tsx` | Chi tiết: thông tin + bảng vị thuốc |
| `src/app/formulas/[id]/edit/page.tsx` | Sửa bài thuốc |
| `src/features/formulas/actions.ts` | `createFormula`, `updateFormula`, `toggleActive`, `duplicateFormula` |
| `src/features/formulas/schemas.ts` | Zod schemas (client + server tách riêng) |

**Test:**
- [ ] Unit: schema reject bài thuốc không tên, vị thuốc không có liều
- [ ] Integration: tạo bài thuốc 6 vị → đọc lại đủ 6 vị đúng liều; nhân bản → tạo bản copy độc lập; xóa mềm → không hiện trong list nhưng còn trong DB

**Nghiệm thu:**
- Given admin nhập bài "Lục Vị Địa Hoàng Hoàn" với 6 vị + liều, When bấm lưu, Then bài thuốc xuất hiện trong danh sách với mã BT-0001
- Given bấm "Nhân bản" trên 1 bài thuốc, When lưu, Then tạo bài mới độc lập, sửa bài mới không ảnh hưởng bài gốc
- Given tìm kiếm "địa hoàng", When gõ vào ô search, Then kết quả hiện trong < 300ms

### 1.2 Tìm kiếm bài thuốc

**Code:** Search input với debounce 300ms trong `src/app/formulas/page.tsx`, query qua Server Action.

**Test:**
- [ ] Integration: seed 50 bài thuốc → search trả về đúng, đo p95

**Nghiệm thu:**
- Given có 50 bài thuốc, When gõ "hoàng", Then hiện danh sách bài chứa "hoàng" trong < 300ms

---

## MVP-2: Hồ sơ bệnh nhân + quá trình điều trị

### 2.1 CRUD bệnh nhân

**Schema:** đã có `patients` từ MVP-0. Thêm function sinh mã BN.

**Code:**
| File | Nội dung |
|------|----------|
| `src/app/patients/page.tsx` | Danh sách + tìm kiếm (tên/SĐT/mã BN) |
| `src/app/patients/new/page.tsx` | Form tạo BN |
| `src/app/patients/[id]/page.tsx` | Chi tiết BN + **timeline điều trị** |
| `src/features/patients/actions.ts` | CRUD + `generatePatientCode()` |

**Test:**
- [ ] Integration: tạo 2 BN cùng ngày → mã khác nhau, đúng format BN-YYYYMMDD-XXX

**Nghiệm thu:**
- Given nhập họ tên + SĐT, When lưu, Then tạo BN với mã tự sinh, hiện trong danh sách

### 2.2 Lượt khám + mạch

**Schema** (migration mới):
```sql
CREATE TABLE pulse_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_viet TEXT NOT NULL, name_han_viet TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL, clinical_significance TEXT,
    primary_diseases TEXT[]
);
-- seed 28 mạch trong seed.sql
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    practitioner_id UUID NOT NULL REFERENCES practitioners(id),
    visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inspection_notes TEXT, auscultation_notes TEXT,
    inquiry_notes TEXT, palpation_notes TEXT,
    final_diagnosis TEXT, doctor_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE visit_pulses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    hand TEXT CHECK (hand IN ('left','right')) NOT NULL,
    position TEXT CHECK (position IN ('thon','quan','xich')) NOT NULL,
    pulse_pattern_id UUID REFERENCES pulse_patterns(id) ON DELETE SET NULL,
    custom_note TEXT,
    UNIQUE(visit_id, hand, position)
);
```

**Code:**
| File | Nội dung |
|------|----------|
| `src/app/visits/new/page.tsx` | Form lượt khám (chọn BN → triệu chứng → mạch) |
| `src/components/prescription/PulseInputForm.tsx` | Form nhập mạch 6 vị trí (2 tay × thốn/quan/xích) |
| `src/features/visits/actions.ts` | `createVisit` (lưu visit + pulses trong 1 transaction) |

**Test:**
- [ ] Integration: tạo lượt khám với 6 vị trí mạch → đọc lại đủ 6; bỏ trống 1 vị trí → vẫn lưu được

**Nghiệm thu:**
- Given chọn BN + nhập triệu chứng + chọn mạch 6 vị trí, When lưu, Then tạo lượt khám, hiện trong timeline của BN

### 2.3 Kê đơn từ bài thuốc + in đơn

**Schema** (migration mới) — snapshot tại CONFIRM, theo review ChatGPT:
```sql
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_code TEXT UNIQUE NOT NULL,  -- DT-YYYYMMDD-XXX
    visit_id UUID NOT NULL REFERENCES visits(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    practitioner_id UUID NOT NULL REFERENCES practitioners(id),
    template_id UUID REFERENCES prescription_templates(id),
    template_version INT,                    -- version của bài thuốc lúc kê
    status TEXT CHECK (status IN ('draft','confirmed','completed','cancelled')) DEFAULT 'draft',
    num_of_packs INT NOT NULL DEFAULT 1 CHECK (num_of_packs > 0),
    usage_instruction TEXT,
    doctor_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);
CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    herb_name TEXT NOT NULL,
    herb_name_key TEXT NOT NULL,            -- canonical key (giống MVP-1)
    weight_per_pack NUMERIC(10,2) NOT NULL CHECK (weight_per_pack > 0),
    note TEXT
);
-- Snapshot BẤT BIẾN, tạo 1 lần duy nhất lúc CONFIRM (không phải lúc in).
-- In lại bao nhiêu lần cũng dùng cùng 1 snapshot.
CREATE TABLE prescription_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id),
    version INT NOT NULL DEFAULT 1,
    snapshot_data JSONB NOT NULL,  -- { prescriptionCode, patient: {code, name, dob},
                                   --   practitioner: {name}, items: [{herbName, weight, unit, note}],
                                   --   usageInstruction, numOfPacks, confirmedAt }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(prescription_id, version)
);
-- Rule: sau CONFIRM không được sửa prescriptions/prescription_items
-- (muốn sửa → hủy + tạo đơn mới, hoặc version snapshot mới nếu business cho phép).
```

**Code:**
| File | Nội dung |
|------|----------|
| `src/app/prescriptions/new/page.tsx` | Chọn bài thuốc mẫu → điều chỉnh vị/liều → chốt đơn |
| `src/components/prescription/PrescriptionBuilder.tsx` | Bảng kê đơn (thêm/sửa/xóa vị, liều, số thang) |
| `src/components/prescription/PrintPrescription.tsx` | Component in đơn A5 (react-to-print, snapshot) |
| `src/features/prescriptions/actions.ts` | `createPrescription`, `confirmPrescription`, `createSnapshot` |

**Test:**
- [ ] Unit: tính tổng liều = weight_per_pack × num_of_packs đúng
- [ ] Integration: tạo đơn từ bài mẫu → sửa 1 vị → snapshot lúc in khác với dữ liệu gốc sau khi sửa bài mẫu (bất biến)

**Nghiệm thu:**
- Given chọn bài "Lục Vị Địa Hoàng Hoàn" (6 vị), When đổi liều 1 vị + thêm 1 vị mới + chốt đơn, Then đơn có 7 vị đúng liều đã chỉnh
- Given đã in đơn, When sửa bài thuốc gốc, Then đơn đã in không thay đổi (snapshot bất biến)
- Given bấm in, When preview hiện, Then đúng khổ A5: tên phòng thuốc, thông tin BN, chi tiết vị + liều/thang, số thang, cách sắc, chữ ký

### 2.4 Timeline quá trình điều trị

**Code:** `src/app/patients/[id]/page.tsx` — timeline dọc: mỗi lượt khám → chẩn đoán → đơn thuốc (link chi tiết) → tái khám.

**Nghiệm thu:**
- Given BN có 3 lượt khám, When mở trang chi tiết BN, Then timeline hiện đủ 3 lượt theo thứ tự thời gian, mỗi lượt link được tới đơn thuốc

---

## MVP-3: Danh mục vị thuốc (chuẩn hóa)

### 3.1 CRUD vị thuốc đầy đủ + migrate

**Code:** `src/app/herbs/` (CRUD đầy đủ fields theo tài liệu hệ thống).

**Task quan trọng nhất — migrate an toàn** (theo review ChatGPT):
```sql
CREATE TABLE herb_migration_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_text TEXT NOT NULL,        -- text gốc trong bài thuốc
    normalized_key TEXT NOT NULL,     -- herb_name_key đã chuẩn hóa
    herb_id UUID REFERENCES herbs(id),
    confidence NUMERIC(3,2),          -- độ tin cậy của gợi ý (AI)
    status TEXT CHECK (status IN ('pending','matched','confirmed','rejected')) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ
);
```
Quy trình: chạy matching `herb_name_key` → `herbs.canonical_key` → tạo mappings với confidence → **người có chuyên môn duyệt** các case ambiguous/unmatched → báo cáo matched/ambiguous/unmatched → chỉ khi 100% confirmed mới enforce `herb_id NOT NULL`. **Không migrate lịch sử bằng cách rewrite** — đơn thuốc cũ giữ nguyên text, chỉ link master/template sang herb_id.

**Test:**
- [ ] Integration: chạy migrate trên dữ liệu mẫu → 100% records được phân loại (matched/ambiguous/unmatched), không có record nào bị link sai silently

**Nghiệm thu:**
- Given chạy migrate, When hoàn thành, Then báo cáo hiện rõ 3 nhóm; không có mapping nào tự động confirmed mà không qua review

### 3.2 Tương kỵ (lưu dữ liệu)

**Nghiệm thu:** Nhập được cặp tương kỵ có nguồn tham khảo; chưa cần check tự động.

---

## MVP-4: Kho cơ bản

| Task | Nghiệm thu chính |
|------|------------------|
| CRUD NCC | Tạo/sửa NCC |
| Phiếu nhập (draft→confirmed) | Chỉ confirmed mới tạo lô |
| Sinh mã lô + in mã vạch | Mã unique, quét được |
| Quản lý lô + cảnh báo HSD 30 ngày | Dashboard hiện lô sắp hết hạn |
| Tra cứu tồn kho | Tìm vị → thấy tồn tổng + chi tiết lô |

---

## MVP-5: Nâng cao (sau validate)

| Task | Điều kiện bắt đầu |
|------|-------------------|
| Kiểm kho (delta) | Phòng thuốc đã dùng MVP-0→4 ổn định 2 tuần |
| Check tương kỵ realtime | Dữ liệu tương kỵ đã được thầy thuốc kiểm duyệt |
| FEFO tự động | Kho đã có số liệu thật đầy đủ |
| Thanh toán, báo cáo | Theo nhu cầu thực tế phát sinh |

---

## Quy tắc nghiệm thu chung mỗi phase

1. `tsc --noEmit` pass, `next build` OK
2. Migration apply được từ DB trống
3. Test theo **risk** (không theo coverage %): ưu tiên data integrity → authorization → prescription correctness → inventory correctness → UI polish
4. Definition of Done: happy path ✓, permission denied ✓, validation failure ✓, duplicate submission ✓, audit ✓, rollback (nếu transaction) ✓
5. Demo được luồng chính cho Tony xem
6. ChatGPT review code → Tony confirm → merge
