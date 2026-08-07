// ============================================================
// ROTAS - ÁREA DO JOGADOR (APRIMORADO)
// ============================================================

import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { requireAuth } from '../middleware/auth'
import { successResponse, errorResponse } from '../utils'

const jogadorRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

jogadorRoutes.use('*', requireAuth())

// GET /api/jogador/dashboard - Dashboard completo do jogador
jogadorRoutes.get('/dashboard', async (c) => {
  try {
    const db = c.env.DB
    const user = c.get('user') as any

    if (!user.clube_id) return c.json(errorResponse('Contexto de clube não encontrado'), 403)

    // Buscar jogador vinculado
    const jogador = await db.prepare(`
      SELECT j.*, cl.nome as classe_nome, c.nome as clube_nome
      FROM jogadores j
      LEFT JOIN classes cl ON cl.id = j.classe_id
      LEFT JOIN clubes c ON c.id = j.clube_id
      WHERE j.usuario_id = ? AND j.clube_id = ? AND j.status = 'ATIVO'
      LIMIT 1
    `).bind(user.sub, user.clube_id).first<any>()

    if (!jogador) {
      return c.json(successResponse({
        jogador: null,
        proximos_jogos: [],
        ultimos_resultados: [],
        posicao_ranking: null,
        insights: {}
      }))
    }

    // Próximos jogos (partidas em aberto)
    const proximos_jogos = await db.prepare(`
      SELECT p.*,
        ja.nome as jogador_a_nome, jb.nome as jogador_b_nome,
        cl.nome as classe_nome, r.numero as rodada_numero
      FROM partidas p
      LEFT JOIN jogadores ja ON ja.id = p.jogador_a_id
      LEFT JOIN jogadores jb ON jb.id = p.jogador_b_id
      LEFT JOIN classes cl ON cl.id = p.classe_id
      LEFT JOIN rodadas r ON r.id = p.rodada_id
      WHERE (p.jogador_a_id = ? OR p.jogador_b_id = ?) AND p.clube_id = ?
        AND p.status IN ('PENDENTE', 'EM_ANDAMENTO')
      ORDER BY p.data_limite ASC, p.created_at ASC
      LIMIT 5
    `).bind(jogador.id, jogador.id, user.clube_id).all<any>()

    // Últimos 2 resultados
    const ultimos_resultados = await db.prepare(`
      SELECT p.*,
        ja.nome as jogador_a_nome, jb.nome as jogador_b_nome,
        v.nome as vencedor_nome, cl.nome as classe_nome, r.numero as rodada_numero
      FROM partidas p
      LEFT JOIN jogadores ja ON ja.id = p.jogador_a_id
      LEFT JOIN jogadores jb ON jb.id = p.jogador_b_id
      LEFT JOIN jogadores v ON v.id = p.vencedor_id
      LEFT JOIN classes cl ON cl.id = p.classe_id
      LEFT JOIN rodadas r ON r.id = p.rodada_id
      WHERE (p.jogador_a_id = ? OR p.jogador_b_id = ?) AND p.clube_id = ?
        AND p.status = 'FINALIZADA'
      ORDER BY p.updated_at DESC
      LIMIT 2
    `).bind(jogador.id, jogador.id, user.clube_id).all<any>()

    // Posição no ranking
    const posicao = await db.prepare(`
      SELECT COUNT(*) as posicao FROM jogadores
      WHERE clube_id = ? AND classe_id = ? AND status = 'ATIVO'
        AND pontos_total > (SELECT pontos_total FROM jogadores WHERE id = ?)
    `).bind(user.clube_id, jogador.classe_id, jogador.id).first<any>()

    // Total de jogadores na classe
    const total_classe = await db.prepare(`
      SELECT COUNT(*) as total FROM jogadores
      WHERE clube_id = ? AND classe_id = ? AND status = 'ATIVO'
    `).bind(user.clube_id, jogador.classe_id).first<any>()

    // Insights: vitórias, derrotas, aproveitamento
    const stats = await db.prepare(`
      SELECT
        COUNT(CASE WHEN status = 'FINALIZADA' THEN 1 END) as jogos_finalizados,
        COUNT(CASE WHEN vencedor_id = ? AND status = 'FINALIZADA' THEN 1 END) as vitorias,
        COUNT(CASE WHEN status IN ('PENDENTE','EM_ANDAMENTO') THEN 1 END) as jogos_abertos_count
      FROM partidas
      WHERE (jogador_a_id = ? OR jogador_b_id = ?) AND clube_id = ?
    `).bind(jogador.id, jogador.id, jogador.id, user.clube_id).first<any>()

    const vitorias = stats?.vitorias || 0
    const jogos = stats?.jogos_finalizados || 0
    const derrotas = jogos - vitorias

    // Pagamentos em aberto
    let pagamento_pendente = null
    try {
      pagamento_pendente = await db.prepare(`
        SELECT p.*, CAST((julianday('now') - julianday(p.data_vencimento)) AS INTEGER) as dias_atraso
        FROM pagamentos p
        WHERE p.jogador_id = ? AND p.status IN ('PENDENTE','VENCIDO')
        ORDER BY p.data_vencimento ASC LIMIT 1
      `).bind(jogador.id).first<any>()
    } catch(e) {}

    // Desafios pendentes recebidos
    let desafios_pendentes = 0
    try {
      const d = await db.prepare(`
        SELECT COUNT(*) as n FROM desafios
        WHERE desafiado_id = ? AND status = 'PENDENTE'
      `).bind(jogador.id).first<any>()
      desafios_pendentes = d?.n || 0
    } catch(e) {}

    return c.json(successResponse({
      jogador,
      proximos_jogos: proximos_jogos.results,
      ultimos_resultados: ultimos_resultados.results,
      posicao_ranking: (posicao?.posicao || 0) + 1,
      total_jogadores_classe: total_classe?.total || 0,
      insights: {
        vitorias,
        derrotas,
        jogos_finalizados: jogos,
        jogos_abertos: stats?.jogos_abertos_count || 0,
        aproveitamento: jogos > 0 ? Math.round((vitorias / jogos) * 100) : 0
      },
      pagamento_pendente,
      desafios_pendentes
    }))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao buscar dashboard: ' + e.message), 500)
  }
})

