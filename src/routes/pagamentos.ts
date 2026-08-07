// ============================================================
// ROTAS - PAGAMENTOS
// ============================================================
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { requireAuth, requirePerfil, requireClube } from '../middleware/auth'
import { registrarAuditoria, getAuditoriaFromContext } from '../middleware/audit'
import { generateId, successResponse, errorResponse, paginate } from '../utils'

const pagamentosRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
pagamentosRoutes.use('*', requireAuth())
pagamentosRoutes.use('*', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'))
pagamentosRoutes.use('*', requireClube())

// GET /api/admin/clube/pagamentos
pagamentosRoutes.get('/', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { status, referencia, jogador_id, vencimento_de, vencimento_ate, page = '1', limit = '50' } = c.req.query() as Record<string, string>
    const { offset, limit: l } = paginate(Number(page), Number(limit))

    let query = `
      SELECT p.*, j.nome as jogador_nome, j.email as jogador_email, j.telefone as jogador_telefone,
        cl.nome as classe_nome
      FROM pagamentos p
      LEFT JOIN jogadores j ON j.id = p.jogador_id
      LEFT JOIN classes cl ON cl.id = j.classe_id
      WHERE p.clube_id = ?
    `
    const params: any[] = [clube_id]
    if (status) { query += ` AND p.status = ?`; params.push(status) }
    if (referencia) { query += ` AND p.referencia = ?`; params.push(referencia) }
    if (jogador_id) { query += ` AND p.jogador_id = ?`; params.push(jogador_id) }
    if (vencimento_de) { query += ` AND p.data_vencimento >= ?`; params.push(vencimento_de) }
    if (vencimento_ate) { query += ` AND p.data_vencimento <= ?`; params.push(vencimento_ate) }

    const countQ = `SELECT COUNT(*) as n FROM pagamentos p WHERE p.clube_id = ?
      ${status ? 'AND p.status = ?' : ''} ${referencia ? 'AND p.referencia = ?' : ''}
      ${jogador_id ? 'AND p.jogador_id = ?' : ''}`
    const total = await db.prepare(countQ).bind(...params.slice(0, params.length)).first<any>()

    query += ` ORDER BY p.data_vencimento ASC LIMIT ? OFFSET ?`
    params.push(l, offset)

    const result = await db.prepare(query).bind(...params).all()
    return c.json(successResponse({ items: result.results, total: total?.n || 0, page: Number(page), limit: l }))
  } catch (e: any) { return c.json(errorResponse('Erro ao buscar pagamentos: ' + e.message), 500) }
})

// GET /api/admin/clube/pagamentos/resumo
pagamentosRoutes.get('/resumo', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { referencia } = c.req.query()

    const refFilter = referencia ? `AND p.referencia = '${referencia}'` : ''

    const [adimplentes, inadimplentes, vencidos, total_arrecadado] = await Promise.all([
      db.prepare(`SELECT COUNT(*) as n FROM pagamentos p WHERE p.clube_id = ? AND p.status = 'PAGO' ${refFilter}`).bind(clube_id).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM pagamentos p WHERE p.clube_id = ? AND p.status = 'PENDENTE' AND p.data_vencimento >= date('now') ${refFilter}`).bind(clube_id).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM pagamentos p WHERE p.clube_id = ? AND p.status IN ('PENDENTE','VENCIDO') AND p.data_vencimento < date('now') ${refFilter}`).bind(clube_id).first<any>(),
      db.prepare(`SELECT COALESCE(SUM(p.valor),0) as total FROM pagamentos p WHERE p.clube_id = ? AND p.status = 'PAGO' ${refFilter}`).bind(clube_id).first<any>(),
    ])

    // Vencendo nos próximos 7 dias
    const vencendo_breve = await db.prepare(`
      SELECT COUNT(*) as n FROM pagamentos p WHERE p.clube_id = ? AND p.status = 'PENDENTE'
      AND p.data_vencimento BETWEEN date('now') AND date('now', '+7 days') ${refFilter}
    `).bind(clube_id).first<any>()

    // Top inadimplentes
    const top_inadimplentes = await db.prepare(`
      SELECT j.nome, j.telefone, j.email, p.referencia, p.data_vencimento, p.valor,
        CAST((julianday('now') - julianday(p.data_vencimento)) AS INTEGER) as dias_atraso
      FROM pagamentos p
      LEFT JOIN jogadores j ON j.id = p.jogador_id
      WHERE p.clube_id = ? AND p.status IN ('PENDENTE','VENCIDO') AND p.data_vencimento < date('now')
      ORDER BY p.data_vencimento ASC LIMIT 10
    `).bind(clube_id).all()

    return c.json(successResponse({
      adimplentes: adimplentes?.n || 0,
      a_vencer: inadimplentes?.n || 0,
      vencidos: vencidos?.n || 0,
      vencendo_breve: vencendo_breve?.n || 0,
      total_arrecadado: total_arrecadado?.total || 0,
      top_inadimplentes: top_inadimplentes.results
    }))
  } catch (e: any) { return c.json(errorResponse('Erro ao buscar resumo'), 500) }
})

