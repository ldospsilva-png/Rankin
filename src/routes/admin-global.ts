// ============================================================
// ROTAS - ADMINISTRADOR GLOBAL
// ============================================================

import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { requireAuth, requirePerfil, hashPassword } from '../middleware/auth'
import { registrarAuditoria, getAuditoriaFromContext } from '../middleware/audit'
import { generateId, successResponse, errorResponse, paginate } from '../utils'

const adminGlobal = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Aplicar auth em todas as rotas
adminGlobal.use('*', requireAuth())
adminGlobal.use('*', requirePerfil('ADMIN_GLOBAL'))

// ===== CLUBES =====

// GET /api/admin/global/clubes
adminGlobal.get('/clubes', async (c) => {
  try {
    const { page = '1', limit = '20', status, busca } = c.req.query() as Record<string, string>
    const { offset, limit: l, page: p } = paginate(Number(page), Number(limit))

    const db = c.env.DB
    let query = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM usuarios u WHERE u.clube_id = c.id AND u.perfil = 'ADMIN_CLUBE') as total_admins,
        (SELECT COUNT(*) FROM jogadores j WHERE j.clube_id = c.id AND j.status = 'ATIVO') as total_jogadores,
        (SELECT COUNT(*) FROM classes cl WHERE cl.clube_id = c.id AND cl.status = 'ATIVA') as total_classes
      FROM clubes c WHERE 1=1
    `
    const params: any[] = []

    if (status) { query += ` AND c.status = ?`; params.push(status) }
    if (busca) { query += ` AND (c.nome LIKE ? OR c.cidade LIKE ?)`; params.push(`%${busca}%`, `%${busca}%`) }

    const total = await db.prepare(`SELECT COUNT(*) as n FROM clubes c WHERE 1=1 ${status ? 'AND c.status = ?' : ''} ${busca ? 'AND (c.nome LIKE ? OR c.cidade LIKE ?)' : ''}`)
      .bind(...params).first<any>()

    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
    params.push(l, offset)

    const result = await db.prepare(query).bind(...params).all()

    return c.json(successResponse({
      items: result.results,
      total: total?.n || 0,
      page: p,
      limit: l,
      pages: Math.ceil((total?.n || 0) / l)
    }))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao buscar clubes', 'DB_ERROR'), 500)
  }
})

// POST /api/admin/global/clubes
adminGlobal.post('/clubes', async (c) => {
  try {
    const body = await c.req.json()
    const { nome, cidade, estado, telefone, email_contato, data_fundacao } = body

    if (!nome) return c.json(errorResponse('Nome do clube é obrigatório'), 400)

    const db = c.env.DB
    const id = generateId()

    await db.prepare(`
      INSERT INTO clubes (id, nome, cidade, estado, telefone, email_contato, data_fundacao, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ATIVO')
    `).bind(id, nome.trim(), cidade || null, estado || null, telefone || null, email_contato || null, data_fundacao || null).run()

    // Criar configuração padrão
    await db.prepare(`
      INSERT INTO configuracoes_clube (id, clube_id, periodicidade_sorteio, limite_jogos_aberto_por_jogador, permitir_wo, dias_para_wo, pontos_vitoria, pontos_derrota, pontos_wo)
      VALUES (?, ?, 7, 3, 1, 14, 3, 1, 0)
    `).bind(generateId(), id).run()

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      clube_id: id,
      usuario_id: audit.usuario_id,
      tipo_evento: 'CLUBE_CRIADO',
      entidade: 'clubes',
      entidade_id: id,
      payload_resumido: `Clube criado: ${nome}`,
      ip_address: audit.ip_address
    })

    const clube = await db.prepare(`SELECT * FROM clubes WHERE id = ?`).bind(id).first()
    return c.json(successResponse(clube, 'Clube criado com sucesso'), 201)
  } catch (e: any) {
    return c.json(errorResponse('Erro ao criar clube', 'DB_ERROR'), 500)
  }
})

// GET /api/admin/global/clubes/:id
adminGlobal.get('/clubes/:id', async (c) => {
  try {
    const db = c.env.DB
    const id = c.req.param('id')

    const clube = await db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM usuarios u WHERE u.clube_id = c.id AND u.perfil = 'ADMIN_CLUBE') as total_admins,
        (SELECT COUNT(*) FROM jogadores j WHERE j.clube_id = c.id) as total_jogadores,
        (SELECT COUNT(*) FROM classes cl WHERE cl.clube_id = c.id) as total_classes,
        (SELECT COUNT(*) FROM rodadas r WHERE r.clube_id = c.id) as total_rodadas
      FROM clubes c WHERE c.id = ?
    `).bind(id).first()

    if (!clube) return c.json(errorResponse('Clube não encontrado'), 404)
    return c.json(successResponse(clube))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar clube'), 500)
  }
})

