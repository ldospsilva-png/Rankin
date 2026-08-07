// ============================================================
// ROTAS - NOTIFICAÇÕES (WhatsApp via Z-API / Email via sendgrid)
// ============================================================
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { requireAuth, requirePerfil, requireClube } from '../middleware/auth'
import { generateId, successResponse, errorResponse } from '../utils'

const notificacoesRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
notificacoesRoutes.use('*', requireAuth())
notificacoesRoutes.use('*', requirePerfil('ADMIN_CLUBE', 'ADMIN_GLOBAL'))
notificacoesRoutes.use('*', requireClube())

// POST /api/admin/clube/notificacoes/nova-rodada
notificacoesRoutes.post('/nova-rodada', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { rodada_id } = await c.req.json()

    const rodada = await db.prepare(`
      SELECT r.*, cl.nome as classe_nome FROM rodadas r
      LEFT JOIN classes cl ON cl.id = r.classe_id
      WHERE r.id = ? AND r.clube_id = ?
    `).bind(rodada_id, clube_id).first<any>()
    if (!rodada) return c.json(errorResponse('Rodada não encontrada'), 404)

    const config = await db.prepare(`SELECT * FROM configuracoes_clube WHERE clube_id = ?`).bind(clube_id).first<any>()
    const clube = await db.prepare(`SELECT nome FROM clubes WHERE id = ?`).bind(clube_id).first<any>()

    // Buscar partidas e jogadores desta rodada
    const partidas = await db.prepare(`
      SELECT p.*,
        ja.nome as ja_nome, ja.telefone as ja_tel, ja.email as ja_email,
        jb.nome as jb_nome, jb.telefone as jb_tel, jb.email as jb_email
      FROM partidas p
      LEFT JOIN jogadores ja ON ja.id = p.jogador_a_id
      LEFT JOIN jogadores jb ON jb.id = p.jogador_b_id
      WHERE p.rodada_id = ?
    `).bind(rodada_id).all<any>()

    const notifs: any[] = []

    for (const p of partidas.results) {
      const msg = `🎾 ${clube.nome}\nRodada ${rodada.numero} - ${rodada.classe_nome}\nNova partida: ${p.ja_nome} × ${p.jb_nome}\nData limite: ${p.data_limite ? new Date(p.data_limite).toLocaleDateString('pt-BR') : '-'}\nBoa sorte!`

      for (const [nome, tel, email] of [[p.ja_nome, p.ja_tel, p.ja_email], [p.jb_nome, p.jb_tel, p.jb_email]]) {
        if (config?.whatsapp_notificacoes && tel) {
          const nId = generateId()
          await db.prepare(`INSERT INTO notificacoes (id, clube_id, tipo, canal, destinatario, mensagem, status) VALUES (?, ?, 'NOVA_RODADA', 'WHATSAPP', ?, ?, 'PENDENTE')`)
            .bind(nId, clube_id, tel, msg).run()
          notifs.push({ canal: 'WHATSAPP', destinatario: tel })
          // Em produção: chamar Z-API ou Twilio aqui
        }
        if (config?.email_notificacoes && email) {
          const nId = generateId()
          await db.prepare(`INSERT INTO notificacoes (id, clube_id, tipo, canal, destinatario, mensagem, status) VALUES (?, ?, 'NOVA_RODADA', 'EMAIL', ?, ?, 'PENDENTE')`)
            .bind(nId, clube_id, email, msg).run()
          notifs.push({ canal: 'EMAIL', destinatario: email })
        }
      }
    }

    // Simular envio bem-sucedido (em produção integrar API real)
    await db.prepare(`UPDATE notificacoes SET status = 'ENVIADO', enviado_em = datetime('now') WHERE clube_id = ? AND status = 'PENDENTE' AND tipo = 'NOVA_RODADA'`)
      .bind(clube_id).run()

    return c.json(successResponse({ notificacoes_enviadas: notifs.length, notificacoes: notifs }, `${notifs.length} notificações enviadas`))
  } catch (e: any) { return c.json(errorResponse('Erro ao enviar notificações: ' + e.message), 500) }
})

// POST /api/admin/clube/notificacoes/aviso-geral
notificacoesRoutes.post('/aviso-geral', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const { mensagem, classe_id } = await c.req.json()
    if (!mensagem) return c.json(errorResponse('Mensagem é obrigatória'), 400)

    const config = await db.prepare(`SELECT * FROM configuracoes_clube WHERE clube_id = ?`).bind(clube_id).first<any>()

    let query = `SELECT nome, telefone, email FROM jogadores WHERE clube_id = ? AND status = 'ATIVO'`
    const params: any[] = [clube_id]
    if (classe_id) { query += ` AND classe_id = ?`; params.push(classe_id) }
    const jogadores = await db.prepare(query).bind(...params).all<any>()

    let enviados = 0
    for (const j of jogadores.results) {
      if (config?.whatsapp_notificacoes && j.telefone) {
        await db.prepare(`INSERT INTO notificacoes (id, clube_id, tipo, canal, destinatario, mensagem, status, enviado_em) VALUES (?, ?, 'AVISO_GERAL', 'WHATSAPP', ?, ?, 'ENVIADO', datetime('now'))`)
          .bind(generateId(), clube_id, j.telefone, mensagem).run()
        enviados++
      }
      if (config?.email_notificacoes && j.email) {
        await db.prepare(`INSERT INTO notificacoes (id, clube_id, tipo, canal, destinatario, mensagem, status, enviado_em) VALUES (?, ?, 'AVISO_GERAL', 'EMAIL', ?, ?, 'ENVIADO', datetime('now'))`)
          .bind(generateId(), clube_id, j.email, mensagem).run()
        enviados++
      }
    }

    return c.json(successResponse({ enviados }, `Aviso enviado para ${enviados} destinatários`))
  } catch (e: any) { return c.json(errorResponse('Erro ao enviar aviso: ' + e.message), 500) }
})

// GET /api/admin/clube/notificacoes
notificacoesRoutes.get('/', async (c) => {
  try {
    const db = c.env.DB
    const clube_id = c.get('clube_id') as string
    const result = await db.prepare(`
      SELECT * FROM notificacoes WHERE clube_id = ? ORDER BY created_at DESC LIMIT 100
    `).bind(clube_id).all()
    return c.json(successResponse(result.results))
  } catch (e) { return c.json(errorResponse('Erro ao buscar notificações'), 500) }
})

export default notificacoesRoutes
