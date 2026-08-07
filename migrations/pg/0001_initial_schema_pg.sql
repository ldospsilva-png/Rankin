-- ============================================================
-- PLATAFORMA DE RANKING DE TÊNIS MULTI-CLUBE
-- Schema Inicial PostgreSQL - GCP Cloud SQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clubes (Tenants)
CREATE TABLE IF NOT EXISTS clubes (
  id VARCHAR(36) PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  nome VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  cidade VARCHAR(100),
  estado VARCHAR(50),
  telefone VARCHAR(50),
  email_contato VARCHAR(255),
  data_fundacao VARCHAR(50),
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id VARCHAR(36) PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  perfil VARCHAR(30) NOT NULL CHECK (perfil IN ('ADMIN_GLOBAL', 'ADMIN_CLUBE', 'JOGADOR')),
  clube_id VARCHAR(36) REFERENCES clubes(id) ON DELETE SET NULL,
  ultimo_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id VARCHAR(36) PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  clube_id VARCHAR(36) NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ordem INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA', 'INATIVA')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Jogadores
CREATE TABLE IF NOT EXISTS jogadores (
  id VARCHAR(36) PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  clube_id VARCHAR(36) NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  classe_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  usuario_id VARCHAR(36) REFERENCES usuarios(id) ON DELETE SET NULL,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(50),
  email VARCHAR(255),
  foto_url TEXT,
  ranking_posicao INT DEFAULT 0,
  pontos_total INT DEFAULT 0,
  jogos_abertos INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Configurações do Clube
CREATE TABLE IF NOT EXISTS configuracoes_clube (
  id VARCHAR(36) PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  clube_id VARCHAR(36) NOT NULL UNIQUE REFERENCES clubes(id) ON DELETE CASCADE,
  periodicidade_sorteio INT NOT NULL DEFAULT 7,
  limite_jogos_aberto_por_jogador INT NOT NULL DEFAULT 3,
  permitir_wo INT NOT NULL DEFAULT 1,
  dias_para_wo INT NOT NULL DEFAULT 14,
  pontos_vitoria INT NOT NULL DEFAULT 3,
  pontos_derrota INT NOT NULL DEFAULT 1,
  pontos_wo INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rodadas (Sorteios)
CREATE TABLE IF NOT EXISTS rodadas (
  id VARCHAR(36) PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  clube_id VARCHAR(36) NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  classe_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  data_execucao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  executado_por_usuario_id VARCHAR(36) NOT NULL REFERENCES usuarios(id),
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA', 'ENCERRADA', 'CANCELADA')),
  total_partidas INT DEFAULT 0,
  total_jogadores_elegiveis INT DEFAULT 0,
  total_jogadores_excluidos INT DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Partidas
CREATE TABLE IF NOT EXISTS partidas (
  id VARCHAR(36) PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  clube_id VARCHAR(36) NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  classe_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  rodada_id VARCHAR(36) REFERENCES rodadas(id) ON DELETE SET NULL,
  jogador_a_id VARCHAR(36) NOT NULL REFERENCES jogadores(id) ON DELETE CASCADE,
  jogador_b_id VARCHAR(36) NOT NULL REFERENCES jogadores(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'FINALIZADA', 'WO', 'CANCELADA')),
  vencedor_id VARCHAR(36) REFERENCES jogadores(id) ON DELETE SET NULL,
  placar_a VARCHAR(50),
  placar_b VARCHAR(50),
  data_limite VARCHAR(50),
  data_finalizacao TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Auditoria
CREATE TABLE IF NOT EXISTS auditoria (
  id VARCHAR(36) PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  clube_id VARCHAR(36) REFERENCES clubes(id) ON DELETE CASCADE,
  usuario_id VARCHAR(36) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_evento VARCHAR(100) NOT NULL,
  entidade VARCHAR(100) NOT NULL,
  entidade_id VARCHAR(36),
  payload_resumido TEXT,
  ip_address VARCHAR(50),
  data_evento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_clube_id ON usuarios(clube_id);
CREATE INDEX IF NOT EXISTS idx_classes_clube_id ON classes(clube_id);
CREATE INDEX IF NOT EXISTS idx_jogadores_clube_id ON jogadores(clube_id);
CREATE INDEX IF NOT EXISTS idx_jogadores_classe_id ON jogadores(classe_id);
CREATE INDEX IF NOT EXISTS idx_rodadas_clube_id ON rodadas(clube_id);
CREATE INDEX IF NOT EXISTS idx_partidas_clube_id ON partidas(clube_id);
CREATE INDEX IF NOT EXISTS idx_partidas_status ON partidas(status);
CREATE INDEX IF NOT EXISTS idx_auditoria_clube_id ON auditoria(clube_id);
