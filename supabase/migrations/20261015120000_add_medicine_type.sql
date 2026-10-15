-- Migration: thêm cột phân loại thuốc Bắc / thuốc Nam
ALTER TABLE herbs ADD COLUMN IF NOT EXISTS medicine_type TEXT
  CHECK (medicine_type IN ('bac', 'nam', 'ca_hai'));
COMMENT ON COLUMN herbs.medicine_type IS 'bac: thuốc Bắc (dược liệu Trung Hoa), nam: thuốc Nam (dược liệu Việt Nam), ca_hai: dùng trong cả hai truyền thống';
CREATE INDEX IF NOT EXISTS idx_herbs_medicine_type ON herbs(medicine_type);
