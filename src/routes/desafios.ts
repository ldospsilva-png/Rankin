// ============================================================
// ROTAS - DESAFIOS
// ============================================================
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { requireAuth, requireClube } from '../middleware/auth'
import { registrarAuditoria, getAuditoriaFromContext } from '../middleware/audit'
import { generateId, successResponse, errorResponse } from '../utils'

const desafiosRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
desafiosRoutes.use('*', requireAuth())
desafiosRoutes.use('*', requireClube())

// GET /api/desafios - listar desafios do clube
desafiosRoutes.get('/', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { status, meus } = c.req.query()
    const user = c.get('user') as any

    // Buscar jogador atual
    const jogadorAtual = await db.prepare(`SELECT id FROM jogadores WHERE usuario_id = ? AND clube_id = ?`).bind(user.sub, clube_id).first<any>()

    let query = `
      SELECT d.*,
        jd.nome as desafiante_nome, jd.ranking_posicao as desafiante_ranking,
        je.nome as desafiado_nome, je.ranking_posicao as desafiado_ranking,
        cl.nome as classe_nome
      FROM desafios d
      LEFT JOIN jogadores jd ON jd.id = d.desafiante_id
      LEFT JOIN jogadores je ON je.id = d.desafiado_id
      LEFT JOIN classes cl ON cl.id = d.classe_id
      WHERE d.clube_id = ?
    `
    const params: any[] = [clube_id]

    if (status) { query += ` AND d.status = ?`; params.push(status) }
    if (meus === '1' && jogadorAtual) {
      query += ` AND (d.desafiante_id = ? OR d.desafiado_id = ?)`
      params.push(jogadorAtual.id, jogadorAtual.id)
    }
    query += ` ORDER BY d.created_at DESC LIMIT 50`

    const result = await db.prepare(query).bind(...params).all()
    return c.json(successResponse(result.results))
  } catch (e: any) { return c.json(errorResponse('Erro ao buscar desafios: ' + e.message), 500) }
})

// POST /api/desafios - criar desafio
desafiosRoutes.post('/', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const user = c.get('user') as any
    const { desafiado_id, mensagem } = await c.req.json()

    // Verificar se desafio está ativo
    const config = await db.prepare(`SELECT desafio_ativo FROM configuracoes_clube WHERE clube_id = ?`).bind(clube_id).first<any>()
    if (!config?.desafio_ativo) return c.json(errorResponse('Funcionalidade de desafio não está ativada neste clube', 'CHALLENGE_DISABLED'), 403)

    // Buscar jogador desafiante
    const desafiante = await db.prepare(`
      SELECT id, classe_id, inadimplente, status FROM jogadores WHERE usuario_id = ? AND clube_id = ?
    `).bind(user.sub, clube_id).first<any>()
    if (!desafiante) return c.json(errorResponse('Você não possui perfil de jogador neste clube'), 404)
    if (desafiante.status !== 'ATIVO') return c.json(errorResponse('Jogador inativo não pode desafiar'), 403)
    if (desafiante.inadimplente) return c.json(errorResponse('Jogadores inadimplentes não podem enviar desafios', 'INADIMPLENTE'), 403)

    // Validar desafiado
    const desafiado = await db.prepare(`
      SELECT id, classe_id, status, nome FROM jogadores WHERE id = ? AND clube_id = ?
    `).bind(desafiado_id, clube_id).first<any>()
    if (!desafiado) return c.json(errorResponse('Jogador desafiado não encontrado'), 404)
    if (desafiado.status !== 'ATIVO') return c.json(errorResponse('Jogador desafiado está inativo'), 400)
    if (desafiante.id === desafiado_id) return c.json(errorResponse('Você não pode desafiar a si mesmo'), 400)
    if (desafiante.classe_id !== desafiado.classe_id) return c.json(errorResponse('Desafios só são permitidos na mesma classe'), 400)

    // Verificar desafio pendente já existente
    const pendente = await db.prepare(`
      SELECT id FROM desafios WHERE clube_id = ? AND status = 'PENDENTE'
      AND ((desafiante_id = ? AND desafiado_id = ?) OR (desafiante_id = ? AND desafiado_id = ?))
    `).bind(clube_id, desafiante.id, desafiado_id, desafiado_id, desafiante.id).first()
    if (pendente) return c.json(errorResponse('Já existe um desafio pendente entre estes jogadores'), 409)

    const id = generateId()
    const dataExpiracao = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await db.prepare(`
      INSERT INTO desafios (id, clube_id, classe_id, desafiante_id, desafiado_id, status, mensagem, data_expiracao)
      VALUES (?, ?, ?, ?, ?, 'PENDENTE', ?, ?)
    `).bind(id, clube_id, desafiante.classe_id, desafiante.id, desafiado_id, mensagem || null, dataExpiracao).run()

    return c.json(successResponse({ id }, `Desafio enviado para ${desafiado.nome}!`), 201)
  } catch (e: any) { return c.json(errorResponse('Erro ao criar desafio: ' + e.message), 500) }
})

// PATCH /api/desafios/:id/responder
desafiosRoutes.patch('/:id/responder', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const user = c.get('user') as any
    const id = c.req.param('id')
    const { aceito } = await c.req.json()

    const desafio = await db.prepare(`SELECT * FROM desafios WHERE id = ? AND clube_id = ?`).bind(id, clube_id).first<any>()
    if (!desafio) return c.json(errorResponse('Desafio não encontrado'), 404)
    if (desafio.status !== 'PENDENTE') return c.json(errorResponse('Desafio não está pendente'), 400)

    // Validar que é o desafiado respondendo
    const jogador = await db.prepare(`SELECT id FROM jogadores WHERE usuario_id = ? AND clube_id = ?`).bind(user.sub, clube_id).first<any>()
    const isAdmin = user.perfil === 'ADMIN_CLUBE' || user.perfil === 'ADMIN_GLOBAL'
    if (!isAdmin && (!jogador || jogador.id !== desafio.desafiado_id)) {
      return c.json(errorResponse('Apenas o jogador desafiado pode responder'), 403)
    }

    const novoStatus = aceito ? 'ACEITO' : 'RECUSADO'
    await db.prepare(`
      UPDATE desafios SET status = ?, data_resposta = datetime('now'), updated_at = datetime('now') WHERE id = ?
    `).bind(novoStatus, id).run()

    if (aceito) {
      // Criar partida automaticamente
      const partidaId = generateId()
      const config = await db.prepare(`SELECT dias_para_wo FROM configuracoes_clube WHERE clube_id = ?`).bind(clube_id).first<any>()
      const dataLimite = new Date(Date.now() + (config?.dias_para_wo || 14) * 24 * 60 * 60 * 1000).toISOString()

      await db.prepare(`
        INSERT INTO partidas (id, clube_id, classe_id, jogador_a_id, jogador_b_id, status, data_limite, observacoes)
        VALUES (?, ?, ?, ?, ?, 'PENDENTE', ?, 'Partida de Desafio')
      `).bind(partidaId, clube_id, desafio.classe_id, desafio.desafiante_id, desafio.desafiado_id, dataLimite).run()

      await db.prepare(`UPDATE desafios SET partida_id = ?, updated_at = datetime('now') WHERE id = ?`).bind(partidaId, id).run()
    }

    return c.json(successResponse({ id, status: novoStatus }, aceito ? 'Desafio aceito! Partida criada.' : 'Desafio recusado.'))
  } catch (e: any) { return c.json(errorResponse('Erro ao responder desafio: ' + e.message), 500) }
})

export default desafiosRoutes
