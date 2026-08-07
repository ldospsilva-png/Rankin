// ============================================================
// TIPOS E INTERFACES DA PLATAFORMA DE RANKING DE TÊNIS
// ============================================================

export type PerfilUsuario = 'ADMIN_GLOBAL' | 'ADMIN_CLUBE' | 'JOGADOR'
export type StatusClube = 'ATIVO' | 'INATIVO'
export type StatusJogador = 'ATIVO' | 'INATIVO'
export type StatusClasse = 'ATIVA' | 'INATIVA'
export type StatusRodada = 'ATIVA' | 'ENCERRADA' | 'CANCELADA'
export type StatusPartida = 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADA' | 'WO' | 'CANCELADA'
export type StatusUsuario = 'ATIVO' | 'INATIVO'

export interface Clube {
  id: string
  nome: string
  status: StatusClube
  cidade?: string
  estado?: string
  telefone?: string
  email_contato?: string
  data_fundacao?: string
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface Usuario {
  id: string
  nome: string
  email: string
  senha_hash: string
  status: StatusUsuario
  perfil: PerfilUsuario
  clube_id?: string
  ultimo_login?: string
  created_at: string
  updated_at: string
}

export interface Classe {
  id: string
  clube_id: string
  nome: string
  descricao?: string
  ordem: number
  status: StatusClasse
  created_at: string
  updated_at: string
}

export interface Jogador {
  id: string
  clube_id: string
  classe_id: string
  usuario_id?: string
  nome: string
  telefone?: string
  email?: string
  foto_url?: string
  ranking_posicao: number
  pontos_total: number
  jogos_abertos: number
  status: StatusJogador
  created_at: string
  updated_at: string
}

export interface ConfiguracaoClube {
  id: string
  clube_id: string
  periodicidade_sorteio: number
  limite_jogos_aberto_por_jogador: number
  permitir_wo: number
  dias_para_wo: number
  pontos_vitoria: number
  pontos_derrota: number
  pontos_wo: number
  created_at: string
  updated_at: string
}

export interface Rodada {
  id: string
  clube_id: string
  classe_id: string
  numero: number
  data_execucao: string
  executado_por_usuario_id: string
  status: StatusRodada
  total_partidas: number
  total_jogadores_elegiveis: number
  total_jogadores_excluidos: number
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface Partida {
  id: string
  clube_id: string
  classe_id: string
  rodada_id?: string
  jogador_a_id: string
  jogador_b_id: string
  status: StatusPartida
  vencedor_id?: string
  placar_a?: string
  placar_b?: string
  data_limite?: string
  data_finalizacao?: string
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface Auditoria {
  id: string
  clube_id?: string
  usuario_id: string
  tipo_evento: string
  entidade: string
  entidade_id?: string
  payload_resumido?: string
  ip_address?: string
  data_evento: string
}

// JWT Payload
export interface JwtPayload {
  sub: string
  nome: string
  email: string
  perfil: PerfilUsuario
  clube_id?: string
  exp: number
  iat: number
}

// Bindings do Cloudflare e GCP
export interface Bindings {
  DB: any
  JWT_SECRET?: string
  DATABASE_URL?: string
  GCS_BUCKET_NAME?: string
  PORT?: string
}

// Variáveis de contexto
export interface Variables {
  user: JwtPayload
  clube_id?: string
}
