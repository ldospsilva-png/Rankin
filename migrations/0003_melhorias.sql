-- ============================================================
-- MIGRAÇÃO 0003 - Melhorias: Parâmetros, Desafios, Pagamentos,
--                            Publicações, Notificações
-- ============================================================

-- Expandir configurações do clube
ALTER TABLE configuracoes_clube ADD COLUMN limite_quadras INTEGER NOT NULL DEFAULT 4;
ALTER TABLE configuracoes_clube ADD COLUMN formato_set TEXT NOT NULL DEFAULT '3SETS' CHECK (formato_set IN ('3SETS','SET_PRO'));
ALTER TABLE configuracoes_clube ADD COLUMN desafio_ativo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE configuracoes_clube ADD COLUMN dias_inadimplencia_bloqueio INTEGER NOT NULL DEFAULT 10;
ALTER TABLE configuracoes_clube ADD COLUMN dias_inadimplencia_inativacao INTEGER NOT NULL DEFAULT 20;
ALTER TABLE configuracoes_clube ADD COLUMN valor_mensalidade REAL NOT NULL DEFAULT 0;
ALTER TABLE configuracoes_clube ADD COLUMN pix_chave TEXT;
ALTER TABLE configuracoes_clube ADD COLUMN pix_titular TEXT;
ALTER TABLE configuracoes_clube ADD COLUMN whatsapp_notificacoes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE configuracoes_clube ADD COLUMN email_notificacoes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE configuracoes_clube ADD COLUMN instagram_url TEXT;
ALTER TABLE configuracoes_clube ADD COLUMN facebook_url TEXT;

-- Configurações por classe (sobrescreve clube se existir)
CREATE TABLE IF NOT EXISTS configuracoes_classe (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clube_id TEXT NOT NULL REFERENCES clubes(id),
  classe_id TEXT NOT NULL UNIQUE REFERENCES classes(id),
  limite_quadras INTEGER,
  formato_set TEXT CHECK (formato_set IN ('3SETS','SET_PRO')),
  desafio_ativo INTEGER,
  limite_jogos_aberto_por_jogador INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pagamentos de jogadores
CREATE TABLE IF NOT EXISTS pagamentos (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clube_id TEXT NOT NULL REFERENCES clubes(id),
  jogador_id TEXT NOT NULL REFERENCES jogadores(id),
  valor REAL NOT NULL,
  referencia TEXT NOT NULL,        -- Ex: "2025-06" (mês/ano)
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','PAGO','VENCIDO','CANCELADO')),
  metodo_pagamento TEXT CHECK (metodo_pagamento IN ('PIX','CARTAO_CREDITO','CARTAO_DEBITO','DINHEIRO','ISENTO')),
  data_vencimento TEXT NOT NULL,
  data_pagamento TEXT,
  codigo_transacao TEXT,
  observacoes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Desafios entre jogadores
CREATE TABLE IF NOT EXISTS desafios (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clube_id TEXT NOT NULL REFERENCES clubes(id),
  classe_id TEXT NOT NULL REFERENCES classes(id),
  desafiante_id TEXT NOT NULL REFERENCES jogadores(id),
  desafiado_id TEXT NOT NULL REFERENCES jogadores(id),
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','ACEITO','RECUSADO','EXPIRADO','FINALIZADO')),
  mensagem TEXT,
  data_proposta TEXT NOT NULL DEFAULT (datetime('now')),
  data_resposta TEXT,
  data_expiracao TEXT,
  partida_id TEXT REFERENCES partidas(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Publicações do clube/jogador
CREATE TABLE IF NOT EXISTS publicacoes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clube_id TEXT NOT NULL REFERENCES clubes(id),
  autor_id TEXT NOT NULL REFERENCES usuarios(id),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'AVISO' CHECK (tipo IN ('AVISO','RESULTADO','EVENTO','NOVIDADE','OUTRO')),
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO')),
  fixado INTEGER NOT NULL DEFAULT 0,
  imagem_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notificações enviadas
CREATE TABLE IF NOT EXISTS notificacoes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clube_id TEXT NOT NULL REFERENCES clubes(id),
  jogador_id TEXT REFERENCES jogadores(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('NOVA_RODADA','LEMBRETE_PARTIDA','INADIMPLENCIA','DESAFIO','AVISO_GERAL')),
  canal TEXT NOT NULL CHECK (canal IN ('WHATSAPP','EMAIL','PUSH')),
  destinatario TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','ENVIADO','FALHA')),
  enviado_em TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Agendamento de partidas
ALTER TABLE partidas ADD COLUMN data_agendada TEXT;
ALTER TABLE partidas ADD COLUMN quadra TEXT;
ALTER TABLE partidas ADD COLUMN horario TEXT;

-- Inadimplência no jogador
ALTER TABLE jogadores ADD COLUMN inadimplente INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jogadores ADD COLUMN dias_inadimplente INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jogadores ADD COLUMN data_ultimo_pagamento TEXT;
ALTER TABLE jogadores ADD COLUMN instagram_url TEXT;
ALTER TABLE jogadores ADD COLUMN foto_perfil_url TEXT;

-- Índices novos
CREATE INDEX IF NOT EXISTS idx_pagamentos_clube_id ON pagamentos(clube_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_jogador_id ON pagamentos(jogador_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_referencia ON pagamentos(referencia);
CREATE INDEX IF NOT EXISTS idx_desafios_clube_id ON desafios(clube_id);
CREATE INDEX IF NOT EXISTS idx_desafios_desafiante ON desafios(desafiante_id);
CREATE INDEX IF NOT EXISTS idx_desafios_desafiado ON desafios(desafiado_id);
CREATE INDEX IF NOT EXISTS idx_publicacoes_clube_id ON publicacoes(clube_id);
CREATE INDEX IF NOT EXISTS idx_publicacoes_tipo ON publicacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_clube_id ON notificacoes(clube_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_jogador_id ON notificacoes(jogador_id);
CREATE INDEX IF NOT EXISTS idx_configuracoes_classe_clube ON configuracoes_classe(clube_id);
