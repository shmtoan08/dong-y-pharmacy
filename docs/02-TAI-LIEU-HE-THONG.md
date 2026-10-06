# TÀI LIỆU HỆ THỐNG — Web App Phòng Thuốc Đông Y

> Phiên bản: 1.1 — Ngày: 2026-10-06
> Cập nhật sau review của ChatGPT (vai trò kiến trúc sư phần mềm).
> Stack: Next.js (App Router) + Tailwind CSS + PostgreSQL (Supabase)

---

## 1. Kiến trúc tổng thể

### 1.1. Mô hình: Modular Monolith (Layered)

```
┌──────────────────────────────────────────────────────┐
│                    Next.js App                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  UI Layer (Server Components / Client)         │  │
│  │  → chỉ render + gọi Server Actions             │  │
│  │  → CẤM business logic trong component          │  │
│  └──────────────────────┬─────────────────────────┘  │
│                         ▼                             │
│  ┌────────────────────────────────────────────────┐  │
│  │  Domain Service Layer (TypeScript)              │  │
│  │  createHerb(), confirmPrescription(),           │  │
│  │  dispensePrescription(), approveStockTake()...  │  │
│  │  → validate (Zod) → gọi Supabase / RPC          │  │
│  └──────────────────────┬─────────────────────────┘  │
│                         ▼                             │
│  ┌────────────────────────────────────────────────┐  │
│  │  Data Layer: Supabase Client (RLS)              │  │
│  │  + PostgreSQL RPC (transaction quan trọng)     │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│  Supabase: PostgreSQL + Auth + Storage + Realtime    │
└──────────────────────────────────────────────────────┘
```

### 1.2. Phân loại operation (3 loại)

| Loại | Ví dụ | Đường đi |
|------|-------|----------|
| A. Read đơn giản | Danh sách vị thuốc, chi tiết lô | Server Component → Supabase (RLS) |
| B. CRUD có business rule | Tạo phiếu nhập, sửa vị thuốc | Server Action → Domain service (Zod validate) → Supabase |
| C. Critical transaction | Bốc thuốc trừ kho, duyệt kiểm kho, hủy đơn | Server Action → PostgreSQL RPC (`SECURITY DEFINER`, `FOR UPDATE`) → commit/rollback |

> Nguyên tắc: **không để client tự chạy chuỗi nhiều câu SQL** cho nghiệp vụ kho/đơn thuốc.

### 1.3. Background jobs
- Trừ kho, duyệt kiểm kho: **synchronous** trong PostgreSQL transaction (không qua queue).
- Background (scheduled jobs, KHÔNG cần Inngest/QStash ở MVP): cảnh báo hết hạn, báo cáo định kỳ, OCR (nếu có sau này).

---

## 2. Cấu trúc thư mục

```
src/
├── app/
│   ├── (auth)/login/
│   ├── herbs/                     # PH3
│   ├── inventory/                 # PH1: receipts/, batches/, stock-take/
│   ├── prescription/              # PH2: encounters/[id]/, queue/, [id]/
│   ├── admin/                     # dashboard/, pulse-patterns/, formulas/, staff/
│   └── api/                       # Route Handlers (chỉ khi cần: webhook...)
├── components/
│   ├── ui/                        # Shadcn/ui — KHÔNG sửa trực tiếp
│   └── [domain]/                  # herbs/, inventory/, prescription/
├── features/                      # Domain services: herb-search/, fefo-inventory/, interaction-check/
├── lib/supabase/                  # client.ts (browser) / server.ts (server) / admin.ts (service_role, server-only)
├── hooks/                         # useAuth, useRealtimeQueue, useBarcodeScanner...
├── types/                         # database.types.ts (supabase gen)
└── constants/                     # EXPIRY_WARNING_DAYS = 30, error codes...
supabase/
├── migrations/                    # YYYYMMDDHHMMSS_ten_mo_ta.sql
└── seed.sql                        # 28 mạch, vị thuốc demo (tách dev/prod)
```

---

## 3. Database

### 3.1. Quy ước
- PK: `UUID DEFAULT gen_random_uuid()`. Thời gian: `TIMESTAMPTZ`. Tiền/SL: `NUMERIC` (trả về string → dùng `decimal.js`, cấm `Number()` trực tiếp).
- **Đơn vị chuẩn toàn hệ thống: gram.** UI hiển thị kg nhưng DB luôn lưu gram.
- **Một nguồn sự thật cho tồn kho:** `inventory_transactions` là sổ cái bất biến (append-only); `inventory_batches.quantity_remaining` là số dư cache, chỉ được cập nhật atomic bên trong stored procedure — **cấm UPDATE trực tiếp từ app**.
- Mọi bảng giao dịch có `created_by`; danh mục có `created_at/updated_at` (+ `deleted_at` cho xóa mềm).