// PUT /api/admin/global/clubes/:id
adminGlobal.put('/clubes/:id', async (c) => {
  try {
    const db = c.env.DB
    const id = c.req.param('id')
    const body = await c.req.json()
    const { nome, cidade, estado, telefone, email_contato, data_fundacao } = body

    const existente = await db.prepare(`SELECT id FROM clubes WHERE id = ?`).bind(id).first()
    if (!existente) return c.json(errorResponse('Clube não encontrado'), 404)

    await db.prepare(`
      UPDATE clubes SET nome = ?, cidade = ?, estado = ?, telefone = ?, email_contato = ?,
        data_fundacao = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(nome?.trim() || null, cidade || null, estado || null, telefone || null,
      email_contato || null, data_fundacao || null, id).run()

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      clube_id: id, usuario_id: audit.usuario_id,
      tipo_evento: 'CLUBE_ATUALIZADO', entidade: 'clubes', entidade_id: id,
      payload_resumido: `Clube atualizado: ${nome}`
    })

    const clube = await db.prepare(`SELECT * FROM clubes WHERE id = ?`).bind(id).first()
    return c.json(successResponse(clube, 'Clube atualizado'))
  } catch (e) {
    return c.json(errorResponse('Erro ao atualizar clube'), 500)
  }
})

// PATCH /api/admin/global/clubes/:id/status
adminGlobal.patch('/clubes/:id/status', async (c) => {
  try {
    const db = c.env.DB
    const id = c.req.param('id')
    const { status } = await c.req.json()

    if (!['ATIVO', 'INATIVO'].includes(status)) {
      return c.json(errorResponse('Status inválido. Use: ATIVO ou INATIVO'), 400)
    }

    const existente = await db.prepare(`SELECT id, status FROM clubes WHERE id = ?`).bind(id).first<any>()
    if (!existente) return c.json(errorResponse('Clube não encontrado'), 404)

    await db.prepare(`UPDATE clubes SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(status, id).run()

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      clube_id: id, usuario_id: audit.usuario_id,
      tipo_evento: 'CLUBE_STATUS_ALTERADO', entidade: 'clubes', entidade_id: id,
      payload_resumido: `Status alterado de ${existente.status} para ${status}`
    })

    return c.json(successResponse({ id, status }, 'Status do clube atualizado'))
  } catch (e) {
    return c.json(errorResponse('Erro ao atualizar status'), 500)
  }
})

// POST /api/admin/global/clubes/:id/administradores
adminGlobal.post('/clubes/:id/administradores', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.req.param('id')
    const body = await c.req.json()
    const { nome, email, senha } = body

    if (!nome || !email || !senha) {
      return c.json(errorResponse('Campos obrigatórios: nome, email, senha'), 400)
    }

    const clube = await db.prepare(`SELECT id FROM clubes WHERE id = ? AND status = 'ATIVO'`).bind(clube_id).first()
    if (!clube) return c.json(errorResponse('Clube não encontrado ou inativo'), 404)

    const existente = await db.prepare(`SELECT id FROM usuarios WHERE email = ?`).bind(email.toLowerCase()).first()
    if (existente) return c.json(errorResponse('Email já cadastrado', 'EMAIL_EXISTS'), 409)

    const senhaHash = await hashPassword(senha)
    const id = generateId()

    await db.prepare(`
      INSERT INTO usuarios (id, nome, email, senha_hash, status, perfil, clube_id)
      VALUES (?, ?, ?, ?, 'ATIVO', 'ADMIN_CLUBE', ?)
    `).bind(id, nome.trim(), email.toLowerCase().trim(), senhaHash, clube_id).run()

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      clube_id, usuario_id: audit.usuario_id,
      tipo_evento: 'ADMIN_CLUBE_VINCULADO', entidade: 'usuarios', entidade_id: id,
      payload_resumido: `Admin vinculado: ${email} ao clube ${clube_id}`
    })

    return c.json(successResponse({ id, nome, email, perfil: 'ADMIN_CLUBE', clube_id }, 'Administrador criado e vinculado ao clube'), 201)
  } catch (e) {
    return c.json(errorResponse('Erro ao vincular administrador'), 500)
  }
})

