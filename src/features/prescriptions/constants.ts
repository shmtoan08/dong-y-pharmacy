export type PrescriptionStatus = "draft" | "confirmed" | "completed" | "cancelled";

export const STATUS_LABEL: Record<PrescriptionStatus, string> = {
  draft: "Nháp",
  confirmed: "Đã chốt",
  completed: "Đã bốc thuốc",
  cancelled: "Đã hủy",
};

export const STATUS_STYLE: Record<PrescriptionStatus, string> = {
  draft: "bg-stone-200 text-stone-700",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-700",
};
