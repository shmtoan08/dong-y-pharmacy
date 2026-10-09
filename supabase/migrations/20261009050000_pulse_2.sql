-- Mach ket hop (2 mach/vi tri)
ALTER TABLE visit_pulses ADD COLUMN IF NOT EXISTS pulse_pattern_id_2 UUID REFERENCES pulse_patterns(id) ON DELETE SET NULL;