### 3.2. Schema

```sql
-- ===== USERS / PATIENTS / PRACTITIONERS =====
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL, phone TEXT,
    role TEXT CHECK (role IN ('admin','practitioner','dispenser')) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_code TEXT UNIQUE NOT NULL,      -- Mã BN: BN-YYYYMMDD-XXX
    full_name TEXT NOT NULL, date_of_birth DATE, sex TEXT,
    phone TEXT, address TEXT,
    medical_history TEXT, allergies TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE practitioners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialty TEXT, is_active BOOLEAN DEFAULT true
);

-- ===== PHÂN HỆ 3: DANH MỤC =====
CREATE TABLE herbs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE,                       -- Mã vị thuốc
    name_common TEXT NOT NULL, name_han_viet TEXT, name_science TEXT,
    used_part TEXT,
    property_tinh TEXT, property_vi TEXT, quy_kinh TEXT[],
    cong_nang TEXT,                          -- Dược lực
    identification JSONB, image_urls TEXT[],
    base_unit TEXT NOT NULL DEFAULT 'gram',
    is_valuable BOOLEAN DEFAULT false,       -- Thuốc quý
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE herb_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    herb_id UUID NOT NULL REFERENCES herbs(id) ON DELETE CASCADE,
    alias_name TEXT NOT NULL, UNIQUE (herb_id, alias_name)
);

CREATE TABLE herb_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    herb_a_id UUID NOT NULL REFERENCES herbs(id) ON DELETE CASCADE,
    herb_b_id UUID NOT NULL REFERENCES herbs(id) ON DELETE CASCADE,
    severity TEXT CHECK (severity IN ('critical','warning','info')) NOT NULL,
    description TEXT NOT NULL,
    source TEXT, source_version TEXT,        -- Nguồn tri thức + phiên bản
    reviewed_by UUID REFERENCES users(id), reviewed_at TIMESTAMPTZ,
    effective_from DATE DEFAULT CURRENT_DATE, effective_to DATE,
    CONSTRAINT chk_ordered_pair CHECK (herb_a_id < herb_b_id),
    UNIQUE (herb_a_id, herb_b_id)
);

CREATE TABLE herb_dosage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    herb_id UUID NOT NULL UNIQUE REFERENCES herbs(id) ON DELETE CASCADE,
    max_weight_per_pack NUMERIC(10,2) NOT NULL,  -- gram/thang
    source TEXT, reviewed_by UUID REFERENCES users(id),
    effective_from DATE DEFAULT CURRENT_DATE, effective_to DATE
);

CREATE TABLE herb_price_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    herb_id UUID NOT NULL REFERENCES herbs(id),
    price_type TEXT CHECK (price_type IN ('purchase','sale')) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'gram',
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    effective_from DATE NOT NULL, effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pulse_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_viet TEXT NOT NULL, name_han_viet TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL, clinical_significance TEXT,
    primary_diseases TEXT[], created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prescription_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, source_book TEXT,
    syndrome_diagnosis TEXT NOT NULL, indications TEXT,
    version INT DEFAULT 1, is_active BOOLEAN DEFAULT true
);
CREATE TABLE prescription_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES prescription_templates(id) ON DELETE CASCADE,
    herb_id UUID NOT NULL REFERENCES herbs(id),
    default_weight NUMERIC(10,2) NOT NULL,  -- gram
    sort_order INT DEFAULT 0, note TEXT
);

-- ===== PHÂN HỆ 1: KHO =====
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, phone TEXT, address TEXT, tax_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE receipt_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_code TEXT UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    receipt_date DATE NOT NULL,
    status TEXT CHECK (status IN ('draft','confirmed','cancelled')) DEFAULT 'draft',
    total_amount NUMERIC(14,2),
    created_by UUID REFERENCES users(id),
    confirmed_by UUID REFERENCES users(id), confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE receipt_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES receipt_headers(id) ON DELETE CASCADE,
    herb_id UUID NOT NULL REFERENCES herbs(id),
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),  -- gram
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),  -- đ/gram
    line_total NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    expiry_date DATE NOT NULL,
    batch_id UUID REFERENCES inventory_batches(id)  -- set khi confirmed
);

CREATE TABLE inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    herb_id UUID NOT NULL REFERENCES herbs(id),
    batch_code TEXT NOT NULL UNIQUE,        -- LÔ-YYYYMMDD-XXX, bất biến sau confirmed
    supplier_name TEXT,
    quantity_imported NUMERIC(10,2) NOT NULL,
    quantity_remaining NUMERIC(10,2) NOT NULL,  -- chỉ SP được UPDATE
    unit_cost NUMERIC(12,2),                -- giá vốn đ/gram (để định giá duyệt kiểm kho)
    expiry_date DATE NOT NULL,
    import_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT CHECK (status IN ('active','expired','damaged','disposed')) DEFAULT 'active',
    quality_note TEXT,
    created_by UUID REFERENCES users(id)
);
CREATE INDEX idx_batches_herb_status_expiry
    ON inventory_batches(herb_id, status, expiry_date);

CREATE TYPE transaction_type AS ENUM (
    'IMPORT','DISPENSE','DAMAGE','DISPOSAL',
    'STOCKTAKE_INCREASE','STOCKTAKE_DECREASE','REVERSAL'
);
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES inventory_batches(id),
    type transaction_type NOT NULL,
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),  -- luôn dương
    reference_id UUID,                       -- prescription/receipt/session id
    idempotency_key TEXT UNIQUE,             -- chống retry trùng
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_inv_txn_batch_created ON inventory_transactions(batch_id, created_at);

-- Kiểm kho
CREATE TABLE stock_take_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    status TEXT CHECK (status IN ('draft','pending_approval','approved','rejected')) DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id), approved_at TIMESTAMPTZ,
    notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE stock_take_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES stock_take_sessions(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES inventory_batches(id),
    system_quantity NUMERIC(10,2) NOT NULL,   -- snapshot lúc kiểm
    actual_quantity NUMERIC(10,2) NOT NULL,
    adjustment_reason TEXT CHECK (adjustment_reason IN
        ('NATURAL_SHRINKAGE','COUNTING_ERROR','DAMAGE','UNKNOWN','OTHER')) NOT NULL,
    reason_note TEXT, item_evidence_url TEXT,
    UNIQUE(session_id, batch_id)
);

-- ===== PHÂN HỆ 2: KÊ ĐƠN =====
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    practitioner_id UUID NOT NULL REFERENCES practitioners(id),
    visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inspection_notes TEXT, auscultation_notes TEXT,  -- vọng/văn
    inquiry_notes TEXT, palpation_notes TEXT,        -- vấn/thiết (ngoài mạch)
    final_diagnosis TEXT, doctor_notes TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
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

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_code TEXT UNIQUE NOT NULL,
    visit_id UUID NOT NULL REFERENCES visits(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    practitioner_id UUID NOT NULL REFERENCES practitioners(id),
    status TEXT CHECK (status IN
        ('draft','confirmed','dispensing','completed','cancelled')) DEFAULT 'draft',
    num_of_packs INT NOT NULL DEFAULT 1 CHECK (num_of_packs > 0),
    usage_instruction TEXT, total_price NUMERIC(14,2),
    doctor_notes TEXT,                        -- lý do bỏ qua cảnh báo critical
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ, confirmed_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT
);

CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    herb_id UUID NOT NULL REFERENCES herbs(id),
    weight_per_pack NUMERIC(10,2) NOT NULL CHECK (weight_per_pack > 0),  -- gram
    total_quantity NUMERIC(12,2)
        GENERATED ALWAYS AS (weight_per_pack * num_of_packs) STORED,
    unit TEXT NOT NULL DEFAULT 'gram',
    unit_price_snapshot NUMERIC(12,2),        -- giá tại lúc kê đơn
    line_total NUMERIC(14,2),
    note TEXT
);
-- NOTE: total_quantity cần num_of_packs từ prescriptions → tính ở app hoặc trigger.
-- Đơn giản: bỏ GENERATED, tính total = weight_per_pack * num_of_packs trong SP.

-- Phân bổ bốc thuốc: 1 vị có thể lấy từ NHIỀU lô
CREATE TABLE dispensing_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_item_id UUID NOT NULL REFERENCES prescription_items(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES inventory_batches(id),
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),  -- gram
    picked_by UUID REFERENCES users(id),
    picked_at TIMESTAMPTZ,
    UNIQUE(prescription_item_id, batch_id)
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, table_name TEXT NOT NULL, row_id UUID NOT NULL,
    old_value JSONB, new_value JSONB,
    reason TEXT, request_id TEXT,
    ip_address TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
-- append-only: REVOKE UPDATE, DELETE ON audit_logs FROM authenticated;
```

