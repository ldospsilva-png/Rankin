// ============================================================
// ROTAS - ADMINISTRADOR DO CLUBE
// ============================================================

import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { requireAuth, requirePerfil, requireClube } from '../middleware/auth'
import { registrarAuditoria, getAuditoriaFromContext } from '../middleware/audit'
import { generateId, successResponse, errorResponse, paginate, gerarConfrontosPorRodada, shuffle } from '../utils'

const adminClube = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminClube.use('*', requireAuth())
adminClube.use('*', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'))
adminClube.use('*', requireClube())

// ===== CONTEXTO DO CLUBE =====
adminClube.get('/contexto', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string

    const clube = await db.prepare(`SELECT * FROM clubes WHERE id = ? AND status = 'ATIVO'`).bind(clube_id).first()
    if (!clube) return c.json(errorResponse('Clube não encontrado ou inativo'), 404)

    const config = await db.prepare(`SELECT * FROM configuracoes_clube WHERE clube_id = ?`).bind(clube_id).first()
    const stats = await Promise.all([
      db.prepare(`SELECT COUNT(*) as n FROM classes WHERE clube_id = ? AND status = 'ATIVA'`).bind(clube_id).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM jogadores WHERE clube_id = ? AND status = 'ATIVO'`).bind(clube_id).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM rodadas WHERE clube_id = ?`).bind(clube_id).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM partidas WHERE clube_id = ? AND status = 'PENDENTE'`).bind(clube_id).first<any>(),
    ])

    return c.json(successResponse({
      clube,
      configuracao: config,
      estatisticas: {
        total_classes: stats[0]?.n || 0,
        total_jogadores: stats[1]?.n || 0,
        total_rodadas: stats[2]?.n || 0,
        partidas_pendentes: stats[3]?.n || 0
      }
    }))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar contexto'), 500)
  }
})

// ===== CLASSES =====

adminClube.get('/classes', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { status } = c.req.query()

    let query = `
      SELECT cl.*, 
        (SELECT COUNT(*) FROM jogadores j WHERE j.classe_id = cl.id AND j.status = 'ATIVO') as total_jogadores_ativos,
        (SELECT COUNT(*) FROM jogadores j WHERE j.classe_id = cl.id) as total_jogadores
      FROM classes cl WHERE cl.clube_id = ?
    `
    const params: any[] = [clube_id]

    if (status) { query += ` AND cl.status = ?`; params.push(status) }
    query += ` ORDER BY cl.ordem ASC, cl.nome ASC`

    const result = await db.prepare(query).bind(...params).all()
    return c.json(successResponse(result.results))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar classes'), 500)
  }
})

adminClube.post('/classes', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { nome, descricao, ordem } = await c.req.json()

    if (!nome) return c.json(errorResponse('Nome da classe é obrigatório'), 400)

    // Verificar clube ativo
    const clube = await db.prepare(`SELECT id FROM clubes WHERE id = ? AND status = 'ATIVO'`).bind(clube_id).first()
    if (!clube) return c.json(errorResponse('Clube inativo'), 403)

    const id = generateId()
    await db.prepare(`
      INSERT INTO classes (id, clube_id, nome, descricao, ordem, status)
      VALUES (?, ?, ?, ?, ?, 'ATIVA')
    `).bind(id, clube_id, nome.trim(), descricao || null, ordem || 0).run()

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      clube_id, usuario_id: audit.usuario_id,
      tipo_evento: 'CLASSE_CRIADA', entidade: 'classes', entidade_id: id,
      payload_resumido: `Classe criada: ${nome}`
    })

    const classe = await db.prepare(`SELECT * FROM classes WHERE id = ?`).bind(id).first()
    return c.json(successResponse(classe, 'Classe criada'), 201)
  } catch (e) {
    return c.json(errorResponse('Erro ao criar classe'), 500)
  }
})

adminClube.put('/classes/:id', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const id = c.req.param('id')
    const { nome, descricao, ordem } = await c.req.json()

    const existente = await db.prepare(`SELECT id FROM classes WHERE id = ? AND clube_id = ?`).bind(id, clube_id).first()
    if (!existente) return c.json(errorResponse('Classe não encontrada'), 404)

    await db.prepare(`
      UPDATE classes SET nome = ?, descricao = ?, ordem = ?, updated_at = datetime('now') WHERE id = ? AND clube_id = ?
    `).bind(nome?.trim() || null, descricao || null, ordem || 0, id, clube_id).run()

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      clube_id, usuario_id: audit.usuario_id,
      tipo_evento: 'CLASSE_ATUALIZADA', entidade: 'classes', entidade_id: id,
      payload_resumido: `Classe atualizada: ${nome}`
    })

    const classe = await db.prepare(`SELECT * FROM classes WHERE id = ?`).bind(id).first()
    return c.json(successResponse(classe, 'Classe atualizada'))
  } catch (e) {
    return c.json(errorResponse('Erro ao atualizar classe'), 500)
  }
})

adminClube.patch('/classes/:id/status', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const id = c.req.param('id')
    const { status } = await c.req.json()

    if (!['ATIVA', 'INATIVA'].includes(status)) return c.json(errorResponse('Status inválido'), 400)

    const existente = await db.prepare(`SELECT id FROM classes WHERE id = ? AND clube_id = ?`).bind(id, clube_id).first()
    if (!existente) return c.json(errorResponse('Classe não encontrada'), 404)

    await db.prepare(`UPDATE classes SET status = ?, updated_at = datetime('now') WHERE id = ? AND clube_id = ?`)
      .bind(status, id, clube_id).run()

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      clube_id, usuario_id: audit.usuario_id,
      tipo_evento: 'CLASSE_STATUS_ALTERADA', entidade: 'classes', entidade_id: id,
      payload_resumido: `Status: ${status}`
    })

    return c.json(successResponse({ id, status }, 'Status da classe atualizado'))
  } catch (e) {
    return c.json(errorResponse('Erro ao atualizar status da classe'), 500)
  }
})

// ===== JOGADORES =====

adminClube.get('/jogadores', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { classe_id, status, busca, page = '1', limit = '50' } = c.req.query() as Record<string, string>
    const { offset, limit: l } = paginate(Number(page), Number(limit))

    let query = `
      SELECT j.*, cl.nome as classe_nome
      FROM jogadores j
      LEFT JOIN classes cl ON cl.id = j.classe_id
      WHERE j.clube_id = ?
    `
    const params: any[] = [clube_id]

    if (classe_id) { query += ` AND j.classe_id = ?`; params.push(classe_id) }
    if (status) { query += ` AND j.status = ?`; params.push(status) }
    if (busca) { query += ` AND (j.nome LIKE ? OR j.email LIKE ?)`; params.push(`%${busca}%`, `%${busca}%`) }

    query += ` ORDER BY j.ranking_posicao ASC, j.nome ASC LIMIT ? OFFSET ?`
    params.push(l, offset)

    const result = await db.prepare(query).bind(...params).all()
    return c.json(successResponse(result.results))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar jogadores'), 500)
  }
})

adminClube.post('/jogadores', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { nome, classe_id, telefone, email } = await c.req.json()

    if (!nome || !classe_id) return c.json(errorResponse('Nome e classe são obrigatórios'), 400)

    // Verificar que a classe pertence ao clube
    const classe = await db.prepare(`SELECT id FROM classes WHERE id = ? AND clube_id = ? AND status = 'ATIVA'`)
      .bind(classe_id, clube_id).first()
    if (!classe) return c.json(errorResponse('Classe não encontrada ou inativa neste clube'), 404)

    const id = generateId()
    await db.prepare(`
      INSERT INTO jogadores (id, clube_id, classe_id, nome, telefone, email, jogos_abertos, status)
      VALUES (?, ?, ?, ?, ?, ?, 0, 'ATIVO')
    `).bind(id, clube_id, classe_id, nome.trim(), telefone || null, email || null).run()

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      clube_id, usuario_id: audit.usuario_id,
      tipo_evento: 'JOGADOR_CRIADO', entidade: 'jogadores', entidade_id: id,
      payload_resumido: `Jogador criado: ${nome}, Classe: ${classe_id}`
    })

    const jogador = await db.prepare(`
      SELECT j.*, cl.nome as classe_nome FROM jogadores j LEFT JOIN classes cl ON cl.id = j.classe_id WHERE j.id = ?
    `).bind(id).first()
    return c.json(successResponse(jogador, 'Jogador criado'), 201)
  } catch (e) {
    return c.json(errorResponse('Erro ao criar jogador'), 500)
  }
})

adminClube.put('/jogadores/:id', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const id = c.req.param('id')
    const { nome, classe_id, telefone, email } = await c.req.json()

    const existente = await db.prepare(`SELECT id FROM jogadores WHERE id = ? AND clube_id = ?`).bind(id, clube_id).first()
    if (!existente) return c.json(errorResponse('Jogador não encontrado'), 404)

    if (classe_id) {
      const classe = await db.prepare(`SELECT id FROM classes WHERE id = ? AND clube_id = ?`).bind(classe_id, clube_id).first()
      if (!classe) return c.json(errorResponse('Classe não pertence a este clube'), 400)
    }

    await db.prepare(`
      UPDATE jogadores SET nome = ?, classe_id = ?, telefone = ?, email = ?, updated_at = datetime('now')
      WHERE id = ? AND clube_id = ?
    `).bind(nome?.trim() || null, classe_id || null, telefone || null, email || null, id, clube_id).run()

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      clube_id, usuario_id: audit.usuario_id,
      tipo_evento: 'JOGADOR_ATUALIZADO', entidade: 'jogadores', entidade_id: id,
      payload_resumido: `Jogador atualizado: ${nome}`
    })

    const jogador = await db.prepare(`
      SELECT j.*, cl.nome as classe_nome FROM jogadores j LEFT JOIN classes cl ON cl.id = j.classe_id WHERE j.id = ?
    `).bind(id).first()
    return c.json(successResponse(jogador, 'Jogador atualizado'))
  } catch (e) {
    return c.json(errorResponse('Erro ao atualizar jogador'), 500)
  }
})

adminClube.patch('/jogadores/:id/status', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const id = c.req.param('id')
    const { status } = await c.req.json()

    if (!['ATIVO', 'INATIVO'].includes(status)) return c.json(errorResponse('Status inválido'), 400)

    const existente = await db.prepare(`SELECT id FROM jogadores WHERE id = ? AND clube_id = ?`).bind(id, clube_id).first()
    if (!existente) return c.json(errorResponse('Jogador não encontrado'), 404)

    await db.prepare(`UPDATE jogadores SET status = ?, updated_at = datetime('now') WHERE id = ? AND clube_id = ?`)
      .bind(status, id, clube_id).run()

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      clube_id, usuario_id: audit.usuario_id,
      tipo_evento: 'JOGADOR_STATUS_ALTERADO', entidade: 'jogadores', entidade_id: id,
      payload_resumido: `Status: ${status}`
    })

    return c.json(successResponse({ id, status }, 'Status do jogador atualizado'))
  } catch (e) {
    return c.json(errorResponse('Erro ao atualizar status'), 500)
  }
})

// ===== CONFIGURAÇÕES =====

adminClube.get('/configuracoes', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string

    const config = await db.prepare(`SELECT * FROM configuracoes_clube WHERE clube_id = ?`).bind(clube_id).first()
    if (!config) return c.json(errorResponse('Configuração não encontrada'), 404)

    return c.json(successResponse(config))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar configurações'), 500)
  }
})

adminClube.put('/configuracoes', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const body = await c.req.json()
    const {
      periodicidade_sorteio, limite_jogos_aberto_por_jogador, permitir_wo, dias_para_wo,
      pontos_vitoria, pontos_derrota, pontos_wo,
      limite_quadras, formato_set, desafio_ativo,
      dias_inadimplencia_bloqueio, dias_inadimplencia_inativacao, valor_mensalidade,
      pix_chave, pix_titular, whatsapp_notificacoes, email_notificacoes,
      instagram_url, facebook_url
    } = body

    await db.prepare(`
      UPDATE configuracoes_clube 
      SET periodicidade_sorteio = ?, limite_jogos_aberto_por_jogador = ?, permitir_wo = ?,
          dias_para_wo = ?, pontos_vitoria = ?, pontos_derrota = ?, pontos_wo = ?,
          limite_quadras = ?, formato_set = ?, desafio_ativo = ?,
          dias_inadimplencia_bloqueio = ?, dias_inadimplencia_inativacao = ?,
          valor_mensalidade = ?, pix_chave = ?, pix_titular = ?,
          whatsapp_notificacoes = ?, email_notificacoes = ?,
          instagram_url = ?, facebook_url = ?,
          updated_at = datetime('now')
      WHERE clube_id = ?
    `).bind(
      periodicidade_sorteio || 7, limite_jogos_aberto_por_jogador || 3, permitir_wo ?? 1,
      dias_para_wo || 14, pontos_vitoria || 3, pontos_derrota || 1, pontos_wo ?? 0,
      limite_quadras || 4, formato_set || '3SETS', desafio_ativo ? 1 : 0,
      dias_inadimplencia_bloqueio || 10, dias_inadimplencia_inativacao || 20,
      valor_mensalidade || 0, pix_chave || null, pix_titular || null,
      whatsapp_notificacoes ? 1 : 0, email_notificacoes ? 1 : 0,
      instagram_url || null, facebook_url || null,
      clube_id
    ).run()

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      clube_id, usuario_id: audit.usuario_id,
      tipo_evento: 'CONFIGURACAO_ATUALIZADA', entidade: 'configuracoes_clube', entidade_id: clube_id,
      payload_resumido: `Configurações atualizadas: limite=${limite_jogos_aberto_por_jogador}, periodicidade=${periodicidade_sorteio}`
    })

    const config = await db.prepare(`SELECT * FROM configuracoes_clube WHERE clube_id = ?`).bind(clube_id).first()
    return c.json(successResponse(config, 'Configurações atualizadas'))
  } catch (e) {
    return c.json(errorResponse('Erro ao atualizar configurações'), 500)
  }
})

// ===== SORTEIOS =====

adminClube.post('/sorteios', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const user = c.get('user') as any
    const { classe_id } = await c.req.json()

    if (!classe_id) return c.json(errorResponse('Classe é obrigatória para o sorteio'), 400)

    // Verificar clube ativo
    const clube = await db.prepare(`SELECT id FROM clubes WHERE id = ? AND status = 'ATIVO'`).bind(clube_id).first()
    if (!clube) return c.json(errorResponse('Clube inativo'), 403)

    // Verificar classe do clube
    const classe = await db.prepare(`SELECT id, nome FROM classes WHERE id = ? AND clube_id = ? AND status = 'ATIVA'`)
      .bind(classe_id, clube_id).first<any>()
    if (!classe) return c.json(errorResponse('Classe não encontrada ou inativa'), 404)

    // Buscar configurações
    const config = await db.prepare(`SELECT * FROM configuracoes_clube WHERE clube_id = ?`).bind(clube_id).first<any>()
    const limite = config?.limite_jogos_aberto_por_jogador || 3

    // Buscar jogadores ativos da classe
    const todosJogadores = await db.prepare(`
      SELECT id, nome, jogos_abertos FROM jogadores 
      WHERE clube_id = ? AND classe_id = ? AND status = 'ATIVO'
      ORDER BY nome
    `).bind(clube_id, classe_id).all<any>()

    const jogadoresElegiveis = todosJogadores.results.filter((j: any) => j.jogos_abertos < limite)
    const jogadoresExcluidos = todosJogadores.results.filter((j: any) => j.jogos_abertos >= limite)

    if (jogadoresElegiveis.length < 2) {
      return c.json(errorResponse(
        `Jogadores elegíveis insuficientes. Elegíveis: ${jogadoresElegiveis.length}. Excluídos por limite de jogos abertos: ${jogadoresExcluidos.length}`,
        'INSUFFICIENT_PLAYERS'
      ), 400)
    }

    // Definir número da rodada
    const ultimaRodada = await db.prepare(`
      SELECT MAX(numero) as max_num FROM rodadas WHERE clube_id = ? AND classe_id = ?
    `).bind(clube_id, classe_id).first<any>()
    const numeroRodada = (ultimaRodada?.max_num || 0) + 1

    // Gerar confrontos
    const idsElegiveis = jogadoresElegiveis.map((j: any) => j.id)
    const confrontos = gerarConfrontosPorRodada(idsElegiveis)

    if (confrontos.length === 0) {
      return c.json(errorResponse('Não foi possível gerar confrontos'), 400)
    }

    // Transação: criar rodada + partidas
    const rodadaId = generateId()
    const diasLimite = config?.dias_para_wo || 14
    const dataLimite = new Date(Date.now() + diasLimite * 24 * 60 * 60 * 1000).toISOString()

    await db.prepare(`
      INSERT INTO rodadas (id, clube_id, classe_id, numero, executado_por_usuario_id, status, total_partidas, total_jogadores_elegiveis, total_jogadores_excluidos)
      VALUES (?, ?, ?, ?, ?, 'ATIVA', ?, ?, ?)
    `).bind(rodadaId, clube_id, classe_id, numeroRodada, user.sub, confrontos.length, jogadoresElegiveis.length, jogadoresExcluidos.length).run()

    // Criar partidas em batch
    for (const [jogadorAId, jogadorBId] of confrontos) {
      const partidaId = generateId()
      await db.prepare(`
        INSERT INTO partidas (id, clube_id, classe_id, rodada_id, jogador_a_id, jogador_b_id, status, data_limite)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDENTE', ?)
      `).bind(partidaId, clube_id, classe_id, rodadaId, jogadorAId, jogadorBId, dataLimite).run()
    }

    // Atualizar jogos_abertos de cada jogador nas partidas geradas
    const jogadoresNasPartidas = new Set<string>()
    for (const [a, b] of confrontos) { jogadoresNasPartidas.add(a); jogadoresNasPartidas.add(b) }
    
    for (const jId of jogadoresNasPartidas) {
      await db.prepare(`
        UPDATE jogadores SET jogos_abertos = (
          SELECT COUNT(*) FROM partidas 
          WHERE (jogador_a_id = ? OR jogador_b_id = ?) 
          AND clube_id = ? AND status IN ('PENDENTE', 'EM_ANDAMENTO')
        ), updated_at = datetime('now') WHERE id = ?
      `).bind(jId, jId, clube_id, jId).run()
    }

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      clube_id, usuario_id: audit.usuario_id,
      tipo_evento: 'RODADA_GERADA', entidade: 'rodadas', entidade_id: rodadaId,
      payload_resumido: `Rodada ${numeroRodada} gerada. Classe: ${classe.nome}. ${confrontos.length} confrontos. ${jogadoresExcluidos.length} excluídos por limite.`
    })

    // Buscar partidas geradas com detalhes
    const partidas = await db.prepare(`
      SELECT p.*, 
        ja.nome as jogador_a_nome, jb.nome as jogador_b_nome
      FROM partidas p
      LEFT JOIN jogadores ja ON ja.id = p.jogador_a_id
      LEFT JOIN jogadores jb ON jb.id = p.jogador_b_id
      WHERE p.rodada_id = ?
      ORDER BY p.created_at ASC
    `).bind(rodadaId).all()

    return c.json(successResponse({
      rodada: { id: rodadaId, numero: numeroRodada, classe_id, total_partidas: confrontos.length },
      jogadores_elegiveis: jogadoresElegiveis.length,
      jogadores_excluidos: jogadoresExcluidos.length,
      jogadores_excluidos_detalhes: jogadoresExcluidos,
      partidas: partidas.results
    }, `Rodada ${numeroRodada} gerada com ${confrontos.length} confrontos`), 201)

  } catch (e: any) {
    console.error('Erro no sorteio:', e)
    return c.json(errorResponse('Erro ao gerar sorteio: ' + e.message, 'DRAW_ERROR'), 500)
  }
})

// ===== RODADAS =====

adminClube.get('/rodadas', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { classe_id, status, page = '1', limit = '20' } = c.req.query() as Record<string, string>
    const { offset, limit: l } = paginate(Number(page), Number(limit))

    let query = `
      SELECT r.*, cl.nome as classe_nome, u.nome as executado_por_nome
      FROM rodadas r
      LEFT JOIN classes cl ON cl.id = r.classe_id
      LEFT JOIN usuarios u ON u.id = r.executado_por_usuario_id
      WHERE r.clube_id = ?
    `
    const params: any[] = [clube_id]

    if (classe_id) { query += ` AND r.classe_id = ?`; params.push(classe_id) }
    if (status) { query += ` AND r.status = ?`; params.push(status) }

    query += ` ORDER BY r.data_execucao DESC LIMIT ? OFFSET ?`
    params.push(l, offset)

    const result = await db.prepare(query).bind(...params).all()
    return c.json(successResponse(result.results))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar rodadas'), 500)
  }
})

adminClube.get('/rodadas/:id', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const id = c.req.param('id')

    const rodada = await db.prepare(`
      SELECT r.*, cl.nome as classe_nome, u.nome as executado_por_nome
      FROM rodadas r
      LEFT JOIN classes cl ON cl.id = r.classe_id
      LEFT JOIN usuarios u ON u.id = r.executado_por_usuario_id
      WHERE r.id = ? AND r.clube_id = ?
    `).bind(id, clube_id).first()

    if (!rodada) return c.json(errorResponse('Rodada não encontrada'), 404)

    const partidas = await db.prepare(`
      SELECT p.*, 
        ja.nome as jogador_a_nome, jb.nome as jogador_b_nome,
        v.nome as vencedor_nome
      FROM partidas p
      LEFT JOIN jogadores ja ON ja.id = p.jogador_a_id
      LEFT JOIN jogadores jb ON jb.id = p.jogador_b_id
      LEFT JOIN jogadores v ON v.id = p.vencedor_id
      WHERE p.rodada_id = ? ORDER BY p.created_at ASC
    `).bind(id).all()

    return c.json(successResponse({ rodada, partidas: partidas.results }))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar rodada'), 500)
  }
})

adminClube.patch('/rodadas/:id/status', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const id = c.req.param('id')
    const { status } = await c.req.json()

    if (!['ATIVA', 'ENCERRADA', 'CANCELADA'].includes(status)) return c.json(errorResponse('Status inválido'), 400)

    const rodada = await db.prepare(`SELECT id FROM rodadas WHERE id = ? AND clube_id = ?`).bind(id, clube_id).first()
    if (!rodada) return c.json(errorResponse('Rodada não encontrada'), 404)

    await db.prepare(`UPDATE rodadas SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, id).run()

    const audit = getAuditoriaFromContext(c)
    await registrarAuditoria(audit.db, {
      clube_id, usuario_id: audit.usuario_id,
      tipo_evento: status === 'ENCERRADA' ? 'RODADA_ENCERRADA' : 'RODADA_CANCELADA',
      entidade: 'rodadas', entidade_id: id,
      payload_resumido: `Status da rodada: ${status}`
    })

    return c.json(successResponse({ id, status }))
  } catch (e) {
    return c.json(errorResponse('Erro ao atualizar rodada'), 500)
  }
})

