# KẾ HOẠCH REFACTOR KIẾN TRÚC MÃ NGUỒN — DONG-Y-PHARMACY

> **Mục tiêu**: Chuẩn hóa toàn bộ mã nguồn theo tài liệu **[06-QUI-TAC-SERVER-ACTIONS-VA-DATA-ACCESS.md](./06-QUI-TAC-SERVER-ACTIONS-VA-DATA-ACCESS.md)**.  
> **Nguyên tắc**: Tái cấu trúc tiệm tiến (Incremental Refactoring) — làm đến đâu kiểm tra chắc đến đó (`tsc --noEmit` & ESLint pass 100%), tuyệt đối không làm gián đoạn các chức năng đang vận hành.
> **Trạng thái**: 🎉 **HOÀN THÀNH 100% (CẢ 4 GIAI ĐOẠN)**

---

## 1. Hiện trạng & Kết quả sau Refactor

| Tiêu chí | Trước khi Refactor | Sau khi hoàn tất Refactor |
| :--- | :--- | :--- |
| **Import `db` trong `src/app`** | **27 file** (16 trang `page.tsx` + 10 API routes + auth) | **0 file** (100% sạch hoàn toàn) |
| **Kích thước file Actions** | `prescriptions/actions.ts` > 1.050 dòng (God file) | **360 dòng** (chỉ chứa mutation handlers) |
| **Phân tách tầng Data Access** | SQL SELECT viết rải rác khắp UI pages và API routes | Tập trung 100% trong các module `queries.ts` chuyên biệt |
| **Phân tách tầng Nghiệp vụ** | Logic FEFO, bốc số, đặt lịch lồng trong route handler | Đóng gói trong các Domain Services (`service.ts`) thuần túy |
| **Chuẩn hóa Server Action State** | Định dạng tự do, thiếu nhất quán giữa các forms | Chuẩn hóa toàn bộ qua Unified `ActionState<T>` |
| **TypeScript & Linting Gate** | Nguy cơ lọt lỗi do ép kiểu ngầm `any` | `tsc --noEmit` pass 100%, ESLint 0 error, 0 warning |

---

## 2. Kết quả nghiệm thu theo 4 giai đoạn

```
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1: Danh mục & Bệnh nhân (Hoàn thành 100%)                    │
│ • patients, herbs, formulas, clinical-cases                            │
├────────────────────────────────────────────────────────────────────────┤
│ GIAI ĐOẠN 2: Khám bệnh & Kê đơn (Hoàn thành 100%)                      │
│ • visits, prescriptions (tách file 1.050 dòng thành 3 lớp)             │
├────────────────────────────────────────────────────────────────────────┤
│ GIAI ĐOẠN 3: Kho thuốc, Tài chính & Quản trị (Hoàn thành 100%)         │
│ • inventory (stock-*), finance, appointments, schedules, admin         │
├────────────────────────────────────────────────────────────────────────┤
│ GIAI ĐOẠN 4: Chuẩn hóa API Routes & Đồng bộ Return Type (Hoàn thành)   │
│ • api/public/*, api/internal/*, auth, chuẩn hóa ActionState<T>         │
└────────────────────────────────────────────────────────────────────────┘
```

---

### GIAI ĐOẠN 1: Danh mục & Bệnh nhân — ✅ HOÀN THÀNH
*Đặc điểm: Nghiệp vụ độc lập, tần suất đọc cao, ít phụ thuộc chéo.*

| Module | File tạo mới / Tách ra | File đã dọn dẹp | Nhiệm vụ đã hoàn thành |
| :--- | :--- | :--- | :--- |
| **`patients`** | `features/patients/queries.ts` | `app/(dashboard)/patients/page.tsx` | Chuyển toàn bộ SQL SELECT, phân trang, đếm total vào `getPatientsList()`. Xóa bỏ `import { db }`. |
| **`herbs`** | `features/herbs/queries.ts` | `features/herbs/actions.ts`<br>`app/(dashboard)/herbs/page.tsx` | Chuyển `searchHerbs`, `getHerb`, `getHerbAliases`, `getMappings` sang `queries.ts`. Dọn dẹp SQL trong `herbs/page.tsx`. |
| **`formulas`** | `features/formulas/queries.ts` | `features/formulas/actions.ts`<br>`app/(dashboard)/formulas/page.tsx` | Tách `getFormulasList`, `getFormulaDetail` sang `queries.ts`. Dọn dẹp SQL trong `formulas/page.tsx`. |
| **`clinical-cases`** | `features/clinical-cases/queries.ts` | `features/clinical-cases/actions.ts`<br>`app/(dashboard)/clinical-cases/page.tsx` | Tách `getAllSymptoms`, `diagnoseCases`, `getClinicalCasesList` sang `queries.ts`. Dọn dẹp `clinical-cases/page.tsx`. |

