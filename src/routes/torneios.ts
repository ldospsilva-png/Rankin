// ============================================================
// ROTAS - TORNEIOS
// ============================================================

import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { requireAuth, requirePerfil, requireClube } from '../middleware/auth'
import { generateId, successResponse, errorResponse } from '../utils'

const torneios = new Hono<{ Bindings: Bindings; Variables: Variables }>()

torneios.use('*', requireAuth())
torneios.use('*', requireClube())

// Listar Torneios do Clube
torneios.get('/', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string

    const res = await db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM torneio_categorias tc WHERE tc.torneio_id = t.id) as total_categorias
      FROM torneios t
      WHERE t.clube_id = ?
      ORDER BY t.created_at DESC
    `).bind(clube_id).all()

    return c.json(successResponse(res.results))
  } catch (e: any) {
    return c.json(errorResponse('Erro ao buscar torneios: ' + e.message), 500)
  }
})

// Gerar Chave / Bracket da Categoria (Commit 77d7729)
torneios.post('/:id/categorias/:catId/gerar-chave', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'), async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const torneioId = c.req.param('id')
    const catId = c.req.param('catId')

    // Buscar Categoria
    const categoria = await db.prepare(`
      SELECT * FROM torneio_categorias WHERE id = ? AND torneio_id = ?
    `).bind(catId, torneioId).first<any>()

    if (!categoria) {
      return c.json(errorResponse('Categoria não encontrada'), 404)
    }

    // Validação de Status (Commit 77d7729): aceita INSCRICOES e EM_ANDAMENTO
    if (!['INSCRICOES', 'EM_ANDAMENTO'].includes(categoria.status)) {
      return c.json(errorResponse('Status inválido para gerar chave. Status atual: ' + categoria.status), 400)
    }

    // Verificação de Partidas Existentes (Commit 77d7729): previne duplicação
    const partidasExistentes = await db.prepare(`
      SELECT COUNT(*) as total FROM torneio_partidas WHERE categoria_id = ?
    `).bind(catId).first<any>()

    if (partidasExistentes && (partidasExistentes.total || 0) > 0) {
      return c.json(errorResponse('Esta categoria já possui partidas geradas. Use "Avançar Fase" para rodadas seguintes.', 'ALREADY_GENERATED'), 400)
    }

    // Buscar Inscrições Confirmadas
    const inscricoes = await db.prepare(`
      SELECT * FROM torneio_inscricoes 
      WHERE categoria_id = ? AND status IN ('CONFIRMADA', 'PAGA')
      ORDER BY ranking_posicao ASC, created_at ASC
    `).bind(catId).all<any>()

    if (inscricoes.results.length < 2) {
      return c.json(errorResponse('Mínimo de 2 participantes confirmados para gerar a chave'), 400)
    }

    // Atualizar status da categoria para EM_ANDAMENTO
    await db.prepare(`
      UPDATE torneio_categorias SET status = 'EM_ANDAMENTO', updated_at = datetime('now') WHERE id = ?
    `).bind(catId).run()

    return c.json(successResponse({
      categoria_id: catId,
      status: 'EM_ANDAMENTO',
      total_inscritos: inscricoes.results.length
    }, 'Chave gerada com sucesso!'))

  } catch (e: any) {
    return c.json(errorResponse('Erro ao gerar chave: ' + e.message), 500)
  }
})

export default torneios