### 3.3. Stored procedures

**`process_prescription_fefo(p_prescription_id, p_user_id, p_idempotency_key)`** — đổi tên từ fifo → fefo:
```
1. Kiểm tra idempotency_key (đã chạy rồi → trả về kết quả cũ).
2. Lock prescription FOR UPDATE → validate status = 'dispensing' (reject nếu khác).
3. Với từng prescription_item:
   - total = weight_per_pack * num_of_packs
   - SELECT batch ... WHERE herb_id AND status='active'
     AND quantity_remaining > 0 AND expiry_date >= CURRENT_DATE
     ORDER BY expiry_date ASC, import_date ASC, id ASC  FOR UPDATE
   - Trừ dần từng lô → UPDATE quantity_remaining (atomic)
   - INSERT inventory_transactions (type='DISPENSE', idempotency_key)
   - INSERT dispensing_allocations (item, batch, quantity)
   - Thiếu hàng → RAISE EXCEPTION → ROLLBACK toàn bộ.
4. UPDATE prescriptions SET status='completed', completed_at=NOW().
5. Ghi audit_logs trong cùng transaction.
```

**`approve_stock_take_session(p_session_id, p_approver_id)`** — sửa lỗi ghi đè:
```
1. Lock session FOR UPDATE → validate status pending_approval/draft.
2. Với từng item: lock batch FOR UPDATE →
   adjustment = actual_quantity - batch.quantity_remaining (số HIỆN TẠI, không phải snapshot)
   → UPDATE quantity_remaining = quantity_remaining + adjustment
   → INSERT transaction (STOCKTAKE_INCREASE/DECREASE theo dấu)
3. UPDATE session approved.
```
> Khác biệt cốt lõi: dùng delta so với tồn hiện tại thay vì gán đè `= actual_quantity` → không mất giao dịch phát sinh sau thời điểm kiểm.