// POST /api/admin/clube/pagamentos
pagamentosRoutes.post('/', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { jogador_id, valor, referencia, data_vencimento, metodo_pagamento, observacoes } = await c.req.json()
    if (!jogador_id || !valor || !referencia || !data_vencimento) return c.json(errorResponse('Campos obrigatórios: jogador_id, valor, referencia, data_vencimento'), 400)

    const jogador = await db.prepare(`SELECT id FROM jogadores WHERE id = ? AND clube_id = ?`).bind(jogador_id, clube_id).first()
    if (!jogador) return c.json(errorResponse('Jogador não encontrado neste clube'), 404)

    const id = generateId()
    await db.prepare(`
      INSERT INTO pagamentos (id, clube_id, jogador_id, valor, referencia, status, metodo_pagamento, data_vencimento, observacoes)
      VALUES (?, ?, ?, ?, ?, 'PENDENTE', ?, ?, ?)
    `).bind(id, clube_id, jogador_id, valor, referencia, metodo_pagamento || null, data_vencimento, observacoes || null).run()

    return c.json(successResponse({ id }, 'Cobrança criada'), 201)
  } catch (e: any) { return c.json(errorResponse('Erro ao criar pagamento: ' + e.message), 500) }
})

// POST /api/admin/clube/pagamentos/lote
pagamentosRoutes.post('/lote', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { referencia, data_vencimento, classe_id } = await c.req.json()
    if (!referencia || !data_vencimento) return c.json(errorResponse('referencia e data_vencimento obrigatórios'), 400)

    const config = await db.prepare(`SELECT * FROM configuracoes_clube WHERE clube_id = ?`).bind(clube_id).first<any>()
    const valor = config?.valor_mensalidade || 0

    let query = `SELECT id FROM jogadores WHERE clube_id = ? AND status = 'ATIVO'`
    const params: any[] = [clube_id]
    if (classe_id) { query += ` AND classe_id = ?`; params.push(classe_id) }

    const jogadores = await db.prepare(query).bind(...params).all<any>()
    let criados = 0

    for (const j of jogadores.results) {
      const existe = await db.prepare(`SELECT id FROM pagamentos WHERE clube_id = ? AND jogador_id = ? AND referencia = ?`)
        .bind(clube_id, j.id, referencia).first()
      if (!existe) {
        await db.prepare(`INSERT INTO pagamentos (id, clube_id, jogador_id, valor, referencia, status, data_vencimento) VALUES (?, ?, ?, ?, ?, 'PENDENTE', ?)`)
          .bind(generateId(), clube_id, j.id, valor, referencia, data_vencimento).run()
        criados++
      }
    }

    return c.json(successResponse({ criados, total_jogadores: jogadores.results.length }, `${criados} cobranças criadas`), 201)
  } catch (e: any) { return c.json(errorResponse('Erro ao gerar lote: ' + e.message), 500) }
})

