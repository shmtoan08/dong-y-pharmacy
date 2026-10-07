-- MVP-3: them herb_id vao prescription_items (nullable — text tu do van cho phep)
ALTER TABLE prescription_items ADD COLUMN IF NOT EXISTS herb_id UUID REFERENCES herbs(id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_herb ON prescription_items(herb_id);