// GET /api/jogador/perfil
jogadorRoutes.get('/perfil', async (c) => {
  try {
    const db = c.env.DB
    const user = c.get('user') as any

    const jogador = await db.prepare(`
      SELECT j.*, cl.nome as classe_nome, c.nome as clube_nome
      FROM jogadores j
      LEFT JOIN classes cl ON cl.id = j.classe_id
      LEFT JOIN clubes c ON c.id = j.clube_id
      WHERE j.usuario_id = ? AND j.clube_id = ?
      LIMIT 1
    `).bind(user.sub, user.clube_id || '').first()

    const usuario = await db.prepare(`
      SELECT id, nome, email, perfil, clube_id, ultimo_login, created_at FROM usuarios WHERE id = ?
    `).bind(user.sub).first()

    return c.json(successResponse({ usuario, jogador }))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar perfil'), 500)
  }
})

// GET /api/jogador/ranking
jogadorRoutes.get('/ranking', async (c) => {
  try {
    const db = c.env.DB
    const user = c.get('user') as any
    const { classe_id } = c.req.query()

    if (!user.clube_id) return c.json(errorResponse('Contexto de clube não encontrado'), 403)

    let query = `
      SELECT j.id, j.nome, j.pontos_total, j.ranking_posicao, j.jogos_abertos, cl.nome as classe_nome,
        (SELECT COUNT(*) FROM partidas p WHERE (p.jogador_a_id = j.id OR p.jogador_b_id = j.id) AND p.status = 'FINALIZADA') as jogos_realizados,
        (SELECT COUNT(*) FROM partidas p WHERE p.vencedor_id = j.id AND p.status = 'FINALIZADA') as vitorias
      FROM jogadores j
      LEFT JOIN classes cl ON cl.id = j.classe_id
      WHERE j.clube_id = ? AND j.status = 'ATIVO'
    `
    const params: any[] = [user.clube_id]

    if (classe_id) { query += ` AND j.classe_id = ?`; params.push(classe_id) }
    query += ` ORDER BY j.pontos_total DESC, vitorias DESC, j.nome ASC`

    const result = await db.prepare(query).bind(...params).all()
    return c.json(successResponse(result.results))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar ranking'), 500)
  }
})

// GET /api/jogador/classes - classes do clube para filtro de ranking
jogadorRoutes.get('/classes', async (c) => {
  try {
    const db = c.env.DB
    const user = c.get('user') as any
    if (!user.clube_id) return c.json(successResponse([]))
    const classes = await db.prepare(`
      SELECT id, nome FROM classes WHERE clube_id = ? AND status = 'ATIVA' ORDER BY nome
    `).bind(user.clube_id).all()
    return c.json(successResponse(classes.results))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar classes'), 500)
  }
})

