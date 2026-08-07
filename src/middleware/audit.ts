// ============================================================
// MIDDLEWARE E UTILITÁRIO DE AUDITORIA
// ============================================================

import { Context } from 'hono'
import { Bindings, Variables, JwtPayload } from '../types'
import { generateId } from '../utils'

export type TipoEvento =
  | 'CLUBE_CRIADO'
  | 'CLUBE_ATUALIZADO'
  | 'CLUBE_STATUS_ALTERADO'
  | 'ADMIN_CLUBE_VINCULADO'
  | 'CLASSE_CRIADA'
  | 'CLASSE_ATUALIZADA'
  | 'CLASSE_STATUS_ALTERADA'
  | 'JOGADOR_CRIADO'
  | 'JOGADOR_ATUALIZADO'
  | 'JOGADOR_STATUS_ALTERADO'
  | 'JOGADOR_CLASSE_ALTERADA'
  | 'CONFIGURACAO_ATUALIZADA'
  | 'RODADA_GERADA'
  | 'RODADA_CANCELADA'
  | 'RODADA_ENCERRADA'
  | 'PARTIDA_CRIADA'
  | 'PARTIDA_ATUALIZADA'
  | 'PARTIDA_FINALIZADA'
  | 'PARTIDA_WO'
  | 'PARTIDA_CANCELADA'
  | 'USUARIO_CRIADO'
  | 'USUARIO_LOGIN'
  | 'USUARIO_LOGOUT'
  | 'ACESSO_NEGADO'

export async function registrarAuditoria(
  db: D1Database,
  params: {
    clube_id?: string
    usuario_id: string
    tipo_evento: TipoEvento
    entidade: string
    entidade_id?: string
    payload_resumido?: string
    ip_address?: string
  }
) {
  try {
    await db.prepare(`
      INSERT INTO auditoria (id, clube_id, usuario_id, tipo_evento, entidade, entidade_id, payload_resumido, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      generateId(),
      params.clube_id || null,
      params.usuario_id,
      params.tipo_evento,
      params.entidade,
      params.entidade_id || null,
      params.payload_resumido ? JSON.stringify(params.payload_resumido).substring(0, 500) : null,
      params.ip_address || null
    ).run()
  } catch (e) {
    console.error('Erro ao registrar auditoria:', e)
  }
}

export function getAuditoriaFromContext(c: Context<{ Bindings: Bindings; Variables: Variables }>) {
  const user = c.get('user') as JwtPayload
  return {
    db: c.env.DB,
    usuario_id: user?.sub || 'sistema',
    clube_id: user?.clube_id,
    ip_address: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')
  }
}
