// ============================================================
// ROTAS - MÓDULO DE TORNEIOS
// ============================================================

import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { requireAuth, requirePerfil, requireClube } from '../middleware/auth'
import { generateId, successResponse, errorResponse } from '../utils'

const torneios = new Hono<{ Bindings: Bindings; Variables: Variables }>()

torneios.use('*', requireAuth())
torneios.use('*', requireClube())

// ============================================================
// 5.1 LISTAGEM E 5.2 CRUD DE TORNEIOS
// ============================================================

// Listar Torneios do Clube com Filtro/Agrupamento por Status
torneios.get('/', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { status } = c.req.query()

    let sql = `
      SELECT t.*, 
        (SELECT COUNT(*) FROM torneio_categorias tc WHERE tc.torneio_id = t.id) as total_categorias
      FROM torneios t
      WHERE t.clube_id = ?
    `
    const params: any[] = [clube_id]

    if (status) {
      sql += ` AND t.status = ?`
      params.push(status)
    }

    sql += ` ORDER BY t.created_at DESC`

    const res = await db.prepare(sql).bind(...params).all()
    return c.json(successResponse(res.results))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao buscar torneios: ' + e.message), 500)
  }
})

// Obter Detalhes do Torneio
torneios.get('/:id', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const id = c.req.param('id')

    const torneio = await db.prepare(`
      SELECT * FROM torneios WHERE id = ? AND clube_id = ?
    `).bind(id, clube_id).first<any>()

    if (!torneio) return c.json(errorResponse('Torneio não encontrado'), 404)

    const categorias = await db.prepare(`
      SELECT tc.*, cl.nome as classe_nome,
        (SELECT COUNT(*) FROM torneio_inscricoes ti WHERE ti.categoria_id = tc.id AND ti.status IN ('CONFIRMADA','PAGA')) as total_inscritos,
        (SELECT COUNT(*) FROM torneio_partidas tp WHERE tp.categoria_id = tc.id) as total_partidas
      FROM torneio_categorias tc
      LEFT JOIN classes cl ON cl.id = tc.classe_id
      WHERE tc.torneio_id = ?
      ORDER BY tc.created_at ASC
    `).bind(id).all()

    return c.json(successResponse({
      ...torneio,
      categorias: categorias.results
    }))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao buscar torneio: ' + e.message), 500)
  }
})