// GET /api/admin/global/usuarios
adminGlobal.get('/usuarios', async (c) => {
  try {
    const db = c.env.DB
    const { perfil, clube_id, page = '1', limit = '20' } = c.req.query() as Record<string, string>
    const { offset, limit: l } = paginate(Number(page), Number(limit))

    let query = `
      SELECT u.id, u.nome, u.email, u.status, u.perfil, u.clube_id, u.ultimo_login, u.created_at,
        c.nome as clube_nome
      FROM usuarios u LEFT JOIN clubes c ON c.id = u.clube_id WHERE 1=1
    `
    const params: any[] = []

    if (perfil) { query += ` AND u.perfil = ?`; params.push(perfil) }
    if (clube_id) { query += ` AND u.clube_id = ?`; params.push(clube_id) }

    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
    params.push(l, offset)

    const result = await db.prepare(query).bind(...params).all()
    return c.json(successResponse(result.results))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar usuários'), 500)
  }
})

// GET /api/admin/global/auditoria
adminGlobal.get('/auditoria', async (c) => {
  try {
    const db = c.env.DB
    const { clube_id, tipo_evento, page = '1', limit = '50' } = c.req.query() as Record<string, string>
    const { offset, limit: l } = paginate(Number(page), Number(limit))

    let query = `
      SELECT a.*, u.nome as usuario_nome, u.email as usuario_email, c.nome as clube_nome
      FROM auditoria a
      LEFT JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN clubes c ON c.id = a.clube_id
      WHERE 1=1
    `
    const params: any[] = []

    if (clube_id) { query += ` AND a.clube_id = ?`; params.push(clube_id) }
    if (tipo_evento) { query += ` AND a.tipo_evento = ?`; params.push(tipo_evento) }

    const countQuery = `SELECT COUNT(*) as n FROM auditoria a WHERE 1=1 ${clube_id ? 'AND a.clube_id = ?' : ''} ${tipo_evento ? 'AND a.tipo_evento = ?' : ''}`
    const total = await db.prepare(countQuery).bind(...params).first<any>()

    query += ` ORDER BY a.data_evento DESC LIMIT ? OFFSET ?`
    params.push(l, offset)

    const result = await db.prepare(query).bind(...params).all()
    return c.json(successResponse({
      items: result.results,
      total: total?.n || 0,
      page: Number(page),
      limit: l
    }))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar auditoria'), 500)
  }
})

