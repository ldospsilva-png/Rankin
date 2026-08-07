-- ============================================================
-- MIGRAÇÃO 0003 - Melhorias v2 PostgreSQL
-- ============================================================

-- Expandir configurações do clube
ALTER TABLE configuracoes_clube ADD COLUMN IF NOT EXISTS limite_quadras INT NOT NULL DEFAULT 4;
ALTER TABLE configuracoes_clube ADD COLUMN IF NOT EXISTS formato_set VARCHAR(20) NOT NULL DEFAULT '3SETS' CHECK (formato_set IN ('3SETS','SET_PRO'));
ALTER TABLE configuracoes_clube ADD COLUMN IF NOT EXISTS desafio_ativo INT NOT NULL DEFAULT 0;
ALTER TABLE configuracoes_clube ADD COLUMN IF NOT EXISTS dias_inadimplencia_bloqueio INT NOT NULL DEFAULT 10;
ALTER TABLE configuracoes_clube ADD COLUMN IF NOT EXISTS dias_inadimplencia_inativacao INT NOT NULL DEFAULT 20;
ALTER TABLE configuracoes_clube ADD COLUMN IF NOT EXISTS valor_mensalidade NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE configuracoes_clube ADD COLUMN IF NOT EXISTS pix_chave VARCHAR(255);
ALTER TABLE configuracoes_clube ADD COLUMN IF NOT EXISTS pix_titular VARCHAR(255);
ALTER TABLE configuracoes_clube ADD COLUMN IF NOT EXISTS whatsapp_notificacoes INT NOT NULL DEFAULT 0;
ALTER TABLE configuracoes_clube ADD COLUMN IF NOT EXISTS email_notificacoes INT NOT NULL DEFAULT 0;
ALTER TABLE configuracoes_clube ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE configuracoes_clube ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- Configurações por classe
CREATE TABLE IF NOT EXISTS configuracoes_classe (
  id VARCHAR(36) PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  clube_id VARCHAR(36) NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  classe_id VARCHAR(36) NOT NULL UNIQUE REFERENCES classes(id) ON DELETE CASCADE,
  limite_quadras INT,
  formato_set VARCHAR(20) CHECK (formato_set IN ('3SETS','SET_PRO')),
  desafio_ativo INT,
  limite_jogos_aberto_por_jogador INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pagamentos de jogadores
CREATE TABLE IF NOT EXISTS pagamentos (
  id VARCHAR(36) PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  clube_id VARCHAR(36) NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  jogador_id VARCHAR(36) NOT NULL REFERENCES jogadores(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL,
  referencia VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','PAGO','VENCIDO','CANCELADO')),
  metodo_pagamento VARCHAR(30) CHECK (metodo_pagamento IN ('PIX','CARTAO_CREDITO','CARTAO_DEBITO','DINHEIRO','ISENTO')),
  data_vencimento VARCHAR(50) NOT NULL,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  codigo_transacao VARCHAR(100),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Desafios entre jogadores
CREATE TABLE IF NOT EXISTS desafios (
  id VARCHAR(36) PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  clube_id VARCHAR(36) NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  classe_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  desafiante_id VARCHAR(36) NOT NULL REFERENCES jogadores(id) ON DELETE CASCADE,
  desafiado_id VARCHAR(36) NOT NULL REFERENCES jogadores(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','ACEITO','RECUSADO','EXPIRADO','FINALIZADO')),
  mensagem TEXT,
  data_proposta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  data_resposta TIMESTAMP WITH TIME ZONE,
  data_expiracao TIMESTAMP WITH TIME ZONE,
  partida_id VARCHAR(36) REFERENCES partidas(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Publicações
CREATE TABLE IF NOT EXISTS publicacoes (
  id VARCHAR(36) PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  clube_id VARCHAR(36) NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  autor_id VARCHAR(36) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  tipo VARCHAR(30) NOT NULL DEFAULT 'AVISO' CHECK (tipo IN ('AVISO','RESULTADO','EVENTO','NOVIDADE','OUTRO')),
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO')),
  fixado INT NOT NULL DEFAULT 0,
  imagem_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notificações enviadas
CREATE TABLE IF NOT EXISTS notificacoes (
  id VARCHAR(36) PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  clube_id VARCHAR(36) NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  jogador_id VARCHAR(36) REFERENCES jogadores(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('NOVA_RODADA','LEMBRETE_PARTIDA','INADIMPLENCIA','DESAFIO','AVISO_GERAL')),
  canal VARCHAR(20) NOT NULL CHECK (canal IN ('WHATSAPP','EMAIL','PUSH')),
  destinatario VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','ENVIADO','FALHA')),
  enviado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agendamento de partidas
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS data_agendada VARCHAR(50);
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS quadra VARCHAR(50);
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS horario VARCHAR(50);

-- Inadimplência no jogador
ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS inadimplente INT NOT NULL DEFAULT 0;
ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS dias_inadimplente INT NOT NULL DEFAULT 0;
ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS data_ultimo_pagamento VARCHAR(50);
ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT;

-- Índices novos
CREATE INDEX IF NOT EXISTS idx_pagamentos_clube_id ON pagamentos(clube_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_desafios_clube_id ON desafios(clube_id);
CREATE INDEX IF NOT EXISTS idx_publicacoes_clube_id ON publicacoes(clube_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_clube_id ON notificacoes(clube_id);
