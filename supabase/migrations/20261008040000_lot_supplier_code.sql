ALTER TABLE stock_receipt_items ADD COLUMN IF NOT EXISTS supplier_lot_code TEXT;
ALTER TABLE stock_lots ADD COLUMN IF NOT EXISTS supplier_lot_code TEXT;