// GET /api/admin/global/dashboard
adminGlobal.get('/dashboard', async (c) => {
  try {
    const db = c.env.DB
    const stats = await Promise.all([
      db.prepare(`SELECT COUNT(*) as n FROM clubes`).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM clubes WHERE status = 'ATIVO'`).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM usuarios`).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM jogadores`).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM rodadas`).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM partidas WHERE status = 'PENDENTE'`).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM partidas WHERE status = 'FINALIZADA'`).first<any>(),
    ])

    const clubesRecentes = await db.prepare(`
      SELECT id, nome, status, cidade, estado, created_at FROM clubes ORDER BY created_at DESC LIMIT 5
    `).all()

    const eventosRecentes = await db.prepare(`
      SELECT a.tipo_evento, a.data_evento, a.entidade, a.payload_resumido, u.nome as usuario_nome, c.nome as clube_nome
      FROM auditoria a
      LEFT JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN clubes c ON c.id = a.clube_id
      ORDER BY a.data_evento DESC LIMIT 10
    `).all()

    // Estatísticas por clube
    const estatsClubes = await db.prepare(`
      SELECT c.id, c.nome, c.status,
        (SELECT COUNT(*) FROM jogadores j WHERE j.clube_id = c.id AND j.status = 'ATIVO') as jogadores_ativos,
        (SELECT COUNT(*) FROM rodadas r WHERE r.clube_id = c.id) as total_rodadas,
        (SELECT COUNT(*) FROM partidas p WHERE p.clube_id = c.id AND p.status = 'PENDENTE') as partidas_pendentes
      FROM clubes c ORDER BY jogadores_ativos DESC LIMIT 10
    `).all()

    return c.json(successResponse({
      total_clubes: stats[0]?.n || 0,
      clubes_ativos: stats[1]?.n || 0,
      total_usuarios: stats[2]?.n || 0,
      total_jogadores: stats[3]?.n || 0,
      total_rodadas: stats[4]?.n || 0,
      partidas_pendentes: stats[5]?.n || 0,
      partidas_finalizadas: stats[6]?.n || 0,
      clubes_recentes: clubesRecentes.results,
      eventos_recentes: eventosRecentes.results,
      stats_clubes: estatsClubes.results
    }))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar dashboard'), 500)
  }
})

// GET /api/admin/global/relatorios/jogadores - relatório de jogadores com filtros
adminGlobal.get('/relatorios/jogadores', async (c) => {
  try {
    const db = c.env.DB
    const { clube_id, classe_id, status, inadimplente, busca, page = '1', limit = '50' } = c.req.query() as Record<string, string>
    const { offset, limit: l } = paginate(Number(page), Number(limit))

    let query = `
      SELECT j.id, j.nome, j.email, j.telefone, j.status, j.pontos_total, j.ranking_posicao,
        j.jogos_abertos, j.inadimplente, j.dias_inadimplente, j.data_ultimo_pagamento, j.created_at,
        cl.nome as classe_nome, c.nome as clube_nome,
        (SELECT COUNT(*) FROM partidas p WHERE (p.jogador_a_id = j.id OR p.jogador_b_id = j.id) AND p.status = 'FINALIZADA') as total_jogos,
        (SELECT COUNT(*) FROM partidas p WHERE p.vencedor_id = j.id AND p.status = 'FINALIZADA') as vitorias
      FROM jogadores j
      LEFT JOIN classes cl ON cl.id = j.classe_id
      LEFT JOIN clubes c ON c.id = j.clube_id
      WHERE 1=1
    `
    const params: any[] = []

    if (clube_id) { query += ` AND j.clube_id = ?`; params.push(clube_id) }
    if (classe_id) { query += ` AND j.classe_id = ?`; params.push(classe_id) }
    if (status) { query += ` AND j.status = ?`; params.push(status) }
    if (inadimplente !== undefined && inadimplente !== '') { query += ` AND j.inadimplente = ?`; params.push(inadimplente === 'true' ? 1 : 0) }
    if (busca) { query += ` AND (j.nome LIKE ? OR j.email LIKE ?)`; params.push(`%${busca}%`, `%${busca}%`) }

    const countParams = [...params]
    const total = await db.prepare(`SELECT COUNT(*) as n FROM jogadores j LEFT JOIN classes cl ON cl.id = j.classe_id LEFT JOIN clubes c ON c.id = j.clube_id WHERE 1=1 ${clube_id ? 'AND j.clube_id = ?' : ''} ${classe_id ? 'AND j.classe_id = ?' : ''} ${status ? 'AND j.status = ?' : ''}`).bind(...countParams.slice(0, (clube_id ? 1 : 0) + (classe_id ? 1 : 0) + (status ? 1 : 0))).first<any>()

    query += ` ORDER BY c.nome, j.pontos_total DESC LIMIT ? OFFSET ?`
    params.push(l, offset)

    const result = await db.prepare(query).bind(...params).all()
    return c.json(successResponse({ items: result.results, total: total?.n || 0, page: Number(page), limit: l }))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao buscar relatório: ' + e.message), 500)
  }
})

