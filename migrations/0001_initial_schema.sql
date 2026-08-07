-- ============================================================
-- PLATAFORMA DE RANKING DE TÊNIS MULTI-CLUBE
-- Schema Inicial - Migração 0001
-- ============================================================

-- Clubes (Tenants)
CREATE TABLE IF NOT EXISTS clubes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  cidade TEXT,
  estado TEXT,
  telefone TEXT,
  email_contato TEXT,
  data_fundacao TEXT,
  logo_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  perfil TEXT NOT NULL CHECK (perfil IN ('ADMIN_GLOBAL', 'ADMIN_CLUBE', 'JOGADOR')),
  clube_id TEXT REFERENCES clubes(id),
  ultimo_login TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clube_id TEXT NOT NULL REFERENCES clubes(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA', 'INATIVA')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Jogadores
CREATE TABLE IF NOT EXISTS jogadores (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clube_id TEXT NOT NULL REFERENCES clubes(id),
  classe_id TEXT NOT NULL REFERENCES classes(id),
  usuario_id TEXT REFERENCES usuarios(id),
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  foto_url TEXT,
  ranking_posicao INTEGER DEFAULT 0,
  pontos_total INTEGER DEFAULT 0,
  jogos_abertos INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Configurações do Clube
CREATE TABLE IF NOT EXISTS configuracoes_clube (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clube_id TEXT NOT NULL UNIQUE REFERENCES clubes(id),
  periodicidade_sorteio INTEGER NOT NULL DEFAULT 7,
  limite_jogos_aberto_por_jogador INTEGER NOT NULL DEFAULT 3,
  permitir_wo INTEGER NOT NULL DEFAULT 1,
  dias_para_wo INTEGER NOT NULL DEFAULT 14,
  pontos_vitoria INTEGER NOT NULL DEFAULT 3,
  pontos_derrota INTEGER NOT NULL DEFAULT 1,
  pontos_wo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Rodadas (Sorteios)
CREATE TABLE IF NOT EXISTS rodadas (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clube_id TEXT NOT NULL REFERENCES clubes(id),
  classe_id TEXT NOT NULL REFERENCES classes(id),
  numero INTEGER NOT NULL,
  data_execucao TEXT NOT NULL DEFAULT (datetime('now')),
  executado_por_usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  status TEXT NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA', 'ENCERRADA', 'CANCELADA')),
  total_partidas INTEGER DEFAULT 0,
  total_jogadores_elegiveis INTEGER DEFAULT 0,
  total_jogadores_excluidos INTEGER DEFAULT 0,
  observacoes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Partidas
CREATE TABLE IF NOT EXISTS partidas (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clube_id TEXT NOT NULL REFERENCES clubes(id),
  classe_id TEXT NOT NULL REFERENCES classes(id),
  rodada_id TEXT REFERENCES rodadas(id),
  jogador_a_id TEXT NOT NULL REFERENCES jogadores(id),
  jogador_b_id TEXT NOT NULL REFERENCES jogadores(id),
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'FINALIZADA', 'WO', 'CANCELADA')),
  vencedor_id TEXT REFERENCES jogadores(id),
  placar_a TEXT,
  placar_b TEXT,
  data_limite TEXT,
  data_finalizacao TEXT,
  observacoes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Auditoria
CREATE TABLE IF NOT EXISTS auditoria (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clube_id TEXT REFERENCES clubes(id),
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  tipo_evento TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id TEXT,
  payload_resumido TEXT,
  ip_address TEXT,
  data_evento TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_clube_id ON usuarios(clube_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON usuarios(perfil);

CREATE INDEX IF NOT EXISTS idx_classes_clube_id ON classes(clube_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);

CREATE INDEX IF NOT EXISTS idx_jogadores_clube_id ON jogadores(clube_id);
CREATE INDEX IF NOT EXISTS idx_jogadores_classe_id ON jogadores(classe_id);
CREATE INDEX IF NOT EXISTS idx_jogadores_clube_classe ON jogadores(clube_id, classe_id);
CREATE INDEX IF NOT EXISTS idx_jogadores_status ON jogadores(status);
CREATE INDEX IF NOT EXISTS idx_jogadores_clube_status ON jogadores(clube_id, status);

CREATE INDEX IF NOT EXISTS idx_rodadas_clube_id ON rodadas(clube_id);
CREATE INDEX IF NOT EXISTS idx_rodadas_classe_id ON rodadas(classe_id);
CREATE INDEX IF NOT EXISTS idx_rodadas_clube_classe ON rodadas(clube_id, classe_id);
CREATE INDEX IF NOT EXISTS idx_rodadas_status ON rodadas(status);

CREATE INDEX IF NOT EXISTS idx_partidas_clube_id ON partidas(clube_id);
CREATE INDEX IF NOT EXISTS idx_partidas_classe_id ON partidas(classe_id);
CREATE INDEX IF NOT EXISTS idx_partidas_rodada_id ON partidas(rodada_id);
CREATE INDEX IF NOT EXISTS idx_partidas_jogador_a ON partidas(jogador_a_id);
CREATE INDEX IF NOT EXISTS idx_partidas_jogador_b ON partidas(jogador_b_id);
CREATE INDEX IF NOT EXISTS idx_partidas_status ON partidas(status);
CREATE INDEX IF NOT EXISTS idx_partidas_clube_status ON partidas(clube_id, status);
CREATE INDEX IF NOT EXISTS idx_partidas_clube_classe ON partidas(clube_id, classe_id);

CREATE INDEX IF NOT EXISTS idx_auditoria_clube_id ON auditoria(clube_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_tipo_evento ON auditoria(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_auditoria_data_evento ON auditoria(data_evento);
