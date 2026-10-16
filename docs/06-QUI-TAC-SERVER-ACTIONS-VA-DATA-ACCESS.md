# QUI TẮC CODE SERVER ACTIONS & DATA ACCESS LAYER

> **Áp dụng cho**: Toàn bộ dự án Web App Phòng Thuốc Đông Y (`dong-y-pharmacy`).  
> **Mục tiêu**: Ngăn chặn tình trạng code truy vấn SQL rải rác trong UI, loại bỏ file Action khổng lồ (God Files), chuẩn hóa ranh giới giữa Read (Query) và Write (Mutation), đảm bảo tính bảo mật và dễ viết kiểm thử.

---

## 1. Mô hình kiến trúc bắt buộc (Feature-Driven 3-Layer)

Mỗi phân hệ nghiệp vụ trong `src/features/[domain]/` **bắt buộc phải tuân theo cấu trúc phân tách trách nhiệm sau**:

```
src/features/[domain]/
├── schemas.ts       # Zod schemas validate dữ liệu (Client & Server)
├── types.ts         # Types, Interfaces, Constants, DTO
├── queries.ts       # CHUYÊN ĐỌC (Read-only Data Access) - TUYỆT ĐỐI KHÔNG CÓ "use server"
├── service.ts       # LOGIC NGHIỆP VỤ & TRANSACTION (FEFO, tính tiền, tương kỵ, trừ kho...)
└── actions.ts       # MUTATION HANDLER (Server Actions) - BẮT BUỘC CÓ "use server"
```

---

## 2. Quy tắc chi tiết từng thành phần

### 2.1. `queries.ts` — Tầng truy vấn dữ liệu (Read-only)

* **Mục đích**: Chuyên thực hiện các câu lệnh `SELECT`, tìm kiếm, lọc, phân trang để cung cấp dữ liệu cho Server Components (`page.tsx`).
* **Quy tắc bất biến**:
  1. ⛔ **TUYỆT ĐỐI KHÔNG khai báo `"use server"`** ở đầu file này.
  2. ✅ Các hàm là `async function`, luôn bắt đầu bằng kiểm tra quyền: `await requireRole(...)`.
  3. ✅ Nhận tham số là đối tượng thuần túy (primitive/object), ví dụ: `searchParams: { q?: string; page?: number }`.
  4. ✅ Luôn trả về dữ liệu đã định kiểu rõ ràng (Typed Return).

```ts
// src/features/patients/queries.ts
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import type { PatientRow, PatientFilterParams } from "./types";

export async function getPatients(params: PatientFilterParams): Promise<{
  rows: PatientRow[];
  total: number;
  totalPages: number;
}> {
  await requireRole("admin", "practitioner", "dispenser");
  
  // Logic ghép SQL SELECT, tính toán LIMIT / OFFSET
  // ...
  return { rows, total, totalPages };
}
```

---

### 2.2. `actions.ts` — Tầng Server Actions (Mutation / Write)

* **Mục đích**: Tiếp nhận các yêu cầu thay đổi dữ liệu từ Client (Form submit, nút bấm hành động, chuyển đổi trạng thái).
* **Quy tắc bất biến**:
  1. 🔴 **BẮT BUỘC có `"use server"`** ở dòng đầu tiên.
  2. ⛔ **CẤM EXPORT HÀM QUERY ĐỌC DỮ LIỆU TẠI ĐÂY**. Chỉ chứa các thao tác: `create*`, `update*`, `delete*`, `toggle*`, `confirm*`, `dispense*`, `cancel*`.
  3. ✅ **Quy trình chuẩn 5 bước trong 1 Server Action**:
     - **Bước 1**: Kiểm tra quyền (`await requireRole(...)`).
     - **Bước 2**: Validate dữ liệu đầu vào bằng Zod schema (`schema.safeParse`).
     - **Bước 3**: Gọi logic xử lý từ `service.ts` hoặc thực thi transaction DB (`withTransaction`).
     - **Bước 4**: Ghi nhật ký kiểm toán (`await audit(...)`).
     - **Bước 5**: Làm mới cache (`revalidatePath(...)`) và trả về kết quả chuẩn hoặc `redirect()`.
  4. ✅ **Chuẩn hóa kiểu trả về (Return Type)**:
     ```ts
     export type ActionState<T = unknown> = {
       ok?: boolean;
       data?: T;
       error?: string;
       code?: string;
     };
     ```

