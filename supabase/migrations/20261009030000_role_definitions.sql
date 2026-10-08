-- Vai tro tuy chinh
CREATE TABLE IF NOT EXISTS role_definitions (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO role_definitions (code, label, description, is_system) VALUES
  ('admin', 'Quản trị viên', 'Toàn quyền hệ thống', true),
  ('practitioner', 'Bác sĩ', 'Khám bệnh, chẩn đoán và kê đơn thuốc', true),
  ('dispenser', 'Dược sĩ', 'Duyệt đơn, bốc thuốc và quản lý kho', true)
ON CONFLICT (code) DO NOTHING;
