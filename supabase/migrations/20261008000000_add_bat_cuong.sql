-- Bát cương (8 nguyên tắc biện chứng): lưu 4 cặp đã chọn, cách nhau dấu phẩy
-- VD: "Biểu,Hàn,Hư,Âm"
ALTER TABLE visits ADD COLUMN IF NOT EXISTS bat_cuong TEXT;
