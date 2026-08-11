-- ============================================================
-- MIGRAÇÃO 0004 (POSTGRESQL / GCP CLOUD SQL) - Módulo de Torneios
-- ============================================================

CREATE TABLE IF NOT EXISTS torneios (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clube_id VARCHAR(36) NOT NULL REFERENCES clubes(id),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_inicio VARCHAR(50) NOT NULL,
  data_fim VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'INSCRICOES',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS torneio_categorias (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  torneio_id VARCHAR(36) NOT NULL REFERENCES torneios(id) ON DELETE CASCADE,
  classe_id VARCHAR(36) REFERENCES classes(id),
  nome VARCHAR(255) NOT NULL,
  formato_jogo VARCHAR(50) NOT NULL DEFAULT 'ELIMINATORIO',
  formato_set VARCHAR(50) NOT NULL DEFAULT 'SET_PRO',
  max_participantes INTEGER DEFAULT 16,
  status VARCHAR(50) NOT NULL DEFAULT 'RASCUNHO',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS torneio_inscricoes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  categoria_id VARCHAR(36) NOT NULL REFERENCES torneio_categorias(id) ON DELETE CASCADE,
  jogador_id VARCHAR(36) NOT NULL REFERENCES jogadores(id),
  seed INTEGER DEFAULT NULL,
  ranking_posicao INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMADA',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(categoria_id, jogador_id)
);

CREATE TABLE IF NOT EXISTS torneio_partidas (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  categoria_id VARCHAR(36) NOT NULL REFERENCES torneio_categorias(id) ON DELETE CASCADE,
  rodada INTEGER NOT NULL DEFAULT 1,
  posicao_chave INTEGER NOT NULL DEFAULT 1,
  jogador_a_id VARCHAR(36) REFERENCES jogadores(id),
  jogador_b_id VARCHAR(36) REFERENCES jogadores(id),
  is_bye INTEGER NOT NULL DEFAULT 0,
  vencedor_id VARCHAR(36) REFERENCES jogadores(id),
  placar_a VARCHAR(100),
  placar_b VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_torneios_clube_id ON torneios(clube_id);
CREATE INDEX IF NOT EXISTS idx_torneio_categorias_torneio ON torneio_categorias(torneio_id);
CREATE INDEX IF NOT EXISTS idx_torneio_inscricoes_cat ON torneio_inscricoes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_torneio_partidas_cat ON torneio_partidas(categoria_id);
