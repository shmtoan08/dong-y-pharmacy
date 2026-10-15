-- Bệnh án kinh nghiệm (case lâm sàng): nối Bệnh danh <-> Bài thuốc
-- 1 bài thuốc có thể dùng cho nhiều bệnh/biện chứng khác nhau
-- 1 bệnh có thể có nhiều ca với nhiều bài thuốc khác nhau

CREATE TABLE clinical_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disease_name TEXT NOT NULL,              -- Bệnh danh: Viêm đa khớp dạng thấp
    pattern TEXT,                             -- Biện chứng: Thấp nhiệt đọng lại ở khớp
    treatment_principle TEXT,                 -- Pháp trị: Thanh nhiệt giải độc, khử thấp hoạt lạc
    symptoms TEXT,                            -- Triệu chứng
    template_id UUID REFERENCES prescription_templates(id) ON DELETE SET NULL,
    usage_instruction TEXT,                   -- Cách dùng: Sắc uống, mỗi ngày 1 thang
    outcome TEXT,                             -- Hiệu quả điều trị
    discussion TEXT,                          -- Bàn luận
    source TEXT,                              -- Nguồn: sách nào / kinh nghiệm ai
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_clinical_cases_disease ON clinical_cases(disease_name);
CREATE INDEX idx_clinical_cases_template ON clinical_cases(template_id);
CREATE INDEX idx_clinical_cases_active ON clinical_cases(is_active) WHERE is_active = true;