// ===== PARTIDAS =====

adminClube.get('/partidas', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { classe_id, rodada_id, status, page = '1', limit = '50' } = c.req.query() as Record<string, string>
    const { offset, limit: l } = paginate(Number(page), Number(limit))

    let query = `
      SELECT p.*, 
        ja.nome as jogador_a_nome, jb.nome as jogador_b_nome,
        cl.nome as classe_nome, v.nome as vencedor_nome,
        r.numero as rodada_numero
      FROM partidas p
      LEFT JOIN jogadores ja ON ja.id = p.jogador_a_id
      LEFT JOIN jogadores jb ON jb.id = p.jogador_b_id
      LEFT JOIN classes cl ON cl.id = p.classe_id
      LEFT JOIN jogadores v ON v.id = p.vencedor_id
      LEFT JOIN rodadas r ON r.id = p.rodada_id
      WHERE p.clube_id = ?
    `
    const params: any[] = [clube_id]

    if (classe_id) { query += ` AND p.classe_id = ?`; params.push(classe_id) }
    if (rodada_id) { query += ` AND p.rodada_id = ?`; params.push(rodada_id) }
    if (status) { query += ` AND p.status = ?`; params.push(status) }

    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
    params.push(l, offset)

    const result = await db.prepare(query).bind(...params).all()
    return c.json(successResponse(result.results))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar partidas'), 500)
  }
})

