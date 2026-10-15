-- Migration: bảng nhóm thuốc + thêm cột image_url, preparation, usage vào herbs
-- Theo Thông tư 05/2015/TT-BYT: 349 vị thuốc chia thành 30 nhóm

-- 1. Bảng nhóm thuốc
CREATE TABLE IF NOT EXISTS herb_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,              -- G01..G30
  name TEXT NOT NULL,                     -- Tên nhóm (đầy đủ như trong Thông tư)
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_herb_groups_code ON herb_groups(code);

-- 2. Seed 30 nhóm
INSERT INTO herb_groups (code, name, sort_order) VALUES
  ('G01', 'Nhóm hồi dương cứu nghịch', 1),
  ('G02', 'Nhóm phát tán phong hàn', 2),
  ('G03', 'Nhóm phát tán phong nhiệt', 3),
  ('G04', 'Nhóm phát tán phong thấp', 4),
  ('G05', 'Nhóm thanh nhiệt giải thử', 5),
  ('G06', 'Nhóm thanh nhiệt giải độc', 6),
  ('G07', 'Nhóm thanh nhiệt lương huyết', 7),
  ('G08', 'Nhóm thanh nhiệt táo thấp', 8),
  ('G09', 'Nhóm thanh nhiệt tả hỏa', 9),
  ('G10', 'Nhóm thuốc an thần', 10),
  ('G11', 'Nhóm thuốc bình can tức phong', 11),
  ('G12', 'Nhóm thuốc bổ dương', 12),
  ('G13', 'Nhóm thuốc bổ huyết', 13),
  ('G14', 'Nhóm thuốc bổ khí', 14),
  ('G15', 'Nhóm thuốc bổ âm', 15),
  ('G16', 'Nhóm thuốc chỉ huyết', 16),
  ('G17', 'Nhóm thuốc chỉ khái bình suyễn', 17),
  ('G18', 'Nhóm thuốc dùng ngoài', 18),
  ('G19', 'Nhóm thuốc hoạt huyết, khứ ứ', 19),
  ('G20', 'Nhóm thuốc hành khí', 20),
  ('G21', 'Nhóm thuốc hóa thấp tiêu đạo', 21),
  ('G22', 'Nhóm thuốc khai khiếu', 22),
  ('G23', 'Nhóm thuốc thu liễm, cố sáp', 23),
  ('G24', 'Nhóm thuốc thẩm thấp lợi thủy', 24),
  ('G25', 'Nhóm thuốc trị giun sán', 25),
  ('G26', 'Nhóm thuốc trục thủy', 26),
  ('G27', 'Nhóm thuốc trừ hàn', 27),
  ('G28', 'Nhóm thuốc trừ đàm', 28),
  ('G29', 'Thuốc an thai', 29),
  ('G30', 'Thuốc tả hạ, nhuận hạ', 30)
ON CONFLICT (code) DO NOTHING;

-- 3. Thêm cột vào herbs
ALTER TABLE herbs ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE herbs ADD COLUMN IF NOT EXISTS preparation TEXT;  -- Cách bào chế
ALTER TABLE herbs ADD COLUMN IF NOT EXISTS usage TEXT;        -- Cách dùng
ALTER TABLE herbs ADD COLUMN IF NOT EXISTS herb_group_id UUID REFERENCES herb_groups(id);

CREATE INDEX IF NOT EXISTS idx_herbs_group ON herbs(herb_group_id);

COMMENT ON COLUMN herbs.image_url IS 'URL ảnh vị thuốc';
COMMENT ON COLUMN herbs.preparation IS 'Cách bào chế (sao, tẩm, phơi khô...)';
COMMENT ON COLUMN herbs.usage IS 'Cách dùng (sắc uống, dùng ngoài, ngâm rượu...)';
COMMENT ON COLUMN herbs.herb_group_id IS 'Nhóm thuốc theo Thông tư 05/2015/TT-BYT';
