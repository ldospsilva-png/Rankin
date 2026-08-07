// ============================================================
// ROTAS - PUBLICAÇÕES
// ============================================================
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { requireAuth, requirePerfil, requireClube } from '../middleware/auth'
import { generateId, successResponse, errorResponse, paginate } from '../utils'

const publicacoesRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
publicacoesRoutes.use('*', requireAuth())
publicacoesRoutes.use('*', requireClube())

// GET /api/publicacoes
publicacoesRoutes.get('/', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { tipo, page = '1', limit = '20' } = c.req.query() as Record<string, string>
    const { offset, limit: l } = paginate(Number(page), Number(limit))

    let query = `
      SELECT p.*, u.nome as autor_nome
      FROM publicacoes p LEFT JOIN usuarios u ON u.id = p.autor_id
      WHERE p.clube_id = ? AND p.status = 'ATIVO'
    `
    const params: any[] = [clube_id]
    if (tipo) { query += ` AND p.tipo = ?`; params.push(tipo) }
    query += ` ORDER BY p.fixado DESC, p.created_at DESC LIMIT ? OFFSET ?`
    params.push(l, offset)

    const result = await db.prepare(query).bind(...params).all()
    return c.json(successResponse(result.results))
  } catch (e) { return c.json(errorResponse('Erro ao buscar publicações'), 500) }
})

// POST /api/publicacoes
publicacoesRoutes.post('/', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const user = c.get('user') as any
    const { titulo, conteudo, tipo, fixado, imagem_url } = await c.req.json()

    if (!titulo || !conteudo) return c.json(errorResponse('Título e conteúdo são obrigatórios'), 400)

    // Apenas admins podem fixar ou criar publicações de clube
    const perfil = user.perfil
    if (fixado && perfil === 'JOGADOR') return c.json(errorResponse('Apenas administradores podem fixar publicações'), 403)

    const id = generateId()
    await db.prepare(`
      INSERT INTO publicacoes (id, clube_id, autor_id, titulo, conteudo, tipo, fixado, imagem_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, clube_id, user.sub, titulo, conteudo, tipo || 'AVISO', fixado ? 1 : 0, imagem_url || null).run()

    const pub = await db.prepare(`
      SELECT p.*, u.nome as autor_nome FROM publicacoes p LEFT JOIN usuarios u ON u.id = p.autor_id WHERE p.id = ?
    `).bind(id).first()

    return c.json(successResponse(pub, 'Publicação criada'), 201)
  } catch (e: any) { return c.json(errorResponse('Erro ao criar publicação: ' + e.message), 500) }
})

// PUT /api/publicacoes/:id
publicacoesRoutes.put('/:id', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const user = c.get('user') as any
    const id = c.req.param('id')
    const { titulo, conteudo, tipo, fixado, status, imagem_url } = await c.req.json()

    const pub = await db.prepare(`SELECT * FROM publicacoes WHERE id = ? AND clube_id = ?`).bind(id, clube_id).first<any>()
    if (!pub) return c.json(errorResponse('Publicação não encontrada'), 404)

    // Só o autor ou admin pode editar
    const isAdmin = user.perfil !== 'JOGADOR'
    if (!isAdmin && pub.autor_id !== user.sub) return c.json(errorResponse('Sem permissão para editar esta publicação'), 403)

    await db.prepare(`
      UPDATE publicacoes SET titulo = ?, conteudo = ?, tipo = ?, fixado = ?, status = ?, imagem_url = ?, updated_at = datetime('now')
      WHERE id = ? AND clube_id = ?
    `).bind(titulo || pub.titulo, conteudo || pub.conteudo, tipo || pub.tipo, fixado ? 1 : 0, status || pub.status, imagem_url || pub.imagem_url, id, clube_id).run()

    return c.json(successResponse({ id }, 'Publicação atualizada'))
  } catch (e) { return c.json(errorResponse('Erro ao atualizar publicação'), 500) }
})

// DELETE /api/publicacoes/:id
publicacoesRoutes.delete('/:id', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const user = c.get('user') as any
    const id = c.req.param('id')

    const pub = await db.prepare(`SELECT * FROM publicacoes WHERE id = ? AND clube_id = ?`).bind(id, clube_id).first<any>()
    if (!pub) return c.json(errorResponse('Publicação não encontrada'), 404)
    if (user.perfil === 'JOGADOR' && pub.autor_id !== user.sub) return c.json(errorResponse('Sem permissão'), 403)

    await db.prepare(`UPDATE publicacoes SET status = 'INATIVO', updated_at = datetime('now') WHERE id = ?`).bind(id).run()
    return c.json(successResponse(null, 'Publicação removida'))
  } catch (e) { return c.json(errorResponse('Erro ao remover publicação'), 500) }
})

export default publicacoesRoutes
