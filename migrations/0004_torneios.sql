-- ============================================================
-- MIGRAÇÃO 0004 - Módulo Completo de Torneios
-- ============================================================

CREATE TABLE IF NOT EXISTS torneios (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clube_id TEXT NOT NULL REFERENCES clubes(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  data_inicio TEXT NOT NULL,
  data_fim TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'INSCRICOES' CHECK (status IN ('RASCUNHO', 'INSCRICOES', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS torneio_categorias (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  torneio_id TEXT NOT NULL REFERENCES torneios(id) ON DELETE CASCADE,
  classe_id TEXT REFERENCES classes(id),
  nome TEXT NOT NULL,
  formato_jogo TEXT NOT NULL DEFAULT 'ELIMINATORIO' CHECK (formato_jogo IN ('ELIMINATORIO', 'ROUND_ROBIN')),
  formato_set TEXT NOT NULL DEFAULT 'SET_PRO' CHECK (formato_set IN ('SET_PRO', '3SETS')),
  max_participantes INTEGER DEFAULT 16,
  status TEXT NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'INSCRICOES', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS torneio_inscricoes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  categoria_id TEXT NOT NULL REFERENCES torneio_categorias(id) ON DELETE CASCADE,
  jogador_id TEXT NOT NULL REFERENCES jogadores(id),
  seed INTEGER DEFAULT NULL,
  ranking_posicao INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'CONFIRMADA' CHECK (status IN ('PENDENTE', 'CONFIRMADA', 'PAGA', 'CANCELADA')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(categoria_id, jogador_id)
);

CREATE TABLE IF NOT EXISTS torneio_partidas (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  categoria_id TEXT NOT NULL REFERENCES torneio_categorias(id) ON DELETE CASCADE,
  rodada INTEGER NOT NULL DEFAULT 1,
  posicao_chave INTEGER NOT NULL DEFAULT 1,
  jogador_a_id TEXT REFERENCES jogadores(id),
  jogador_b_id TEXT REFERENCES jogadores(id),
  is_bye INTEGER NOT NULL DEFAULT 0,
  vencedor_id TEXT REFERENCES jogadores(id),
  placar_a TEXT,
  placar_b TEXT,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'FINALIZADA', 'WO', 'CANCELADA')),
  observacoes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_torneios_clube_id ON torneios(clube_id);
CREATE INDEX IF NOT EXISTS idx_torneio_categorias_torneio ON torneio_categorias(torneio_id);
CREATE INDEX IF NOT EXISTS idx_torneio_inscricoes_cat ON torneio_inscricoes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_torneio_partidas_cat ON torneio_partidas(categoria_id);
