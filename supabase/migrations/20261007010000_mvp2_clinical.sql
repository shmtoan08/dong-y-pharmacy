-- MVP-2: Bệnh nhân + Khám bệnh + Kê đơn
-- Theo review ChatGPT: visit_id NOT NULL, daily_sequences PK (day, code_type),
-- snapshot đầy đủ field, status transition chặt chẽ.

-- 1. Bảng 28 mạch
CREATE TABLE pulse_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_viet TEXT NOT NULL,
    name_han_viet TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    clinical_significance TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed 28 mạch (danh sách chuẩn Đông y)
INSERT INTO pulse_patterns (name_viet, name_han_viet, description, clinical_significance) VALUES
('Mạch phù', 'phù', 'Nổi ở phần nông, ấn nhẹ thấy rõ', 'Bệnh ở biểu, ngoại cảm phong hàn'),
('Mạch trầm', 'trầm', 'Chìm sâu, ấn mạnh mới thấy', 'Bệnh ở lý, nội thương'),
('Mạch trì', 'trì', 'Chậm, dưới 60 nhịp/phút', 'Hàn chứng, dương hư'),
('Mạch sác', 'sác', 'Nhanh, trên 90 nhịp/phút', 'Nhiệt chứng'),
('Mạch hư', 'hư', 'Yếu, ấn nhẹ thấy, ấn mạnh mất', 'Khí huyết hư'),
('Mạch thực', 'thực', 'Mạnh, ấn nông sâu đều thấy rõ', 'Thực chứng, tà khí thịnh'),
('Mạch hồng', 'hồng', 'To, mạnh, dồn dập như sóng', 'Nhiệt thịnh, hỏa vượng'),
('Mạch tế', 'tế', 'Nhỏ như sợi chỉ', 'Khí huyết lưỡng hư'),
('Mạch vi', 'vi', 'Rất nhỏ, mờ nhạt khó thấy', 'Dương hư nặng, khí huyết suy'),
('Mạch hoạt', 'hoạt', 'Trơn tru, linh hoạt như hạt châu lăn', 'Đàm ẩm, thực tích, có thai'),
('Mạch sáp', 'sáp', 'Khó khăn, không trơn tru', 'Khí trệ huyết ứ, tinh huyết hư'),
('Mạch huyền', 'huyền', 'Căng như dây đàn', 'Can đởm bệnh, đau nhức'),
('Mạch khẩn', 'khẩn', 'Căng gấp, nhanh mạnh', 'Hàn đau, kinh quyết'),
('Mạch hoãn', 'hoãn', 'Chậm rãi, thong thả', 'Thấp chứng, tỳ hư'),
('Mạch nhu', 'nhu', 'Mềm mại, nhỏ yếu', 'Thấp, khí hư'),
('Mạch nhược', 'nhược', 'Nhỏ yếu, ấn nhẹ thấy', 'Khí huyết hư'),
('Mạch tán', 'tán', 'Rời rạc, không tụ', 'Nguyên khí ly tán, nguy chứng'),
('Mạch cách', 'cách', 'Rỗng ở giữa, ấn 2 đầu thấy', 'Mất máu nhiều, âm hư'),
('Mạch lao', 'lao', 'Chắc, cứng, ấn không xê dịch', 'Hàn ngưng, tích tụ'),
('Mạch động', 'động', 'Nhảy mạnh một chỗ', 'Đau nhức, kinh hãi'),
('Mạch trường', 'trường', 'Dài, vượt quá 3 bộ vị', 'Dương thịnh, hỏa vượng'),
('Mạch đoản', 'đoản', 'Ngắn, không đủ 3 bộ vị', 'Khí hư, khí trệ'),
('Mạch đại', 'đại', 'To lớn', 'Bệnh tiến triển, tà thịnh'),
('Mạch tiểu', 'tiểu', 'Nhỏ', 'Khí huyết hư'),
('Mạch phục', 'phục', 'Chìm sâu, ấn mạnh vào xương mới thấy', 'Hàn bế, đau nặng'),
('Mạch kết', 'kết', 'Chậm có lúc ngừng, ngừng không đều', 'Âm thịnh, khí kết'),
('Mạch đại (thay)', 'đại-thay', 'Ngừng đều đặn có chu kỳ', 'Tạng khí suy, nguy chứng'),
('Mạch xúc', 'xúc', 'Nhanh có lúc ngừng, ngừng không đều', 'Dương thịnh, nhiệt cực');

