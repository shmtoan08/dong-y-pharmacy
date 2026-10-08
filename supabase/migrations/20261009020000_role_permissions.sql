-- Phan quyen theo vai tro
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  granted BOOLEAN DEFAULT true,
  PRIMARY KEY (role, permission)
);
CREATE INDEX IF NOT EXISTS idx_role_perm_role ON role_permissions(role);
