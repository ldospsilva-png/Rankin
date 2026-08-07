// ============================================================
// ROTAS DE AUTENTICAÇÃO
// ============================================================

import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { createJWT, hashPassword, verifyPassword } from '../middleware/auth'
import { registrarAuditoria } from '../middleware/audit'
import { generateId, successResponse, errorResponse } from '../utils'

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// POST /api/auth/login
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { email, senha } = body

    if (!email || !senha) {
      return c.json(errorResponse('Email e senha são obrigatórios'), 400)
    }

    const db = c.env.DB
    const usuario = await db.prepare(
      `SELECT u.*, c.nome as clube_nome, c.status as clube_status
       FROM usuarios u
       LEFT JOIN clubes c ON c.id = u.clube_id
       WHERE u.email = ? AND u.status = 'ATIVO'`
    ).bind(email.toLowerCase().trim()).first<any>()

    if (!usuario) {
      return c.json(errorResponse('Credenciais inválidas', 'INVALID_CREDENTIALS'), 401)
    }

    const senhaValida = await verifyPassword(senha, usuario.senha_hash)
    if (!senhaValida) {
      return c.json(errorResponse('Credenciais inválidas', 'INVALID_CREDENTIALS'), 401)
    }

    // Verificar se clube está ativo (para não admins globais)
    if (usuario.perfil !== 'ADMIN_GLOBAL' && usuario.clube_id && usuario.clube_status === 'INATIVO') {
      return c.json(errorResponse('Clube inativo. Contate o administrador.', 'CLUB_INACTIVE'), 403)
    }

    const secret = c.env.JWT_SECRET || 'tenis-ranking-secret-key-2025'
    const token = await createJWT({
      sub: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      clube_id: usuario.clube_id || undefined
    }, secret)

    // Atualizar último login
    await db.prepare(`UPDATE usuarios SET ultimo_login = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
      .bind(usuario.id).run()

    // Auditoria
    await registrarAuditoria(db, {
      clube_id: usuario.clube_id,
      usuario_id: usuario.id,
      tipo_evento: 'USUARIO_LOGIN',
      entidade: 'usuarios',
      entidade_id: usuario.id,
      payload_resumido: `Login: ${usuario.email}`
    })

    return c.json(successResponse({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        clube_id: usuario.clube_id,
        clube_nome: usuario.clube_nome
      }
    }, 'Login realizado com sucesso'))
  } catch (e: any) {
    console.error('Erro no login:', e)
    return c.json(errorResponse('Erro interno', 'INTERNAL_ERROR'), 500)
  }
})

// POST /api/auth/register (apenas admin global pode criar usuários)
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { nome, email, senha, perfil, clube_id } = body

    if (!nome || !email || !senha || !perfil) {
      return c.json(errorResponse('Campos obrigatórios: nome, email, senha, perfil'), 400)
    }

    const db = c.env.DB

    // Verificar se email já existe
    const existente = await db.prepare(`SELECT id FROM usuarios WHERE email = ?`)
      .bind(email.toLowerCase().trim()).first()

    if (existente) {
      return c.json(errorResponse('Email já cadastrado', 'EMAIL_EXISTS'), 409)
    }

    const senhaHash = await hashPassword(senha)
    const id = generateId()

    await db.prepare(`
      INSERT INTO usuarios (id, nome, email, senha_hash, status, perfil, clube_id)
      VALUES (?, ?, ?, ?, 'ATIVO', ?, ?)
    `).bind(id, nome.trim(), email.toLowerCase().trim(), senhaHash, perfil, clube_id || null).run()

    return c.json(successResponse({ id }, 'Usuário criado com sucesso'), 201)
  } catch (e: any) {
    console.error('Erro ao registrar:', e)
    return c.json(errorResponse('Erro interno', 'INTERNAL_ERROR'), 500)
  }
})

// POST /api/auth/change-password
auth.post('/change-password', async (c) => {
  try {
    const body = await c.req.json()
    const { usuario_id, senha_atual, nova_senha } = body

    if (!usuario_id || !senha_atual || !nova_senha) {
      return c.json(errorResponse('Campos obrigatórios'), 400)
    }

    const db = c.env.DB
    const usuario = await db.prepare(`SELECT * FROM usuarios WHERE id = ?`).bind(usuario_id).first<any>()

    if (!usuario) {
      return c.json(errorResponse('Usuário não encontrado'), 404)
    }

    const senhaValida = await verifyPassword(senha_atual, usuario.senha_hash)
    if (!senhaValida) {
      return c.json(errorResponse('Senha atual incorreta'), 400)
    }

    const novoHash = await hashPassword(nova_senha)
    await db.prepare(`UPDATE usuarios SET senha_hash = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(novoHash, usuario_id).run()

    return c.json(successResponse(null, 'Senha alterada com sucesso'))
  } catch (e: any) {
    return c.json(errorResponse('Erro interno', 'INTERNAL_ERROR'), 500)
  }
})

export default auth
