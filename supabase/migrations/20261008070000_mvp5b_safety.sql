-- MVP-5B: An toan lam sang
CREATE TABLE IF NOT EXISTS herb_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  herb_a_id UUID NOT NULL REFERENCES herbs(id) ON DELETE RESTRICT,
  herb_b_id UUID NOT NULL REFERENCES herbs(id) ON DELETE RESTRICT,
  CONSTRAINT chk_interaction_order CHECK (herb_a_id < herb_b_id),
  CONSTRAINT uq_interaction_pair UNIQUE (herb_a_id, herb_b_id),
  severity TEXT NOT NULL CHECK (severity IN ('cam_ky', 'can_trong')),
  description TEXT,
  source TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interactions_herbs ON herb_interactions(herb_a_id, herb_b_id);
CREATE TABLE IF NOT EXISTS prescription_interaction_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  interaction_id UUID NOT NULL REFERENCES herb_interactions(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  overridden_by UUID NOT NULL REFERENCES users(id),
  overridden_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_override UNIQUE (prescription_id, interaction_id)
);
CREATE TABLE IF NOT EXISTS herb_dosage_limits (
  herb_id UUID PRIMARY KEY REFERENCES herbs(id) ON DELETE CASCADE,
  max_daily_dose NUMERIC(12,3),
  source TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_max_dose_pos CHECK (max_daily_dose IS NULL OR max_daily_dose > 0)
);