// GET /api/admin/global/relatorios/pagamentos - relatório global de pagamentos
adminGlobal.get('/relatorios/pagamentos', async (c) => {
  try {
    const db = c.env.DB
    const { clube_id, status, referencia } = c.req.query() as Record<string, string>

    // Resumo global
    let filterClube = clube_id ? `AND p.clube_id = '${clube_id}'` : ''
    let filterRef = referencia ? `AND p.referencia = '${referencia}'` : ''
    let filterStatus = status ? `AND p.status = '${status}'` : ''

    const [adimplentes, inadimplentes, vencidos, total_arrecadado, vencendo_breve] = await Promise.all([
      db.prepare(`SELECT COUNT(*) as n, COALESCE(SUM(valor),0) as total FROM pagamentos p WHERE p.status = 'PAGO' ${filterClube} ${filterRef}`).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM pagamentos p WHERE p.status = 'PENDENTE' AND p.data_vencimento >= date('now') ${filterClube} ${filterRef}`).first<any>(),
      db.prepare(`SELECT COUNT(*) as n, COALESCE(SUM(valor),0) as total FROM pagamentos p WHERE p.status IN ('PENDENTE','VENCIDO') AND p.data_vencimento < date('now') ${filterClube} ${filterRef}`).first<any>(),
      db.prepare(`SELECT COALESCE(SUM(valor),0) as total FROM pagamentos p WHERE p.status = 'PAGO' ${filterClube} ${filterRef}`).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM pagamentos p WHERE p.status = 'PENDENTE' AND p.data_vencimento BETWEEN date('now') AND date('now', '+30 days') ${filterClube} ${filterRef}`).first<any>(),
    ])

    // Por clube
    const por_clube = await db.prepare(`
      SELECT c.nome as clube_nome, c.id as clube_id,
        COUNT(CASE WHEN p.status = 'PAGO' THEN 1 END) as pagos,
        COUNT(CASE WHEN p.status IN ('PENDENTE','VENCIDO') AND p.data_vencimento < date('now') THEN 1 END) as vencidos,
        COUNT(CASE WHEN p.status = 'PENDENTE' AND p.data_vencimento >= date('now') THEN 1 END) as pendentes,
        COALESCE(SUM(CASE WHEN p.status = 'PAGO' THEN p.valor END), 0) as total_arrecadado
      FROM clubes c
      LEFT JOIN pagamentos p ON p.clube_id = c.id ${filterRef}
      GROUP BY c.id, c.nome
      ORDER BY total_arrecadado DESC
    `).all()

    return c.json(successResponse({
      resumo: {
        adimplentes: adimplentes?.n || 0,
        total_recebido: adimplentes?.total || 0,
        inadimplentes: inadimplentes?.n || 0,
        vencidos: vencidos?.n || 0,
        valor_em_atraso: vencidos?.total || 0,
        vencendo_30_dias: vencendo_breve?.n || 0,
        total_arrecadado: total_arrecadado?.total || 0
      },
      por_clube: por_clube.results
    }))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao buscar relatório de pagamentos: ' + e.message), 500)
  }
})

// PATCH /api/admin/global/usuarios/:id/status
adminGlobal.patch('/usuarios/:id/status', async (c) => {
  try {
    const db = c.env.DB
    const id = c.req.param('id')
    const { status } = await c.req.json()

    if (!['ATIVO', 'INATIVO'].includes(status)) return c.json(errorResponse('Status inválido'), 400)

    const user = await db.prepare(`SELECT id, nome FROM usuarios WHERE id = ?`).bind(id).first<any>()
    if (!user) return c.json(errorResponse('Usuário não encontrado'), 404)

    await db.prepare(`UPDATE usuarios SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, id).run()

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      usuario_id: audit.usuario_id,
      tipo_evento: 'USUARIO_ATUALIZADO', entidade: 'usuarios', entidade_id: id,
      payload_resumido: `Status do usuário ${user.nome} alterado para ${status}`
    })

    return c.json(successResponse({ id, status }, 'Status atualizado'))
  } catch (e) {
    return c.json(errorResponse('Erro ao atualizar status'), 500)
  }
})

export default adminGlobal