// Criar Torneio
torneios.post('/', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'), async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const body = await c.req.json()
    const { nome, data_inicio, data_fim, descricao, status = 'INSCRICOES' } = body

    if (!nome || !data_inicio || !data_fim) {
      return c.json(errorResponse('Campos obrigatórios: nome, data_inicio, data_fim'), 400)
    }

    const id = generateId()
    await db.prepare(`
      INSERT INTO torneios (id, clube_id, nome, descricao, data_inicio, data_fim, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, clube_id, nome.trim(), descricao || null, data_inicio, data_fim, status).run()

    const torneio = await db.prepare(`SELECT * FROM torneios WHERE id = ?`).bind(id).first()
    return c.json(successResponse(torneio, 'Torneio criado com sucesso!'), 201)
  } catch (e: any) {
    return c.json(errorResponse('Erro ao criar torneio: ' + e.message), 500)
  }
})

// Editar Torneio
torneios.put('/:id', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'), async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const id = c.req.param('id')
    const body = await c.req.json()
    const { nome, data_inicio, data_fim, descricao, status } = body

    await db.prepare(`
      UPDATE torneios SET nome = ?, data_inicio = ?, data_fim = ?, descricao = ?, status = ?, updated_at = datetime('now')
      WHERE id = ? AND clube_id = ?
    `).bind(nome, data_inicio, data_fim, descricao || null, status || 'INSCRICOES', id, clube_id).run()

    const torneio = await db.prepare(`SELECT * FROM torneios WHERE id = ?`).bind(id).first()
    return c.json(successResponse(torneio, 'Torneio atualizado!'))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao atualizar torneio: ' + e.message), 500)
  }
})

// Excluir Torneio
torneios.delete('/:id', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'), async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const id = c.req.param('id')

    await db.prepare(`DELETE FROM torneios WHERE id = ? AND clube_id = ?`).bind(id, clube_id).run()
    return c.json(successResponse(null, 'Torneio excluído com sucesso!'))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao excluir torneio: ' + e.message), 500)
  }
})

// ============================================================
// 5.3 CATEGORIAS DO TORNEIO
// ============================================================

// Listar Categorias do Torneio
torneios.get('/:id/categorias', async (c) => {
  try {
    const db = c.env.DB
    const id = c.req.param('id')

    const res = await db.prepare(`
      SELECT tc.*, cl.nome as classe_nome,
        (SELECT COUNT(*) FROM torneio_inscricoes ti WHERE ti.categoria_id = tc.id AND ti.status IN ('CONFIRMADA','PAGA')) as total_inscritos
      FROM torneio_categorias tc
      LEFT JOIN classes cl ON cl.id = tc.classe_id
      WHERE tc.torneio_id = ?
      ORDER BY tc.created_at ASC
    `).bind(id).all()

    return c.json(successResponse(res.results))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao buscar categorias: ' + e.message), 500)
  }
})

// Criar Categoria no Torneio
torneios.post('/:id/categorias', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'), async (c) => {
  try {
    const db = c.env.DB
    const torneio_id = c.req.param('id')
    const body = await c.req.json()
    const { nome, classe_id, formato_jogo = 'ELIMINATORIO', formato_set = 'SET_PRO', max_participantes = 16 } = body

    if (!nome) return c.json(errorResponse('Nome da categoria é obrigatório'), 400)

    const catId = generateId()
    await db.prepare(`
      INSERT INTO torneio_categorias (id, torneio_id, classe_id, nome, formato_jogo, formato_set, max_participantes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'RASCUNHO')
    `).bind(catId, torneio_id, classe_id || null, nome.trim(), formato_jogo, formato_set, max_participantes).run()

    const cat = await db.prepare(`SELECT * FROM torneio_categorias WHERE id = ?`).bind(catId).first()
    return c.json(successResponse(cat, 'Categoria criada com sucesso!'), 201)
  } catch (e: any) {
    return c.json(errorResponse('Erro ao criar categoria: ' + e.message), 500)
  }
})

// Editar Categoria (Apenas RASCUNHO ou INSCRICOES - Regra do documento)
torneios.put('/:id/categorias/:catId', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'), async (c) => {
  try {
    const db = c.env.DB
    const catId = c.req.param('catId')
    const body = await c.req.json()
    const { nome, classe_id, formato_jogo, formato_set, max_participantes } = body

    const cat = await db.prepare(`SELECT status FROM torneio_categorias WHERE id = ?`).bind(catId).first<any>()
    if (!cat) return c.json(errorResponse('Categoria não encontrada'), 404)

    // Regra do documento: Edição só é possível em RASCUNHO ou INSCRICOES
    if (!['RASCUNHO', 'INSCRICOES'].includes(cat.status)) {
      return c.json(errorResponse('Edição de categoria só é permitida em RASCUNHO ou INSCRICOES. Status atual: ' + cat.status), 400)
    }

    await db.prepare(`
      UPDATE torneio_categorias 
      SET nome = ?, classe_id = ?, formato_jogo = ?, formato_set = ?, max_participantes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(nome, classe_id || null, formato_jogo, formato_set, max_participantes, catId).run()

    const updatedCat = await db.prepare(`SELECT * FROM torneio_categorias WHERE id = ?`).bind(catId).first()
    return c.json(successResponse(updatedCat, 'Categoria atualizada!'))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao atualizar categoria: ' + e.message), 500)
  }
})

