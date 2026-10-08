ALTER TABLE stock_lots ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES stock_receipts(id);