**Checklist nghiệm thu Giai đoạn 1**:
- [x] 4 module trên không còn dòng `import { db } from "@/lib/db"` trong các file `page.tsx`.
- [x] Chạy `npx tsc --noEmit` pass 100%.
- [x] Test các màn hình: Danh sách bệnh nhân, Danh mục vị thuốc, Bài thuốc mẫu, Màn hình chẩn đoán hoạt động bình thường.

---

### GIAI ĐOẠN 2: Khám bệnh & Kê đơn — ✅ HOÀN THÀNH
*Đặc điểm: Rủi ro cao, liên quan đến an toàn dùng thuốc, thuật toán FEFO và kho dữ liệu.*

#### Tái cấu trúc file `features/prescriptions/actions.ts` (> 1.050 dòng $\rightarrow$ 360 dòng):
Tách thành 4 file chuyên biệt:
1. **`features/prescriptions/types.ts`**: Toàn bộ interfaces, DTO, trạng thái đơn thuốc (`PrescriptionStatus`), kiểu dữ liệu `ActionState`.
2. **`features/prescriptions/queries.ts`**:
   - `getPrescription(id)`
   - `getPrescriptionSnapshot(id)`
   - `getPrescriptionsList(filters)`
   - `getActiveTemplatesForPrescription()`
   - `getTemplateItemsForPrescription(templateId)`
3. **`features/prescriptions/service.ts`** *(Domain logic & SQL Transaction)*:
   - `dispensePrescriptionFefo(prescriptionId, userId, idempotencyKey)`
   - `checkHerbInteractions(herbIds)`
   - `validateDosageLimits(items)`
   - `calculatePrescriptionTotal(items, numOfPacks)`
4. **`features/prescriptions/actions.ts`** *(Chỉ Mutation - Có `"use server"`)*:
   - `createPrescriptionDraft`
   - `confirmPrescription`
   - `dispensePrescription`
   - `cancelPrescription`

#### Tái cấu trúc Module `visits`:
- Tách `features/visits/queries.ts` chứa `getVisitsList()`, `getVisitDetail()`, `getPulsePatterns()`.
- Dọn dẹp SQL trong `src/app/(dashboard)/visits/page.tsx` và `src/app/(dashboard)/visits/new/page.tsx`.

**Checklist nghiệm thu Giai đoạn 2**:
- [x] File `prescriptions/actions.ts` giảm từ 1.050 dòng xuống còn 360 dòng.
- [x] Không còn `import { db }` trong `prescriptions/page.tsx`, `prescriptions/new/page.tsx`, `visits/page.tsx`.
- [x] Test luồng nghiệp vụ: Tạo lượt khám $\rightarrow$ Kê đơn $\rightarrow$ Duyệt đơn $\rightarrow$ Bốc thuốc trừ kho FEFO $\rightarrow$ In đơn thuốc A5.

---

### GIAI ĐOẠN 3: Kho thuốc, Tài chính & Quản trị — ✅ HOÀN THÀNH
*Đặc điểm: Các phân hệ nghiệp vụ quản lý tài sản, dòng tiền và người dùng.*

| Phân hệ | Nhiệm vụ tái cấu trúc |
| :--- | :--- |
| **`inventory`** (`stock-*`) | Tách `features/inventory/queries.ts` (`listReceipts`, `getReceipt`, `listLots`, `getLotDetail`, `getLotHistory`, `getLotMovements`, `listStockChecks`, `getStockCheck`). Dọn dẹp 9 trang `stock-receipts/*`, `stock-lots/*`, `stock-checks/*`. |
| **`finance`** | Tách `features/finance/queries.ts` (`listInvoices`, `getInvoice`, `getInvoiceKpi`, `getSupplierDebt`, `getLedger`, `getManualTransaction`). Dọn dẹp 5 trang `finance/invoices/*`, `finance/ledger/*`. |
| **`appointments` & `schedules`** | Tách `features/appointments/queries.ts` (`listAppointments`, `getTodayStats`, `getAppointmentPractitioners`, `getTodayQueue`, `getOnlineBookings`). Dọn dẹp `appointments/page.tsx`, `appointments/queue/page.tsx`, `appointments/online/page.tsx`. |
| **`admin` & Dashboard** | Tách `features/users/queries.ts` (`listStaff`, `getStaffById`, `getActivePractitioners`). Tách `features/reports/queries.ts` (`getDashboardOverview`, `getRevenueKpi`). Dọn dẹp `admin/staff/*` và `(dashboard)/page.tsx`. |