// Excluir Categoria (Apenas RASCUNHO ou CANCELADO - Regra do documento)
torneios.delete('/:id/categorias/:catId', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'), async (c) => {
  try {
    const db = c.env.DB
    const catId = c.req.param('catId')

    const cat = await db.prepare(`SELECT status FROM torneio_categorias WHERE id = ?`).bind(catId).first<any>()
    if (!cat) return c.json(errorResponse('Categoria não encontrada'), 404)

    // Regra do documento: Exclusão só é possível em RASCUNHO ou CANCELADO
    if (!['RASCUNHO', 'CANCELADO'].includes(cat.status)) {
      return c.json(errorResponse('Exclusão de categoria só é permitida nos status RASCUNHO ou CANCELADO. Status atual: ' + cat.status), 400)
    }

    await db.prepare(`DELETE FROM torneio_categorias WHERE id = ?`).bind(catId).run()
    return c.json(successResponse(null, 'Categoria excluída com sucesso!'))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao excluir categoria: ' + e.message), 500)
  }
})

// Transição de Status da Categoria (RASCUNHO -> INSCRICOES -> EM_ANDAMENTO -> FINALIZADO / CANCELADO)
torneios.patch('/:id/categorias/:catId/status', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'), async (c) => {
  try {
    const db = c.env.DB
    const catId = c.req.param('catId')
    const { status } = await c.req.json()

    if (!['RASCUNHO', 'INSCRICOES', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO'].includes(status)) {
      return c.json(errorResponse('Status inválido'), 400)
    }

    await db.prepare(`UPDATE torneio_categorias SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, catId).run()
    return c.json(successResponse({ id: catId, status }, 'Status da categoria atualizado!'))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao alterar status: ' + e.message), 500)
  }
})

// ============================================================
// 5.4 INSCRIÇÕES NO TORNEIO
// ============================================================

// Listar Inscrições da Categoria
torneios.get('/:id/categorias/:catId/inscricoes', async (c) => {
  try {
    const db = c.env.DB
    const catId = c.req.param('catId')

    const res = await db.prepare(`
      SELECT ti.*, j.nome as jogador_nome, j.email as jogador_email, j.telefone as jogador_telefone, cl.nome as classe_nome
      FROM torneio_inscricoes ti
      JOIN jogadores j ON j.id = ti.jogador_id
      LEFT JOIN classes cl ON cl.id = j.classe_id
      WHERE ti.categoria_id = ?
      ORDER BY ti.seed IS NULL ASC, ti.seed ASC, j.nome ASC
    `).bind(catId).all()

    return c.json(successResponse(res.results))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao buscar inscrições: ' + e.message), 500)
  }
})

// Inscrição em Lote pelo Admin (checkboxes)
torneios.post('/:id/categorias/:catId/inscricoes/lote', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'), async (c) => {
  try {
    const db = c.env.DB
    const catId = c.req.param('catId')
    const { jogador_ids } = await c.req.json()

    if (!Array.isArray(jogador_ids) || jogador_ids.length === 0) {
      return c.json(errorResponse('Selecione ao menos um jogador para inscrever em lote'), 400)
    }

    let criados = 0
    for (const jId of jogador_ids) {
      try {
        const id = generateId()
        await db.prepare(`
          INSERT INTO torneio_inscricoes (id, categoria_id, jogador_id, status)
          VALUES (?, ?, ?, 'CONFIRMADA')
        `).bind(id, catId, jId).run()
        criados++
      } catch (e) {
        // Ignorar duplicações por causa da UNIQUE constraint
      }
    }

    return c.json(successResponse({ criados }, `${criados} jogador(es) inscritos com sucesso em lote!`))
  } catch (e: any) {
    return c.json(errorResponse('Erro na inscrição em lote: ' + e.message), 500)
  }
})

// Inscrição Individual
torneios.post('/:id/categorias/:catId/inscricoes', async (c) => {
  try {
    const db = c.env.DB
    const catId = c.req.param('catId')
    const user = c.get('user') as any
    const body = await c.req.json().catch(() => ({}))
    let jogadorId = body.jogador_id

    // Se for jogador individual, buscar seu próprio ID de jogador
    if (!jogadorId && user.perfil === 'JOGADOR') {
      const j = await db.prepare(`SELECT id FROM jogadores WHERE usuario_id = ? AND clube_id = ?`).bind(user.sub, user.clube_id).first<any>()
      jogadorId = j?.id
    }

    if (!jogadorId) return c.json(errorResponse('Jogador não identificado'), 400)

    const id = generateId()
    await db.prepare(`
      INSERT INTO torneio_inscricoes (id, categoria_id, jogador_id, status)
      VALUES (?, ?, ?, 'CONFIRMADA')
    `).bind(id, catId, jogadorId).run()

    return c.json(successResponse({ id }, 'Inscrição realizada com sucesso!'))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao inscrever: ' + e.message), 500)
  }
})

// Definir Seed / Cabeça de Chave
torneios.patch('/:id/categorias/:catId/inscricoes/:inscricaoId/seed', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'), async (c) => {
  try {
    const db = c.env.DB
    const inscricaoId = c.req.param('inscricaoId')
    const { seed } = await c.req.json()

    await db.prepare(`
      UPDATE torneio_inscricoes SET seed = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(seed !== undefined && seed !== '' ? Number(seed) : null, inscricaoId).run()

    return c.json(successResponse({ id: inscricaoId, seed }, 'Seed atribuído com sucesso!'))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao definir seed: ' + e.message), 500)
  }
})

// Remover Inscrição
torneios.delete('/:id/categorias/:catId/inscricoes/:inscricaoId', async (c) => {
  try {
    const db = c.env.DB
    const catId = c.req.param('catId')
    const inscricaoId = c.req.param('inscricaoId')
    const user = c.get('user') as any

    const cat = await db.prepare(`SELECT status FROM torneio_categorias WHERE id = ?`).bind(catId).first<any>()
    if (!cat) return c.json(errorResponse('Categoria não encontrada'), 404)

    // Regra do documento: Admin pode remover em RASCUNHO, INSCRICOES e EM_ANDAMENTO. Jogador só em INSCRICOES.
    if (user.perfil === 'JOGADOR' && cat.status !== 'INSCRICOES') {
      return c.json(errorResponse('Jogadores só podem cancelar inscrição enquanto as inscrições estiverem abertas'), 400)
    }

    await db.prepare(`DELETE FROM torneio_inscricoes WHERE id = ?`).bind(inscricaoId).run()
    return c.json(successResponse(null, 'Inscrição removida!'))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao remover inscrição: ' + e.message), 500)
  }
})

// ============================================================
// 5.5 GERAÇÃO DE CHAVE E BRACKET
// ============================================================

// Gerar Chave / Bracket (5.5)
torneios.post('/:id/categorias/:catId/gerar-chave', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'), async (c) => {
  try {
    const db = c.env.DB
    const catId = c.req.param('catId')

    const cat = await db.prepare(`SELECT * FROM torneio_categorias WHERE id = ?`).bind(catId).first<any>()
    if (!cat) return c.json(errorResponse('Categoria não encontrada'), 404)

    if (!['INSCRICOES', 'EM_ANDAMENTO'].includes(cat.status)) {
      return c.json(errorResponse('Status inválido para gerar chave. Status atual: ' + cat.status), 400)
    }

    const partidasExistentes = await db.prepare(`
      SELECT COUNT(*) as total FROM torneio_partidas WHERE categoria_id = ?
    `).bind(catId).first<any>()

    if (partidasExistentes && (partidasExistentes.total || 0) > 0) {
      return c.json(errorResponse('Esta categoria já possui partidas geradas. Use "Avançar Fase" para a fase seguinte.', 'ALREADY_GENERATED'), 400)
    }

    // Buscar inscritos confirmados ordenados por Seed (se houver) e nome
    const inscritosRes = await db.prepare(`
      SELECT ti.*, j.nome as jogador_nome
      FROM torneio_inscricoes ti
      JOIN jogadores j ON j.id = ti.jogador_id
      WHERE ti.categoria_id = ? AND ti.status IN ('CONFIRMADA', 'PAGA')
      ORDER BY ti.seed IS NULL ASC, ti.seed ASC, j.nome ASC
    `).bind(catId).all<any>()

    const inscritos = inscritosRes.results
    if (inscritos.length < 2) {
      return c.json(errorResponse('Mínimo de 2 participantes confirmados para gerar a chave'), 400)
    }

    // Calcular potência de 2 necessária
    let size = 2
    while (size < inscritos.length) size *= 2

    const numByes = size - inscritos.length

    // Montar lista de slots
    const slots: (string | null)[] = inscritos.map(i => i.jogador_id)
    for (let b = 0; b < numByes; b++) {
      slots.push(null) // BYE slot
    }

    // Inserir partidas da 1ª rodada
    const totalPartidasRodada1 = size / 2
    let confrontosGerados = 0

    for (let p = 0; p < totalPartidasRodada1; p++) {
      const jogA = slots[p]
      const jogB = slots[size - 1 - p]
      const isBye = (!jogA || !jogB) ? 1 : 0
      const vencedorBye = isBye ? (jogA || jogB) : null

      const partidaId = generateId()
      await db.prepare(`
        INSERT INTO torneio_partidas (id, categoria_id, rodada, posicao_chave, jogador_a_id, jogador_b_id, is_bye, vencedor_id, status)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
      `).bind(partidaId, catId, p + 1, jogA, jogB, isBye, vencedorBye, isBye ? 'FINALIZADA' : 'PENDENTE').run()

      confrontosGerados++
    }

    // Atualizar status da categoria para EM_ANDAMENTO
    await db.prepare(`UPDATE torneio_categorias SET status = 'EM_ANDAMENTO', updated_at = datetime('now') WHERE id = ?`).bind(catId).run()

    return c.json(successResponse({
      categoria_id: catId,
      total_inscritos: inscritos.length,
      potencia_chave: size,
      byes: numByes,
      partidas_geradas: confrontosGerados
    }, 'Chave gerada com sucesso!'))

  } catch (e: any) {
    return c.json(errorResponse('Erro ao gerar chave: ' + e.message), 500)
  }
})

