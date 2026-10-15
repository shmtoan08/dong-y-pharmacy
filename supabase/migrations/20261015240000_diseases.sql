-- Tách bệnh danh thành bảng riêng: 1 bệnh -> N biện chứng
-- Chuyển dữ liệu từ clinical_cases.disease_name sang diseases + disease_id

-- 1. Bảng bệnh danh
CREATE TABLE diseases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_diseases_name ON diseases(name);
CREATE INDEX idx_diseases_active ON diseases(is_active) WHERE is_active = true;

-- 2. Chuyển dữ liệu: tạo disease từ disease_name hiện có
INSERT INTO diseases (name)
SELECT DISTINCT disease_name FROM clinical_cases
WHERE disease_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- 3. Thêm cột disease_id, điền từ diseases
ALTER TABLE clinical_cases ADD COLUMN disease_id UUID REFERENCES diseases(id);
UPDATE clinical_cases c SET disease_id = d.id
FROM diseases d WHERE d.name = c.disease_name;

-- 4. disease_id bắt buộc + xóa disease_name
ALTER TABLE clinical_cases ALTER COLUMN disease_id SET NOT NULL;
ALTER TABLE clinical_cases DROP COLUMN disease_name;

-- 5. Index cho disease_id
CREATE INDEX idx_clinical_cases_disease ON clinical_cases(disease_id);
