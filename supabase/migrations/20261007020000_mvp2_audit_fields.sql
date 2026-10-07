-- MVP-2 bổ sung: audit fields cho complete/cancel (theo review ChatGPT)
ALTER TABLE prescriptions
    ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
