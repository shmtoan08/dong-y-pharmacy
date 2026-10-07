-- MVP-1: Thu vien bai thuoc (theo ke hoach v1.3)
-- structured text + canonical key + versioning (theo review ChatGPT)

CREATE TABLE prescription_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,                          -- BT-0001 (unique theo version)
    name TEXT NOT NULL,                          -- Luc Vi Dia Hoang Hoan
    version INT NOT NULL DEFAULT 1,              -- v1, v2, v3...
    category TEXT CHECK (category IN ('co_phuong','gia_truyen','tu_che')),
    source_book TEXT,                            -- Thuong Han Luan...
    syndrome TEXT,                               -- Hoi chung: Than am hu
    indications TEXT,                            -- Chi dinh
    usage_note TEXT,                             -- Cach dung / sac uong
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(code, version)
);
CREATE INDEX idx_templates_code ON prescription_templates(code);
CREATE INDEX idx_templates_name ON prescription_templates(name);
CREATE INDEX idx_templates_active ON prescription_templates(is_active) WHERE is_active = true;

CREATE TABLE prescription_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES prescription_templates(id) ON DELETE CASCADE,
    herb_name TEXT NOT NULL,                     -- "Hoang Ky" (ten hien thi)
    herb_name_key TEXT NOT NULL,                 -- "hoang-ky" (canonical key cho migrate MVP-3)
    dosage_text TEXT NOT NULL,                   -- "12g" (text o MVP-1)
    sort_order INT NOT NULL DEFAULT 0,
    note TEXT
);
CREATE INDEX idx_template_items_template ON prescription_template_items(template_id);

-- Rule: sua bai thuoc = tao version moi, khong sua version da co don tham chieu.
-- (Enforce o application layer — Server Action.)