// GET /api/jogador/partidas
jogadorRoutes.get('/partidas', async (c) => {
  try {
    const db = c.env.DB
    const user = c.get('user') as any
    const { status } = c.req.query()

    if (!user.clube_id) return c.json(errorResponse('Contexto de clube não encontrado'), 403)

    const jogador = await db.prepare(`SELECT id FROM jogadores WHERE usuario_id = ? AND clube_id = ?`)
      .bind(user.sub, user.clube_id).first<any>()

    if (!jogador) return c.json(successResponse([]))

    let query = `
      SELECT p.*,
        ja.nome as jogador_a_nome, jb.nome as jogador_b_nome,
        v.nome as vencedor_nome, cl.nome as classe_nome, r.numero as rodada_numero
      FROM partidas p
      LEFT JOIN jogadores ja ON ja.id = p.jogador_a_id
      LEFT JOIN jogadores jb ON jb.id = p.jogador_b_id
      LEFT JOIN jogadores v ON v.id = p.vencedor_id
      LEFT JOIN classes cl ON cl.id = p.classe_id
      LEFT JOIN rodadas r ON r.id = p.rodada_id
      WHERE (p.jogador_a_id = ? OR p.jogador_b_id = ?) AND p.clube_id = ?
    `
    const params: any[] = [jogador.id, jogador.id, user.clube_id]

    if (status) { query += ` AND p.status = ?`; params.push(status) }
    query += ` ORDER BY p.created_at DESC`

    const result = await db.prepare(query).bind(...params).all()
    return c.json(successResponse(result.results))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar partidas'), 500)
  }
})

// GET /api/jogador/rodadas
jogadorRoutes.get('/rodadas', async (c) => {
  try {
    const db = c.env.DB
    const user = c.get('user') as any

    if (!user.clube_id) return c.json(errorResponse('Contexto de clube não encontrado'), 403)

    const rodadas = await db.prepare(`
      SELECT r.*, cl.nome as classe_nome,
        (SELECT COUNT(*) FROM partidas p WHERE p.rodada_id = r.id AND (p.jogador_a_id = (SELECT id FROM jogadores WHERE usuario_id = ? AND clube_id = ?) OR p.jogador_b_id = (SELECT id FROM jogadores WHERE usuario_id = ? AND clube_id = ?))) as minha_partidas
      FROM rodadas r
      LEFT JOIN classes cl ON cl.id = r.classe_id
      WHERE r.clube_id = ?
      ORDER BY r.data_execucao DESC
      LIMIT 20
    `).bind(user.sub, user.clube_id, user.sub, user.clube_id, user.clube_id).all()

    return c.json(successResponse(rodadas.results))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar rodadas'), 500)
  }
})

// GET /api/jogador/publicacoes - feed de publicações
jogadorRoutes.get('/publicacoes', async (c) => {
  try {
    const db = c.env.DB
    const user = c.get('user') as any
    if (!user.clube_id) return c.json(successResponse([]))

    try {
      const pubs = await db.prepare(`
        SELECT p.*, u.nome as autor_nome
        FROM publicacoes p
        LEFT JOIN usuarios u ON u.id = p.autor_id
        WHERE p.clube_id = ? AND p.status = 'ATIVO'
        ORDER BY p.fixado DESC, p.created_at DESC
        LIMIT 20
      `).bind(user.clube_id).all()
      return c.json(successResponse(pubs.results))
    } catch(e) {
      return c.json(successResponse([]))
    }
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar publicações'), 500)
  }
})

// GET /api/jogador/desafios - desafios do jogador
jogadorRoutes.get('/desafios', async (c) => {
  try {
    const db = c.env.DB
    const user = c.get('user') as any
    if (!user.clube_id) return c.json(successResponse([]))

    const jogador = await db.prepare(`SELECT id FROM jogadores WHERE usuario_id = ? AND clube_id = ?`)
      .bind(user.sub, user.clube_id).first<any>()
    if (!jogador) return c.json(successResponse([]))

    try {
      const desafios = await db.prepare(`
        SELECT d.*,
          jd.nome as desafiante_nome, jdo.nome as desafiado_nome, cl.nome as classe_nome
        FROM desafios d
        LEFT JOIN jogadores jd ON jd.id = d.desafiante_id
        LEFT JOIN jogadores jdo ON jdo.id = d.desafiado_id
        LEFT JOIN classes cl ON cl.id = d.classe_id
        WHERE (d.desafiante_id = ? OR d.desafiado_id = ?) AND d.clube_id = ?
        ORDER BY d.created_at DESC LIMIT 10
      `).bind(jogador.id, jogador.id, user.clube_id).all()
      return c.json(successResponse(desafios.results))
    } catch(e) {
      return c.json(successResponse([]))
    }
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar desafios'), 500)
  }
})

