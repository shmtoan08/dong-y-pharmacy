-- Phieu thu/chi thu cong
CREATE TABLE IF NOT EXISTS manual_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  person TEXT,
  method TEXT NOT NULL CHECK (method IN ('cash', 'transfer')),
  note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_manual_tx_created ON manual_transactions(created_at);