**Hardening SECURITY DEFINER:** đặt `SET search_path = public`, `REVOKE EXECUTE ... FROM PUBLIC` + `GRANT` theo role cần thiết, validate `p_user_id` + role bên trong procedure, không dùng như cách bypass RLS.

### 3.4. RLS — ma trận theo domain (rút gọn)

| Bảng | admin | practitioner | dispenser |
|------|-------|--------------|-----------|
| herbs, pulse_patterns | ALL | SELECT | SELECT |
| herb_interactions, dosage_limits | ALL | SELECT | SELECT |
| patients | ALL | SELECT/INSERT/UPDATE | SELECT |
| visits, visit_pulses | ALL | CRUD của mình (practitioner_id = mình) | SELECT tối thiểu |
| prescriptions | ALL | CRUD của mình | SELECT đơn confirmed+ (để bốc) |
| inventory_batches, transactions | ALL | SELECT | SELECT/UPDATE qua RPC |
| stock_take_sessions | ALL (duyệt) | — | tạo/sửa draft của mình |
| audit_logs | SELECT | — | — |

> Custom JWT claim `role` set bằng trusted server-side mechanism (Supabase Auth Hook), validate `auth.uid()` + role trong policy.

### 3.5. Storage buckets + policies riêng: `medical-images`, `stock-evidence`, `prescription-scans`. Metadata ảnh lưu bảng `medical_files` (thay vì mảng URL rời rạc).

### 3.6. Realtime: kênh `prescriptions` (hàng đợi bốc thuốc) — private theo role; sau khi nhận event phải refetch (event có thể miss). Không broadcast dữ liệu nhạy cảm.

---

## 4. Luồng nghiệp vụ chính

### 4.1. Nhập kho
```
Phiếu draft → nhập dòng (vị, SL gram, đơn giá, HSD) → confirmed
 → tạo inventory_batches (batch_code bất biến) + transactions IMPORT
 → in mã vạch Code128
```

### 4.2. Khám → kê đơn → bốc thuốc (FEFO)
```
Chọn BN → lượt khám (triệu chứng + mạch 6 vị trí) → chốt chẩn đoán
 → kê đơn (từ bài mẫu/kê tay) → check tương kỵ real-time
 → critical: yêu cầu xác nhận trách nhiệm + lý do → audit
 → confirmed → hàng đợi realtime → SP tự phân bổ FEFO
 → nhân viên tick xác nhận từng lô → completed (1 transaction)
 → in đơn A5 → thanh toán tại quầy
```

### 4.3. Kiểm kho
```
Phiếu → quét mã vạch → nhập số thực tế → delta tự tính
 → auto-duyệt (ngưỡng % giá trị + <2% + hao hụt tự nhiên)
 → else chủ duyệt → SP cộng delta vào tồn hiện tại
```

---

## 5. Quyết định kiến trúc (ADR tóm tắt)

| # | Quyết định | Lý do |
|---|-----------|-------|
| 1 | FEFO thay vì FIFO | Dược liệu có HSD — lô hết hạn trước phải xuất trước |
| 2 | Đơn vị chuẩn gram | Tránh lỗi quy đổi khi bốc thuốc |
| 3 | Trừ kho synchronous trong PG | Không qua queue — cần atomic + phản hồi ngay |
| 4 | Không tách backend riêng | Giảm DevOps; API Routes đủ cho webhook/OCR sau này |
| 5 | Bỏ Inngest/QStash ở MVP | Over-engineering; scheduled jobs đủ cho alert/report |
| 6 | Giá snapshot lúc kê đơn | Đơn cũ không bị tính lại theo giá mới |