// Avançar Fase (Gera próxima rodada com os vencedores da atual)
torneios.post('/:id/categorias/:catId/avancar-fase', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'), async (c) => {
  try {
    const db = c.env.DB
    const catId = c.req.param('catId')

    // Obter última rodada existente
    const ultimaRodadaRes = await db.prepare(`
      SELECT MAX(rodada) as max_rodada FROM torneio_partidas WHERE categoria_id = ?
    `).bind(catId).first<any>()

    const rodadaAtual = ultimaRodadaRes?.max_rodada || 1

    // Buscar partidas da rodada atual
    const partidasAtuais = await db.prepare(`
      SELECT * FROM torneio_partidas WHERE categoria_id = ? AND rodada = ? ORDER BY posicao_chave ASC
    `).bind(catId, rodadaAtual).all<any>()

    if (partidasAtuais.results.length === 0) {
      return c.json(errorResponse('Nenhuma partida encontrada na fase atual'), 400)
    }

    // Verificar se todas as partidas da fase atual foram finalizadas
    const pendentes = partidasAtuais.results.filter((p: any) => p.status !== 'FINALIZADA' && p.status !== 'WO')
    if (pendentes.length > 0) {
      return c.json(errorResponse(`Ainda existem ${pendentes.length} partida(s) pendentes na fase atual. Finalize todas antes de avançar.`), 400)
    }

    if (partidasAtuais.results.length === 1) {
      // Já é a final! Categoria concluída
      const campeaoId = partidasAtuais.results[0].vencedor_id
      await db.prepare(`UPDATE torneio_categorias SET status = 'FINALIZADO', updated_at = datetime('now') WHERE id = ?`).bind(catId).run()
      return c.json(successResponse({ campeao_id: campeaoId }, 'Torneio finalizado! Campeão consagrado!'))
    }

    // Coletar vencedores em ordem de chave
    const vencedores: string[] = partidasAtuais.results.map((p: any) => p.vencedor_id).filter(Boolean)

    const proximaRodada = rodadaAtual + 1
    const totalNovasPartidas = Math.floor(vencedores.length / 2)
    let novasGeradas = 0

    for (let i = 0; i < totalNovasPartidas; i++) {
      const jogA = vencedores[i * 2]
      const jogB = vencedores[i * 2 + 1]
      const partidaId = generateId()

      await db.prepare(`
        INSERT INTO torneio_partidas (id, categoria_id, rodada, posicao_chave, jogador_a_id, jogador_b_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDENTE')
      `).bind(partidaId, catId, proximaRodada, i + 1, jogA, jogB).run()

      novasGeradas++
    }

    return c.json(successResponse({
      fase_anterior: rodadaAtual,
      nova_fase: proximaRodada,
      partidas_geradas: novasGeradas
    }, `Fase ${proximaRodada} gerada com ${novasGeradas} confrontos!`))

  } catch (e: any) {
    return c.json(errorResponse('Erro ao avançar fase: ' + e.message), 500)
  }
})

