-- Gallery anh vi thuoc: toi da 5 anh / vi, 1 anh dai dien (is_primary).
-- herbs.image_url giu lam mirror cua anh dai dien (danh sach dung no lam thumbnail).
CREATE TABLE IF NOT EXISTS herb_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  herb_id UUID NOT NULL REFERENCES herbs(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_herb_images_herb ON herb_images(herb_id);
-- Toi da 1 anh dai dien / vi thuoc.
CREATE UNIQUE INDEX IF NOT EXISTS idx_herb_images_primary ON herb_images(herb_id) WHERE is_primary;
-- Migre anh don hien co (herbs.image_url) thanh row dai dien (key cu: herbs/<canonical_key>).
INSERT INTO herb_images (herb_id, image_url, r2_key, sort_order, is_primary)
SELECT id, image_url, 'herbs/' || canonical_key, 0, true
FROM herbs
WHERE image_url IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM herb_images hi WHERE hi.herb_id = herbs.id);