**Checklist nghiệm thu Giai đoạn 3**:
- [x] Hoàn tất xóa bỏ toàn bộ `import { db }` trong toàn bộ 16 file `page.tsx` của `src/app/(dashboard)`.
- [x] `tsc --noEmit` pass 100%.

---

### GIAI ĐOẠN 4: Chuẩn hóa API Routes & Đồng bộ Return Type — ✅ HOÀN THÀNH

1. **Chuẩn hóa API Routes (`src/app/api/*`)**:
   - `api/internal/pending-bookings/route.ts` $\rightarrow$ gọi `countPendingBookings`.
   - `api/public/clinic-status/route.ts` $\rightarrow$ gọi `getPublicClinicStatus`.
   - `api/public/appointments/lookup/route.ts` $\rightarrow$ gọi `lookupAppointmentsByPhone`.
   - `api/public/slots/route.ts` $\rightarrow$ gọi `getActivePractitioners` và `getPublicSlotBookings`.
   - `api/public/appointments/route.ts` $\rightarrow$ ủy quyền cho `bookPublicAppointment` trong `features/appointments/service.ts`.
   - `api/public/queue/route.ts` $\rightarrow$ ủy quyền cho `issuePublicQueueNumber` trong `features/appointments/service.ts`.
   - `api/patients/export/route.ts` $\rightarrow$ gọi `getPatientsExportData`.
   - `api/public/patients/lookup/route.ts` $\rightarrow$ gọi `lookupPatientByCode`.
   - `api/public/doctors/route.ts` $\rightarrow$ gọi `getPublicDoctors`.
   - `api/public/clinic-info/route.ts` $\rightarrow$ gọi `getPublicClinicInfo`.
   - `(auth)/login/actions.ts` $\rightarrow$ gọi `getUserForAuth`.
2. **Chuẩn hóa kiểu trả về Server Action (Unified ActionState)**:
   - Tạo file chuẩn hóa `src/types/action-state.ts` (`ActionState<T>`, `ActionResult<T>`, `actionSuccess`, `actionError`).
   - Re-export và đồng bộ tại toàn bộ các module: `patients`, `herbs`, `formulas`, `clinical-cases`, `visits`, `prescriptions`, `users`, `inventory`, `suppliers`.

**Checklist nghiệm thu Giai đoạn 4**:
- [x] Toàn bộ thư mục `src/app/api` và `src/app` không còn bất kỳ dòng `import { db }` nào.
- [x] `npx tsc --noEmit` pass 100% (0 error).
- [x] `npx eslint` pass 100% (0 error, 0 warning).

---

## 3. Kiến trúc hệ thống sau hoàn thiện

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER (Giao diện & Điểm tiếp nhận yêu cầu)                      │
│ - Server Components (app/(dashboard)/**/page.tsx): Render UI thuần túy     │
│ - Client Components (*.tsx): State, form interaction, toast qua sonner      │
│ - Route Handlers (app/api/**/route.ts): HTTP Auth, validation, JSON response│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│ APPLICATION & DOMAIN SERVICES        │  │ DATA ACCESS LAYER (QUERIES)       │
│ (*.service.ts / actions.ts)          │  │ (*.queries.ts - KHÔNG "use server")│
│ - Mutations, DB Transactions         │  │ - SQL SELECT chuyên biệt          │
│ - Thuật toán FEFO, bốc số hàng đợi   │  │ - Phân trang, lọc, search, KPI    │
│ - Tương tác thuốc, liều lượng tối đa │  │ - Map DTO strongly-typed          │
└──────────────────┬───────────────────┘  └─────────────────┬─────────────────┘
                   │                                        │
                   └──────────────────┬─────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ DATABASE ACCESS LAYER (@/lib/db.ts)                                         │
│ - PostgreSQL Connection Pool (pg.Pool)                                      │
│ - Transaction Manager (withTransaction)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Cam kết chất lượng đã đạt được (Quality Gate)

1. `git grep "from ['\"]@/lib/db['\"]" src/app` $\rightarrow$ **0 file** (Đạt chuẩn 100%).
2. `npx tsc --noEmit` $\rightarrow$ **0 error** (Đạt chuẩn 100%).
3. `npx eslint src/app src/features` $\rightarrow$ **0 error, 0 warning** (Đạt chuẩn 100%).
