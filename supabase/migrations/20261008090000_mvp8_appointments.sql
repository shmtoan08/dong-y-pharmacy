-- MVP-8: Lich hen
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked_in', 'completed', 'cancelled', 'no_show')),
  reason TEXT,
  note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_practitioner ON appointments(practitioner_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id, scheduled_at);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_visits_appointment') THEN
    ALTER TABLE visits ADD CONSTRAINT uq_visits_appointment UNIQUE (appointment_id);
  END IF;
END $$;
