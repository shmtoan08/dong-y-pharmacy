-- MVP-3: Danh mục vị thuốc (chuẩn hóa)
-- herbs + herb_aliases + herb_migration_mappings

-- Sequence cho mã vị thuốc VT-0001
CREATE SEQUENCE IF NOT EXISTS herb_code_seq START 1;

CREATE TABLE herbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                       -- VT-0001
  name_common TEXT NOT NULL,                       -- Tên thường gọi
  canonical_key TEXT UNIQUE NOT NULL,              -- herb_name_key(name_common)
  name_han_viet TEXT,                              -- Tên Hán Việt
  name_science TEXT,                               -- Tên khoa học
  used_part TEXT,                                  -- Bộ phận dùng
  property_tinh TEXT,                              -- Tính
  property_vi TEXT,                                -- Vị
  quy_kinh TEXT[],                                 -- Quy kinh
  cong_nang TEXT,                                  -- Công năng
  base_unit TEXT NOT NULL DEFAULT 'gram',
  is_valuable BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_herbs_canonical_key ON herbs(canonical_key);
CREATE INDEX idx_herbs_name_common ON herbs(name_common);
CREATE INDEX idx_herbs_active ON herbs(is_active) WHERE is_active = true;

CREATE TABLE herb_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  herb_id UUID NOT NULL REFERENCES herbs(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  alias_key TEXT NOT NULL UNIQUE,                  -- globally unique
  UNIQUE (herb_id, alias_key)
);
CREATE INDEX idx_herb_aliases_herb ON herb_aliases(herb_id);
CREATE INDEX idx_herb_aliases_key ON herb_aliases(alias_key);

CREATE TABLE herb_migration_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text TEXT NOT NULL,
  normalized_key TEXT NOT NULL,
  herb_id UUID REFERENCES herbs(id),
  confidence NUMERIC(3,2),
  status TEXT CHECK (status IN ('pending','confirmed','rejected')) DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (source_text, normalized_key)
);
CREATE INDEX idx_herb_mappings_status ON herb_migration_mappings(status);
CREATE INDEX idx_herb_mappings_key ON herb_migration_mappings(normalized_key);

-- Hàm sinh mã VT-XXXX
CREATE OR REPLACE FUNCTION next_herb_code() RETURNS TEXT AS $$
DECLARE
  n INT := nextval('herb_code_seq');
BEGIN
  RETURN 'VT-' || lpad(n::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
