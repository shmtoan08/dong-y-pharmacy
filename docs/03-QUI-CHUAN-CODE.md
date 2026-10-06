# QUI CHUẨN CODE — Web App Phòng Thuốc Đông Y

> Phiên bản: 1.1 — Ngày: 2026-10-06
> Cập nhật sau review của ChatGPT (vai trò tech lead).
> Stack: Next.js 14+ (App Router) · TypeScript · Tailwind CSS · Shadcn/ui · Supabase

---

## 1. Ba lớp quy tắc (tách rõ)

| Lớp | Phạm vi | Ví dụ |
|-----|---------|-------|
| **Code standard** | Cách viết code | Không dùng `any`, absolute import `@/`, Prettier |
| **Business invariant** | Quy tắc nghiệp vụ bất biến | Mọi sửa đơn/kho phải ghi audit; tồn kho chỉ đổi qua SQL function |
| **Process** | Quy trình làm việc | PR bắt buộc; CI green mới merge; tsc pass trước khi push |

---

## 2. Code standard

### 2.1. TypeScript & lint
- `strict: true`; **cấm `any`** (trừ bất khả kháng → comment lý do + `// eslint-disable-next-line` có giải thích).
- Bắt buộc **ESLint** (`next/core-web-vitals`, `@typescript-eslint`) + **Prettier**; CI check cả hai.
- Chốt **pnpm** (lockfile `pnpm-lock.yaml` bắt buộc); Node version qua `.nvmrc`.

### 2.2. Import & cấu trúc
- **Absolute import `@/` bắt buộc**; cấm relative `../../../`.
- Dependency direction: `app/*` → `features/*` → `lib/*`; **cấm import ngược**, cấm circular (check bằng `madge` trong CI).
- Đổi `features/fifo-inventory/` → `features/fefo-inventory/` (đã chốt FEFO).
- File dùng supabase server/service-role client phải `import 'server-only'` → build fail nếu lọt sang client.

### 2.3. Đặt tên

| Đối tượng | Quy ước | Ví dụ |
|-----------|---------|-------|
| Bảng DB | `snake_case` số nhiều | `prescription_items` |
| Cột / Enum / Function SQL | `snake_case` | `weight_per_pack`, `process_prescription_fefo` |
| Biến / hàm TS | `camelCase` | `weightPerPack` |
| Component / Type | `PascalCase` | `PrescriptionBuilder` |
| Hằng số | `UPPER_SNAKE` | `EXPIRY_WARNING_DAYS` |
| File component | `PascalCase.tsx` | `PulseInputForm.tsx` |
| File hook | `useXxx.ts` | `useBarcodeScanner.ts` |

### 2.4. Server/Client boundary
- Mặc định là **Server Component**. Chỉ dùng `'use client'` cho: form interactivity, realtime subscription, barcode scanner, print, toast.
- **CẤM business logic trong component**: không tính tiền/thuốc trong component — mọi tính toán nằm ở Server Action / Domain service / SQL function. Component chỉ render.

### 2.5. Supabase — quy tắc 3 clients
| Client | Dùng khi |
|--------|----------|
| Browser client | Component client (read qua RLS) |
| Server client | Server Component / Server Action (theo user hiện tại) |
| Service-role (admin) | Chỉ ở server, qua `lib/supabase/admin.ts` (`server-only`); mọi admin op phải có authz check |

**Cấm service_role ở client** dưới mọi hình thức.

### 2.6. Xử lý số thập phân & tiền
- `NUMERIC` từ DB trả về **string** → dùng `decimal.js`, **cấm `Number()` trực tiếp**.
- Quy tắc làm tròn: làm tròn ở **DB** (trong SP), `half-up`, 2 chữ số cho tiền, 2 chữ số cho gram. Thống nhất toàn hệ thống.

### 2.7. Validation
- Mọi form: **React Hook Form + Zod**.
- **Zod schema tách 2 lớp**: schema client (UX) và schema server action (bảo mật) — không reuse mù quáng.
- **Runtime validation ở boundary**: validate tại entry của Server Action, không tin client.

---

## 3. Business invariant (bất biến)

1. **Tồn kho chỉ thay đổi qua SQL function** (`process_prescription_fefo`, `approve_stock_take_session`, ...). Frontend không được tính lại tồn kho.
2. **Audit log append-only**: ghi trong **cùng transaction** với nghiệp vụ; `REVOKE UPDATE, DELETE ON audit_logs`.
3. **Transaction boundary**: bốc thuốc, duyệt kiểm kho, hủy đơn có hoàn kho → phải atomic (1 transaction, rollback toàn bộ khi lỗi).
4. **Idempotency**: mọi action trừ kho / tạo đơn / duyệt phiếu phải có `idempotency_key` → chống double-submit và retry trùng.
5. **State machine**: chuyển trạng thái đơn (`draft→confirmed→dispensing→completed/cancelled`) và phiếu kiểm kho **chỉ qua function**, cấm UPDATE trực tiếp.
6. **Race condition**: trừ kho dùng `SELECT ... FOR UPDATE` + re-check số lượng sau lock.
7. **Optimistic locking** cho phiếu kiểm kho: `version` column, reject nếu version cũ.

