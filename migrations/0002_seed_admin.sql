-- ============================================================
-- SEED - Administrador Global Inicial
-- Senha: admin123 (hash bcrypt simulado com SHA256 + salt)
-- ============================================================

-- Admin Global inicial (senha: Admin@2025!)
INSERT OR IGNORE INTO usuarios (id, nome, email, senha_hash, status, perfil, clube_id)
VALUES (
  'admin-global-001',
  'Administrador Global',
  'admin@tenis.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhuG',
  'ATIVO',
  'ADMIN_GLOBAL',
  NULL
);