adminClube.patch('/partidas/:id', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const id = c.req.param('id')
    const { status, vencedor_id, placar_a, placar_b, observacoes } = await c.req.json()

    const partida = await db.prepare(`SELECT * FROM partidas WHERE id = ? AND clube_id = ?`).bind(id, clube_id).first<any>()
    if (!partida) return c.json(errorResponse('Partida não encontrada'), 404)

    if (!['PENDENTE', 'EM_ANDAMENTO', 'FINALIZADA', 'WO', 'CANCELADA'].includes(status)) {
      return c.json(errorResponse('Status inválido'), 400)
    }

    const statusFinal = ['FINALIZADA', 'WO', 'CANCELADA'].includes(status)
    const dataFinalizacao = statusFinal ? new Date().toISOString() : null

    // Validar vencedor
    if ((status === 'FINALIZADA' || status === 'WO') && vencedor_id) {
      const valido = vencedor_id === partida.jogador_a_id || vencedor_id === partida.jogador_b_id
      if (!valido) return c.json(errorResponse('Vencedor não é participante desta partida'), 400)
    }

    await db.prepare(`
      UPDATE partidas SET status = ?, vencedor_id = ?, placar_a = ?, placar_b = ?,
        observacoes = ?, data_finalizacao = ?, updated_at = datetime('now')
      WHERE id = ? AND clube_id = ?
    `).bind(
      status, vencedor_id || null, placar_a || null, placar_b || null,
      observacoes || null, dataFinalizacao, id, clube_id
    ).run()

    // Atualizar jogos_abertos de ambos os jogadores
    for (const jId of [partida.jogador_a_id, partida.jogador_b_id]) {
      await db.prepare(`
        UPDATE jogadores SET jogos_abertos = (
          SELECT COUNT(*) FROM partidas 
          WHERE (jogador_a_id = ? OR jogador_b_id = ?) 
          AND clube_id = ? AND status IN ('PENDENTE', 'EM_ANDAMENTO')
        ), updated_at = datetime('now') WHERE id = ?
      `).bind(jId, jId, clube_id, jId).run()
    }

    // Atualizar pontos se finalizada
    if (status === 'FINALIZADA' && vencedor_id) {
      const config = await db.prepare(`SELECT * FROM configuracoes_clube WHERE clube_id = ?`).bind(clube_id).first<any>()
      const pontosVitoria = config?.pontos_vitoria || 3
      const pontosDerrota = config?.pontos_derrota || 1

      const perdedorId = vencedor_id === partida.jogador_a_id ? partida.jogador_b_id : partida.jogador_a_id

      await db.prepare(`UPDATE jogadores SET pontos_total = pontos_total + ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(pontosVitoria, vencedor_id).run()
      await db.prepare(`UPDATE jogadores SET pontos_total = pontos_total + ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(pontosDerrota, perdedorId).run()
    } else if (status === 'WO' && vencedor_id) {
      const config = await db.prepare(`SELECT * FROM configuracoes_clube WHERE clube_id = ?`).bind(clube_id).first<any>()
      const pontosWo = config?.pontos_wo || 0
      await db.prepare(`UPDATE jogadores SET pontos_total = pontos_total + ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(pontosWo, vencedor_id).run()
    }

    const audit = getAuditoriaFromContext(c)
    const tipoEvento = status === 'FINALIZADA' ? 'PARTIDA_FINALIZADA' : status === 'WO' ? 'PARTIDA_WO' : status === 'CANCELADA' ? 'PARTIDA_CANCELADA' : 'PARTIDA_ATUALIZADA'
    await registrarAuditoria(audit.db, {
      clube_id, usuario_id: audit.usuario_id,
      tipo_evento: tipoEvento as any, entidade: 'partidas', entidade_id: id,
      payload_resumido: `Status: ${status}, Vencedor: ${vencedor_id}`
    })

    // Atualizar ranking por pontos
    await recalcularRanking(db, clube_id, partida.classe_id)

    const partidaAtualizada = await db.prepare(`
      SELECT p.*, ja.nome as jogador_a_nome, jb.nome as jogador_b_nome, v.nome as vencedor_nome
      FROM partidas p
      LEFT JOIN jogadores ja ON ja.id = p.jogador_a_id
      LEFT JOIN jogadores jb ON jb.id = p.jogador_b_id
      LEFT JOIN jogadores v ON v.id = p.vencedor_id
      WHERE p.id = ?
    `).bind(id).first()

    return c.json(successResponse(partidaAtualizada, 'Partida atualizada'))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao atualizar partida: ' + e.message), 500)
  }
})

// ===== RANKING =====

adminClube.get('/ranking', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { classe_id } = c.req.query()

    let query = `
      SELECT j.*, cl.nome as classe_nome,
        (SELECT COUNT(*) FROM partidas p WHERE (p.jogador_a_id = j.id OR p.jogador_b_id = j.id) AND p.clube_id = ?) as total_jogos,
        (SELECT COUNT(*) FROM partidas p WHERE p.vencedor_id = j.id AND p.status = 'FINALIZADA' AND p.clube_id = ?) as vitorias,
        (SELECT COUNT(*) FROM partidas p WHERE (p.jogador_a_id = j.id OR p.jogador_b_id = j.id) AND p.status = 'FINALIZADA' AND p.vencedor_id != j.id AND p.clube_id = ?) as derrotas
      FROM jogadores j
      LEFT JOIN classes cl ON cl.id = j.classe_id
      WHERE j.clube_id = ? AND j.status = 'ATIVO'
    `
    const params: any[] = [clube_id, clube_id, clube_id, clube_id]

    if (classe_id) { query += ` AND j.classe_id = ?`; params.push(classe_id) }
    query += ` ORDER BY j.pontos_total DESC, vitorias DESC, j.nome ASC`

    const result = await db.prepare(query).bind(...params).all()
    return c.json(successResponse(result.results))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar ranking'), 500)
  }
})

// ===== DASHBOARD DO CLUBE =====
adminClube.get('/dashboard', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string

    const stats = await Promise.all([
      db.prepare(`SELECT COUNT(*) as n FROM classes WHERE clube_id = ? AND status = 'ATIVA'`).bind(clube_id).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM jogadores WHERE clube_id = ? AND status = 'ATIVO'`).bind(clube_id).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM rodadas WHERE clube_id = ?`).bind(clube_id).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM partidas WHERE clube_id = ? AND status = 'PENDENTE'`).bind(clube_id).first<any>(),
      db.prepare(`SELECT COUNT(*) as n FROM partidas WHERE clube_id = ? AND status = 'FINALIZADA'`).bind(clube_id).first<any>(),
    ])

    const classeStats = await db.prepare(`
      SELECT cl.nome, COUNT(j.id) as total_jogadores,
        COUNT(CASE WHEN j.jogos_abertos >= cc.limite_jogos_aberto_por_jogador THEN 1 END) as jogadores_bloqueados
      FROM classes cl
      LEFT JOIN jogadores j ON j.classe_id = cl.id AND j.status = 'ATIVO'
      LEFT JOIN configuracoes_clube cc ON cc.clube_id = cl.clube_id
      WHERE cl.clube_id = ? AND cl.status = 'ATIVA'
      GROUP BY cl.id, cl.nome
    `).bind(clube_id).all()

    const ultimasRodadas = await db.prepare(`
      SELECT r.*, cl.nome as classe_nome
      FROM rodadas r LEFT JOIN classes cl ON cl.id = r.classe_id
      WHERE r.clube_id = ? ORDER BY r.data_execucao DESC LIMIT 5
    `).bind(clube_id).all()

    return c.json(successResponse({
      total_classes: stats[0]?.n || 0,
      total_jogadores: stats[1]?.n || 0,
      total_rodadas: stats[2]?.n || 0,
      partidas_pendentes: stats[3]?.n || 0,
      partidas_finalizadas: stats[4]?.n || 0,
      classes_stats: classeStats.results,
      ultimas_rodadas: ultimasRodadas.results
    }))
  } catch (e) {
    return c.json(errorResponse('Erro ao buscar dashboard'), 500)
  }
})

// ===== FUNÇÃO AUXILIAR: Recalcular Ranking =====
async function recalcularRanking(db: D1Database, clube_id: string, classe_id: string) {
  try {
    const jogadores = await db.prepare(`
      SELECT id, pontos_total FROM jogadores 
      WHERE clube_id = ? AND classe_id = ? AND status = 'ATIVO'
      ORDER BY pontos_total DESC
    `).bind(clube_id, classe_id).all<any>()

    for (let i = 0; i < jogadores.results.length; i++) {
      await db.prepare(`UPDATE jogadores SET ranking_posicao = ? WHERE id = ?`)
        .bind(i + 1, jogadores.results[i].id).run()
    }
  } catch (e) {
    console.error('Erro ao recalcular ranking:', e)
  }
}

export default adminClube
