-- MVP-5A: Kho an toàn

-- 1. Lịch sử biến động lô
CREATE TABLE IF NOT EXISTS stock_lot_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES stock_lots(id) ON DELETE RESTRICT,
  quantity_change NUMERIC(12,3) NOT NULL,
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_movements_lot ON stock_lot_movements(lot_id);
CREATE INDEX IF NOT EXISTS idx_movements_ref ON stock_lot_movements(reference_type, reference_id);

-- 2. Phiếu kiểm kho
CREATE TABLE IF NOT EXISTS stock_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT draft CHECK (status IN (draft, confirmed, cancelled)),
  note TEXT,
  created_by UUID REFERENCES users(id),
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_check_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID NOT NULL REFERENCES stock_checks(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES stock_lots(id) ON DELETE RESTRICT,
  system_qty NUMERIC(12,3) NOT NULL,
  actual_qty NUMERIC(12,3),
  CONSTRAINT uq_check_lot UNIQUE (check_id, lot_id),
  CONSTRAINT chk_actual_nonneg CHECK (actual_qty IS NULL OR actual_qty >= 0)
);

-- 3. Constraints an toàn
ALTER TABLE stock_lots ADD CONSTRAINT chk_lot_qty_nonneg CHECK (quantity_current >= 0);
ALTER TABLE stock_lot_movements ADD CONSTRAINT chk_movement_qty CHECK (quantity_change <> 0);

-- 4. Backfill movements cho dữ liệu hiện có (nhập kho từ receipts)
INSERT INTO stock_lot_movements (lot_id, quantity_change, reason, reference_type, reference_id, created_at)
SELECT l.id, l.quantity_initial, Nhập kho, STOCK_RECEIPT, l.receipt_id, l.created_at
FROM stock_lots l
WHERE l.receipt_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Bỏ dual source of truth: stock_quantity -> SUM từ lots
ALTER TABLE herbs DROP COLUMN IF EXISTS stock_quantity;

ALTER TABLE stock_check_items ADD COLUMN IF NOT EXISTS diff_reason TEXT;