// PATCH /api/admin/clube/pagamentos/:id
pagamentosRoutes.patch('/:id', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const id = c.req.param('id')
    const { status, metodo_pagamento, codigo_transacao, observacoes } = await c.req.json()

    const pag = await db.prepare(`SELECT * FROM pagamentos WHERE id = ? AND clube_id = ?`).bind(id, clube_id).first<any>()
    if (!pag) return c.json(errorResponse('Pagamento não encontrado'), 404)

    const dataPagamento = status === 'PAGO' ? new Date().toISOString().split('T')[0] : null
    await db.prepare(`
      UPDATE pagamentos SET status = ?, metodo_pagamento = ?, codigo_transacao = ?,
        observacoes = ?, data_pagamento = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(status, metodo_pagamento || pag.metodo_pagamento, codigo_transacao || null, observacoes || null, dataPagamento, id).run()

    // Atualizar inadimplência do jogador
    await atualizarInadimplenciaJogador(db, pag.jogador_id, clube_id)

    return c.json(successResponse({ id, status }, 'Pagamento atualizado'))
  } catch (e: any) { return c.json(errorResponse('Erro ao atualizar pagamento'), 500) }
})

// POST /api/admin/clube/pagamentos/verificar-inadimplencia
pagamentosRoutes.post('/verificar-inadimplencia', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const config = await db.prepare(`SELECT * FROM configuracoes_clube WHERE clube_id = ?`).bind(clube_id).first<any>()
    const diasBloqueio = config?.dias_inadimplencia_bloqueio || 10
    const diasInativacao = config?.dias_inadimplencia_inativacao || 20

    // Marcar pagamentos vencidos
    await db.prepare(`
      UPDATE pagamentos SET status = 'VENCIDO', updated_at = datetime('now')
      WHERE clube_id = ? AND status = 'PENDENTE' AND data_vencimento < date('now')
    `).bind(clube_id).run()

    const jogadores = await db.prepare(`SELECT id FROM jogadores WHERE clube_id = ? AND status = 'ATIVO'`).bind(clube_id).all<any>()
    let bloqueados = 0, inativados = 0

    for (const j of jogadores.results) {
      await atualizarInadimplenciaJogador(db, j.id, clube_id, diasBloqueio, diasInativacao)
      const jAtual = await db.prepare(`SELECT inadimplente, status FROM jogadores WHERE id = ?`).bind(j.id).first<any>()
      if (jAtual?.inadimplente) bloqueados++
      if (jAtual?.status === 'INATIVO') inativados++
    }

    return c.json(successResponse({ bloqueados, inativados, total_verificados: jogadores.results.length }, 'Verificação concluída'))
  } catch (e: any) { return c.json(errorResponse('Erro na verificação: ' + e.message), 500) }
})

async function atualizarInadimplenciaJogador(db: D1Database, jogadorId: string, clubeId: string, diasBloqueio = 10, diasInativacao = 20) {
  const pgAtrasado = await db.prepare(`
    SELECT MAX(CAST((julianday('now') - julianday(data_vencimento)) AS INTEGER)) as max_atraso
    FROM pagamentos WHERE jogador_id = ? AND clube_id = ? AND status IN ('PENDENTE','VENCIDO') AND data_vencimento < date('now')
  `).bind(jogadorId, clubeId).first<any>()

  const diasAtraso = pgAtrasado?.max_atraso || 0
  const inadimplente = diasAtraso >= diasBloqueio ? 1 : 0
  const novoStatus = diasAtraso >= diasInativacao ? 'INATIVO' : 'ATIVO'

  await db.prepare(`
    UPDATE jogadores SET inadimplente = ?, dias_inadimplente = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(inadimplente, diasAtraso, novoStatus, jogadorId).run()
}

export default pagamentosRoutes
