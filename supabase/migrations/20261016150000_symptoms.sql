-- Từ điển triệu chứng + bảng nối bệnh án <-> triệu chứng (phục vụ màn hình chẩn đoán)
CREATE TABLE IF NOT EXISTS symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Khác',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinical_case_symptoms (
  case_id UUID NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,
  symptom_id UUID NOT NULL REFERENCES symptoms(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, symptom_id)
);
CREATE INDEX IF NOT EXISTS idx_case_symptoms_symptom ON clinical_case_symptoms(symptom_id);

-- Seed triệu chứng từ ca Viêm đa khớp dạng thấp (Thấp nhiệt đọng lại ở khớp)
INSERT INTO symptoms (name, category) VALUES
  ('Sưng khớp', 'Khớp'),
  ('Đau khớp', 'Khớp'),
  ('Đau khớp chân', 'Khớp'),
  ('Đi lại khó khăn', 'Khớp'),
  ('Phát sốt', 'Toàn thân'),
  ('Chán ăn', 'Toàn thân'),
  ('Sắc mặt vàng đỏ', 'Sắc mặt'),
  ('Môi đỏ sẫm', 'Môi'),
  ('Lưỡi đỏ sẫm', 'Lưỡi'),
  ('Rêu lưỡi trắng', 'Lưỡi'),
  ('Gốc lưỡi hơi vàng', 'Lưỡi'),
  ('Mạch tế', 'Mạch'),
  ('Mạch sác', 'Mạch'),
  ('Mạch nhu', 'Mạch')
ON CONFLICT (name) DO NOTHING;
