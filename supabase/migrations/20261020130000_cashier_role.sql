-- Vai tro Thu ngan (cashier): vai tro he thong thu 4
-- Quyen mac dinh nam trong code (DEFAULT_PERMISSIONS.cashier) — bang nay chi de
-- trang /admin/roles hien thi vai tro. users.role khong co CHECK constraint nen
-- khong can thay doi schema.
INSERT INTO role_definitions (code, label, description, is_system) VALUES
  ('cashier', 'Thu ngân', 'Lập hóa đơn, thu tiền và đối soát thanh toán', true)
ON CONFLICT (code) DO NOTHING;