-- 2. Sinh mã chống race: PK (day, code_type)
CREATE TABLE daily_sequences (
    day DATE NOT NULL,
    code_type TEXT NOT NULL,  -- 'patient' | 'prescription'
    last_n INT NOT NULL DEFAULT 0,
    PRIMARY KEY (day, code_type)
);

-- Function sinh số thứ tự atomic (Postgres khóa row theo statement)
CREATE OR REPLACE FUNCTION next_daily_n(p_day DATE, p_code_type TEXT)
RETURNS INT AS $$
DECLARE
    v_n INT;
BEGIN
    INSERT INTO daily_sequences (day, code_type, last_n)
    VALUES (p_day, p_code_type, 1)
    ON CONFLICT (day, code_type)
    DO UPDATE SET last_n = daily_sequences.last_n + 1
    RETURNING last_n INTO v_n;
    RETURN v_n;
END;
$$ LANGUAGE plpgsql;

-- 3. Lượt khám (tứ chẩn)
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    practitioner_id UUID NOT NULL REFERENCES users(id),
    visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inspection_notes TEXT,    -- vọng
    auscultation_notes TEXT,  -- văn
    inquiry_notes TEXT,       -- vấn
    palpation_notes TEXT,     -- thiết
    final_diagnosis TEXT,
    doctor_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_visits_date ON visits(visited_at DESC);

-- 4. Mạch 6 vị trí
CREATE TABLE visit_pulses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    hand TEXT NOT NULL CHECK (hand IN ('left', 'right')),
    position TEXT NOT NULL CHECK (position IN ('thon', 'quan', 'xich')),
    pulse_pattern_id UUID REFERENCES pulse_patterns(id) ON DELETE SET NULL,
    custom_note TEXT,
    UNIQUE(visit_id, hand, position)
);

-- 5. Đơn thuốc (visit_id NOT NULL theo review ChatGPT; bỏ patient_id — suy ra từ visit)
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_code TEXT UNIQUE NOT NULL,  -- DT-YYYYMMDD-XXX
    visit_id UUID NOT NULL REFERENCES visits(id),
    practitioner_id UUID NOT NULL REFERENCES users(id),
    template_id UUID REFERENCES prescription_templates(id) ON DELETE SET NULL,
    template_version INT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'confirmed', 'completed', 'cancelled')),
    num_of_packs INT NOT NULL DEFAULT 1 CHECK (num_of_packs > 0),
    usage_instruction TEXT,
    doctor_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES users(id)
);
CREATE INDEX idx_prescriptions_visit ON prescriptions(visit_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_code ON prescriptions(prescription_code);

-- 6. Chi tiết vị thuốc trong đơn
CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    herb_name TEXT NOT NULL,
    herb_name_key TEXT NOT NULL,
    weight_per_pack NUMERIC(10,2) NOT NULL CHECK (weight_per_pack > 0),  -- gam/thang
    note TEXT
);

-- 7. Snapshot bất biến lúc CONFIRM
CREATE TABLE prescription_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id),
    version INT NOT NULL DEFAULT 1,
    snapshot_data JSONB NOT NULL,
    -- { prescriptionCode, visitId, visitDate, patient: {id, code, name, dob, phone },
    --   practitioner: {id, name}, confirmedBy: {id, name}, confirmedAt,
    --   items: [{herbName, herbNameKey, weightPerPack, totalWeight, note}],
    --   numOfPacks, totalWeightAll, usageInstruction, doctorNotes }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(prescription_id, version)
);