// Listar Partidas / Bracket da Categoria
torneios.get('/:id/categorias/:catId/partidas', async (c) => {
  try {
    const db = c.env.DB
    const catId = c.req.param('catId')

    const res = await db.prepare(`
      SELECT tp.*,
        ja.nome as jogador_a_nome, jb.nome as jogador_b_nome, v.nome as vencedor_nome
      FROM torneio_partidas tp
      LEFT JOIN jogadores ja ON ja.id = tp.jogador_a_id
      LEFT JOIN jogadores jb ON jb.id = tp.jogador_b_id
      LEFT JOIN jogadores v ON v.id = tp.vencedor_id
      WHERE tp.categoria_id = ?
      ORDER BY tp.rodada ASC, tp.posicao_chave ASC
    `).bind(catId).all()

    return c.json(successResponse(res.results))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao buscar partidas do torneio: ' + e.message), 500)
  }
})

// ============================================================
// 5.8 REGISTRAR RESULTADO DE PARTIDA DE TORNEIO
// ============================================================

torneios.patch('/:id/partidas/:partidaId/resultado', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'), async (c) => {
  try {
    const db = c.env.DB
    const partidaId = c.req.param('partidaId')
    const body = await c.req.json()

    // Commit de13fa6: Limpar todos os não-dígitos antes de salvar
    const placar_a = (body.placar_a || '').toString().replace(/\D/g, '')
    const placar_b = (body.placar_b || '').toString().replace(/\D/g, '')
    const { vencedor_id, status = 'FINALIZADA', observacoes } = body

    if (!vencedor_id && status === 'FINALIZADA') {
      return c.json(errorResponse('Seleção de vencedor é obrigatória para finalizar a partida'), 400)
    }

    await db.prepare(`
      UPDATE torneio_partidas
      SET placar_a = ?, placar_b = ?, vencedor_id = ?, status = ?, observacoes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(placar_a, placar_b, vencedor_id || null, status, observacoes || null, partidaId).run()

    return c.json(successResponse({ id: partidaId, placar_a, placar_b, vencedor_id, status }, 'Resultado do torneio registrado com sucesso!'))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao registrar resultado: ' + e.message), 500)
  }
})

export default torneios