---

## 4. Error handling & UX

1. Server Action / RPC trả về `{ data, error }` với **error code chuẩn** (vd: `PRESCRIPTION_NOT_FOUND`, `INSUFFICIENT_STOCK`, `INTERACTION_CRITICAL`, `BATCH_EXPIRED`) — không message tự do, không lộ chi tiết DB.
2. Toast rõ ràng; loading state cho mọi async; **disable nút khi submit** (kết hợp idempotency key).
3. Cảnh báo tương kỵ: 🔴 critical = chặn + yêu cầu xác nhận trách nhiệm + lý do bắt buộc; 🟡 warning = hiện rõ, cho qua.
4. Dữ liệu in ấn là **snapshot tại thời điểm in** (không in từ state realtime có thể đã đổi). Khổ giấy: A5 (đơn/biên lai), nhãn Code128.
5. Barcode scanner: xử lý quét lỗi / trùng / không tìm thấy mã; timeout; chống double-trigger.
6. Realtime: sau khi nhận event phải **refetch** (event có thể miss); không broadcast dữ liệu nhạy cảm; private channel theo role.

---

## 5. Database & migration

1. Mọi thay đổi schema qua **migration có timestamp**; cấm sửa tay production.
2. **Migration conflict**: 2 branch cùng tạo migration → rebase + rename theo timestamp mới nhất; cấm sửa migration đã merge vào main.
3. **Destructive change** (DROP COLUMN/TABLE): 2 bước (deprecated → remove), kèm rollback plan.
4. Migration mới phải **apply được từ DB trống** (CI check).
5. **Cấm `db reset` trên production**. Phân loại seed: dev seed vs prod seed (clinical knowledge có version riêng).
6. RLS bật mọi bảng user data; policy theo ma trận role (xem tài liệu hệ thống §3.4).

---

## 6. Testing strategy (4 tầng)

| Tầng | Phạm vi | Ví dụ |
|------|---------|-------|
| Unit | Logic thuần | Tính delta kiểm kho, parse mã vạch |
| Integration | Server Action + DB test | Tạo phiếu nhập → lô được tạo đúng |
| E2E | Luồng nghiệp vụ | Kê đơn → bốc thuốc → tồn kho giảm đúng |
| Security | RLS matrix | Mỗi role × mỗi bảng × CRUD → đúng allow/deny (pgTAP hoặc script) |

- **Race condition test bằng script** (2 session cùng bốc), không test tay.
- Migration phải test rollback được.
- Nguyên tắc: **không merge logic business-critical nếu không có test**.

---

## 7. CI/CD (pipeline tối thiểu)

```
PR → tsc --noEmit → eslint → prettier --check → unit test
   → migration check (apply từ DB trống) → next build → ✅ mới merge
```

- `pnpm audit` trong CI; Dependabot bật.
- Security headers (CSP, HSTS...) qua `next.config`.

---

## 8. Secrets & env

1. Phân loại: `NEXT_PUBLIC_*` (public) vs server-only. **Cấm `NEXT_PUBLIC_` cho secret**.
2. Service-role key chỉ ở server (Vercel env / Supabase secrets).
3. Cấm log secret; error log phải redact.
4. Liệt kê biến env bắt buộc trong `.env.example` (không commit `.env`).

---

## 9. Code review process

1. **PR bắt buộc** cho mọi merge vào `main`; cấm push trực tiếp.
2. PR template: mô tả thay đổi, ảnh hưởng nghiệp vụ, có migration không, checklist business invariant.
3. Thay đổi business-critical (FEFO, audit, RLS, interaction check) cần **2 reviewer**.
4. `CODEOWNERS` cho thư mục nhạy cảm (`supabase/migrations/`, `features/fefo-inventory/`).

---

## 10. Git workflow

```
main                        # production — chỉ merge khi Tony duyệt
feature/<ten-ngan-gon>      # vd: feature/herb-crud
```

- Commit: `<loại>: <mô tả>` — vd: `feat: thêm màn hình phiếu nhập kho`, `fix: sửa lỗi trừ kho FEFO`.
- **Không merge vào `main` khi chưa có phê duyệt rõ ràng.**

---

## 11. Definition of Done (checklist trước khi báo hoàn thành)

**Code:**
- [ ] `tsc --noEmit` pass, ESLint + Prettier pass, CI green
- [ ] Không `any` không lý do, không `console.log` debug, không code chết
- [ ] Absolute import `@/`, đúng dependency direction

**Database:**
- [ ] Migration apply được từ DB trống; rollback test OK (nếu destructive)
- [ ] RLS test matrix pass cho role liên quan
- [ ] Index cho FK/cột lọc mới

**Business-critical (nếu chạm):**
- [ ] Có test (unit/integration/E2E) cho logic mới
- [ ] Race condition test pass (trừ kho, kiểm kho)
- [ ] Audit log ghi đúng trong cùng transaction
- [ ] Idempotency key hoạt động (thử double-submit)

**Review & deploy:**
- [ ] PR mở, đủ reviewer theo mức risk, business invariant checklist tick đủ
- [ ] `next build` OK; env verified; smoke test sau deploy
