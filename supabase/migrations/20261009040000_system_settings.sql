-- Cai dat he thong
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO system_settings (key, value) VALUES
  ('clinic_name', 'ĐÔNG Y ĐƯỜNG'),
  ('clinic_address', ''),
  ('clinic_phone', ''),
  ('clinic_email', ''),
  ('prescription_footer', 'Chúc quý khách mau khỏe!')
ON CONFLICT (key) DO NOTHING;
