/**
 * Chuẩn hóa tên vị thuốc thành canonical key.
 * Vd: "Hoàng Kỳ" → "hoang-ky", "Đương Quy (sao)" → "duong-quy-sao"
 * Dùng từ MVP-1 làm identity hint cho migrate sang herb_id ở MVP-3.
 * Pure function — dùng được cả client lẫn server.
 */
export function normalizeHerbKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "") // bỏ ký tự đặc biệt
    .trim()
    .replace(/[\s_]+/g, "-") // khoảng trắng → gạch ngang
    .replace(/-+/g, "-") // gộp gạch ngang liên tiếp
    .replace(/^-|-$/g, ""); // bỏ gạch đầu/cuối
}