```ts
// src/features/patients/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { patientSchema } from "./schemas";
import { createPatientRecord } from "./service";
import type { ActionState } from "./types";

export async function createPatient(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");

  // 1. Validate Zod
  const parsed = patientSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  try {
    // 2. Gọi Domain Service
    const patient = await createPatientRecord(parsed.data, user.id);

    // 3. Ghi audit
    await audit({
      userId: user.id,
      action: "CREATE_PATIENT",
      tableName: "patients",
      rowId: patient.id,
      newValue: patient,
    });

    // 4. Revalidate
    revalidatePath("/patients");
    return { ok: true, data: patient };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
    return { ok: false, error: message };
  }
}
```

---

### 2.3. `service.ts` — Tầng nghiệp vụ lâm sàng (Domain Business Logic)

* **Mục đích**: Chứa toàn bộ tính toán cốt lõi, thuật toán YHCT và các giao dịch cơ sở dữ liệu quan trọng.
* **Quy tắc bất biến**:
  1. ⛔ **KHÔNG phụ thuộc vào giao thức web**: Không nhận `FormData`, không dùng `headers()`, không gọi `redirect()`.
  2. ✅ Là các hàm thuần TypeScript nhận dữ liệu đã được validate.
  3. ✅ Mọi thao tác đổi kho, duyệt đơn, tạo mã phiếu phải chạy trong `withTransaction(async (tx) => { ... })`.

---

## 3. Quy tắc cho UI Layer (`src/app/(dashboard)/*`)

1. ⛔ **CẤM `import { db } from "@/lib/db"` trong bất kỳ file `page.tsx` hay component UI nào**.
2. ✅ **Cách hoạt động chuẩn của `page.tsx` (Server Component)**:
   ```tsx
   // src/app/(dashboard)/patients/page.tsx
   import { getPatients } from "@/features/patients/queries";
   import { PatientTable } from "./PatientTable";
   
   export default async function PatientsPage({
     searchParams,
   }: {
     searchParams: Promise<{ q?: string; page?: string }>;
   }) {
     const sp = await searchParams;
     // Chỉ gọi Query function, không viết SQL trong page
     const { rows, total, totalPages } = await getPatients({
       q: sp.q,
       page: Number(sp.page) || 1,
     });
   
     return <PatientTable data={rows} total={total} totalPages={totalPages} />;
   }
   ```
3. ✅ **Cách hoạt động chuẩn của Client Form**:
   - Sử dụng `useActionState` kết hợp Server Action từ `actions.ts`.
   - Disable nút submit khi đang tải (`isPending`).
   - Hiển thị toast thông báo qua thư viện `sonner`.

---

## 4. Phân định: Khi nào dùng API Route (`src/app/api/*`)?

| Nghiệp vụ | Dùng Server Action (`actions.ts`) | Dùng API Route (`route.ts`) |
| :--- | :---: | :---: |
| Form submit từ giao diện Dashboard (Tạo/Sửa/Xóa) | ✅ Bắt buộc | ❌ Không dùng |
| Bấm nút hành động (Bốc thuốc, Duyệt đơn, Đổi trạng thái) | ✅ Bắt buộc | ❌ Không dùng |
| API công khai cho bệnh nhân tra cứu (không cần login) | ❌ Không dùng | ✅ Bắt buộc (`/api/public/*`) |
| Xuất dữ liệu tải về (Download file Excel / CSV / PDF) | ❌ Không dùng | ✅ Bắt buộc (`/api/patients/export`) |
| Webhook từ bên thứ ba (Cổng thanh toán, Zalo ZNS) | ❌ Không dùng | ✅ Bắt buộc (`/api/webhooks/*`) |

---

## 5. Checklist nghiệm thu (Definition of Done cho Agent)

Trước khi kết thúc việc phát triển một chức năng mới, Agent bắt buộc phải tự kiểm tra danh sách sau:

- [ ] Trong file `page.tsx` không có dòng `import { db } from "@/lib/db"`.
- [ ] Không có câu lệnh SQL `SELECT/INSERT/UPDATE` nào nằm trong thư mục `src/app/`.
- [ ] Mọi hàm đọc dữ liệu nằm trong `queries.ts` (không có `"use server"`).
- [ ] File `actions.ts` chỉ chứa các hàm Mutation có gắn `"use server"`.
- [ ] Đã validate dữ liệu đầu vào bằng Zod schema từ `schemas.ts`.
- [ ] Đã kiểm tra quyền bằng `await requireRole(...)` ở mọi hàm entry point.
- [ ] Các thao tác tài chính, trừ kho, hủy đơn được bọc trong `withTransaction`.
- [ ] Đã ghi `audit(...)` cho các thao tác sửa/xóa/tạo dữ liệu quan trọng.
- [ ] Chạy lệnh `npx tsc --noEmit` pass 100% không có lỗi.
- [ ] Chạy lệnh `npx eslint [files]` pass 100% không có lỗi.