// GET /api/jogador/adversarios - jogadores da mesma classe para desafiar
jogadorRoutes.get('/adversarios', async (c) => {
  try {
    const db = c.env.DB
    const user = c.get('user') as any
    if (!user.clube_id) return c.json(successResponse([]))

    const jogador = await db.prepare(`SELECT id, classe_id FROM jogadores WHERE usuario_id = ? AND clube_id = ?`)
      .bind(user.sub, user.clube_id).first<any>()
    if (!jogador) return c.json(successResponse([]))

    const adversarios = await db.prepare(`
      SELECT j.id, j.nome, j.pontos_total, j.ranking_posicao, j.jogos_abertos
      FROM jogadores j
      WHERE j.clube_id = ? AND j.classe_id = ? AND j.id != ? AND j.status = 'ATIVO'
      ORDER BY j.pontos_total DESC
    `).bind(user.clube_id, jogador.classe_id, jogador.id).all()
    return c.json(successResponse(adversarios.results))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar adversários'), 500)
  }
})

// POST /api/jogador/desafios - criar desafio
jogadorRoutes.post('/desafios', async (c) => {
  try {
    const db = c.env.DB
    const user = c.get('user') as any
    if (!user.clube_id) return c.json(errorResponse('Contexto não encontrado'), 403)

    const { desafiado_id, mensagem } = await c.req.json()
    if (!desafiado_id) return c.json(errorResponse('Desafiado é obrigatório'), 400)

    const jogador = await db.prepare(`SELECT id, classe_id FROM jogadores WHERE usuario_id = ? AND clube_id = ?`)
      .bind(user.sub, user.clube_id).first<any>()
    if (!jogador) return c.json(errorResponse('Jogador não encontrado'), 404)

    // Verificar se clube tem desafio ativo
    const config = await db.prepare(`SELECT desafio_ativo, limite_jogos_aberto_por_jogador FROM configuracoes_clube WHERE clube_id = ?`)
      .bind(user.clube_id).first<any>()
    if (!config?.desafio_ativo) return c.json(errorResponse('Módulo de desafios não está ativo neste clube'), 403)

    // Verificar limite de jogos abertos
    const jAtual = await db.prepare(`SELECT jogos_abertos FROM jogadores WHERE id = ?`).bind(jogador.id).first<any>()
    if ((jAtual?.jogos_abertos || 0) >= (config?.limite_jogos_aberto_por_jogador || 3)) {
      return c.json(errorResponse('Você atingiu o limite de jogos em aberto'), 400)
    }

    try {
      const { generateId } = await import('../utils')
      const id = generateId()
      const dataExpiracao = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      await db.prepare(`
        INSERT INTO desafios (id, clube_id, classe_id, desafiante_id, desafiado_id, mensagem, data_expiracao)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(id, user.clube_id, jogador.classe_id, jogador.id, desafiado_id, mensagem || null, dataExpiracao).run()
      return c.json(successResponse({ id }, 'Desafio enviado!'), 201)
    } catch(e: any) {
      return c.json(errorResponse('Tabela de desafios não disponível. Execute a migration 0003.'), 503)
    }
  } catch (e: any) {
    return c.json(errorResponse('Erro ao criar desafio: ' + e.message), 500)
  }
})

// PATCH /api/jogador/desafios/:id - responder desafio
jogadorRoutes.patch('/desafios/:id', async (c) => {
  try {
    const db = c.env.DB
    const user = c.get('user') as any
    const id = c.req.param('id')
    const { resposta } = await c.req.json() // 'ACEITO' | 'RECUSADO'

    const jogador = await db.prepare(`SELECT id FROM jogadores WHERE usuario_id = ? AND clube_id = ?`)
      .bind(user.sub, user.clube_id).first<any>()
    if (!jogador) return c.json(errorResponse('Jogador não encontrado'), 404)

    try {
      await db.prepare(`
        UPDATE desafios SET status = ?, data_resposta = datetime('now'), updated_at = datetime('now')
        WHERE id = ? AND desafiado_id = ? AND status = 'PENDENTE'
      `).bind(resposta, id, jogador.id).run()
      return c.json(successResponse(null, `Desafio ${resposta === 'ACEITO' ? 'aceito' : 'recusado'}`))
    } catch(e) {
      return c.json(errorResponse('Erro ao responder desafio'), 500)
    }
  } catch (e: any) {
    return c.json(errorResponse('Erro: ' + e.message), 500)
  }
})

export default jogadorRoutes
