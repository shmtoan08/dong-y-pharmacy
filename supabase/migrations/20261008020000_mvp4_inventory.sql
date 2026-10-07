-- MVP-4: Kho cơ bản

CREATE SEQUENCE IF NOT EXISTS lot_seq START 1;
CREATE SEQUENCE IF NOT EXISTS supplier_seq START 1;

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    note TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_code TEXT UNIQUE NOT NULL,
    herb_id UUID NOT NULL REFERENCES herbs(id),
    supplier_id UUID REFERENCES suppliers(id),
    quantity_initial NUMERIC NOT NULL CHECK (quantity_initial > 0),
    quantity_current NUMERIC NOT NULL CHECK (quantity_current >= 0),
    expiry_date DATE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_lots_herb ON stock_lots(herb_id);
CREATE INDEX IF NOT EXISTS idx_stock_lots_expiry ON stock_lots(expiry_date);

CREATE TABLE IF NOT EXISTS stock_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_code TEXT UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','cancelled')),
    received_at TIMESTAMPTZ DEFAULT NOW(),
    note TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES stock_receipts(id) ON DELETE CASCADE,
    herb_id UUID NOT NULL REFERENCES herbs(id),
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC CHECK (unit_price >= 0),
    expiry_date DATE,
    lot_id UUID REFERENCES stock_lots(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON stock_receipt_items(receipt_id);
