/** Danh sách quyền cố định trong code (client-safe) */
export const PERMISSIONS = [
  { key: "patients.view", label: "Xem bệnh nhân", group: "Bệnh nhân" },
  { key: "patients.create", label: "Thêm bệnh nhân", group: "Bệnh nhân" },
  { key: "patients.edit", label: "Sửa bệnh nhân", group: "Bệnh nhân" },
  { key: "visits.view", label: "Xem lượt khám", group: "Khám bệnh" },
  { key: "visits.create", label: "Tạo lượt khám", group: "Khám bệnh" },
  { key: "prescriptions.view", label: "Xem đơn thuốc", group: "Đơn thuốc" },
  { key: "prescriptions.create", label: "Kê đơn thuốc", group: "Đơn thuốc" },
  { key: "prescriptions.confirm", label: "Duyệt đơn thuốc", group: "Đơn thuốc" },
  { key: "prescriptions.dispense", label: "Phát thuốc", group: "Đơn thuốc" },
  { key: "formulas.view", label: "Xem bài thuốc", group: "Bài thuốc" },
  { key: "formulas.create", label: "Thêm bài thuốc", group: "Bài thuốc" },
  { key: "formulas.edit", label: "Sửa bài thuốc", group: "Bài thuốc" },
  { key: "herbs.view", label: "Xem dược liệu", group: "Dược liệu" },
  { key: "herbs.create", label: "Thêm dược liệu", group: "Dược liệu" },
  { key: "herbs.edit", label: "Sửa dược liệu", group: "Dược liệu" },
  { key: "inventory.view", label: "Xem kho", group: "Kho" },
  { key: "inventory.receive", label: "Nhập kho", group: "Kho" },
  { key: "appointments.view", label: "Xem lịch hẹn", group: "Lịch hẹn" },
  { key: "appointments.create", label: "Đặt lịch hẹn", group: "Lịch hẹn" },
  { key: "appointments.manage", label: "Quản lý lịch hẹn", group: "Lịch hẹn" },
  { key: "schedules.view", label: "Xem lịch làm việc", group: "Lịch hẹn" },
  { key: "finance.invoices.view", label: "Xem hóa đơn", group: "Tài chính" },
  { key: "finance.invoices.create", label: "Lập hóa đơn", group: "Tài chính" },
  { key: "finance.invoices.collect", label: "Thu tiền hóa đơn", group: "Tài chính" },
  { key: "finance.ledger.view", label: "Xem sổ quỹ", group: "Tài chính" },
  { key: "finance.ledger.create", label: "Lập phiếu thu/chi", group: "Tài chính" },
  { key: "reports.view", label: "Xem báo cáo", group: "Báo cáo" },
  { key: "admin.users.view", label: "Xem nhân viên", group: "Quản trị" },
  { key: "admin.users.manage", label: "Quản lý nhân viên", group: "Quản trị" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

/** Quyền mặc định cho từng role */
export const DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
  practitioner: [
    "patients.view", "patients.create", "patients.edit",
    "visits.view", "visits.create",
    "prescriptions.view", "prescriptions.create", "prescriptions.confirm",
    "formulas.view", "formulas.create", "formulas.edit",
    "herbs.view",
    "appointments.view", "appointments.create", "appointments.manage", "schedules.view",
  ],
  dispenser: [
    "prescriptions.view", "prescriptions.confirm", "prescriptions.dispense",
    "herbs.view", "herbs.create", "herbs.edit",
    "inventory.view", "inventory.receive",
    "finance.invoices.view", "finance.invoices.collect",
  ],
};
