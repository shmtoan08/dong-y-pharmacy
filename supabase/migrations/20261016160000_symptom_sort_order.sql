-- Thứ tự nhóm triệu chứng (đầu -> chân + dấu hiệu Đông y) để checklist hiển thị theo luồng khám
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
UPDATE symptoms SET category = 'Khớp / Cơ xương' WHERE category = 'Khớp';
