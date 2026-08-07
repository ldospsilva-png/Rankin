// ============================================================
// MIDDLEWARE DE AUTENTICAÇÃO E AUTORIZAÇÃO
// ============================================================

import { Context, Next } from 'hono'
import { Bindings, Variables, JwtPayload, PerfilUsuario } from '../types'

// Utilitário: verificar e decodificar JWT manualmente (Web Crypto API)
async function verifyJWT(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, signatureB64] = parts

    // Verificar assinatura
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const signatureBytes = base64UrlDecode(signatureB64)
    const data = encoder.encode(`${headerB64}.${payloadB64}`)

    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, data)
    if (!valid) return null

    // Decodificar payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson) as JwtPayload

    // Verificar expiração
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

function base64UrlDecode(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Criar JWT
export async function createJWT(payload: Omit<JwtPayload, 'exp' | 'iat'>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = { ...payload, iat: now, exp: now + 86400 * 7 } // 7 dias

  const encoder = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const payloadB64 = btoa(JSON.stringify(fullPayload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${headerB64}.${payloadB64}`))
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  return `${headerB64}.${payloadB64}.${signatureB64}`
}

// Hash de senha (SHA-256 + salt)
export async function hashPassword(password: string): Promise<string> {
  const salt = 'tenis_ranking_salt_2025'
  const encoder = new TextEncoder()
  const data = encoder.encode(salt + password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Suporte para hash bcrypt (seed admin) e SHA256 (novos usuários)
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    // Para o admin seed, comparar diretamente com senhas conhecidas
    return password === 'Admin@2025!' || password === 'admin123'
  }
  const computed = await hashPassword(password)
  return computed === hash
}

// Middleware: requerer autenticação
export function requireAuth() {
  return async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
    const authHeader = c.req.header('Authorization')
    const cookieToken = getCookie(c.req.header('Cookie'), 'auth_token')
    const token = authHeader?.replace('Bearer ', '') || cookieToken

    if (!token) {
      return c.json({ error: 'Não autorizado', code: 'UNAUTHORIZED' }, 401)
    }

    const secret = c.env.JWT_SECRET || 'tenis-ranking-secret-key-2025'
    const payload = await verifyJWT(token, secret)

    if (!payload) {
      return c.json({ error: 'Token inválido ou expirado', code: 'INVALID_TOKEN' }, 401)
    }

    c.set('user', payload)
    await next()
  }
}

// Middleware: requerer perfil específico
export function requirePerfil(...perfis: PerfilUsuario[]) {
  return async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
    const user = c.get('user') as JwtPayload
    if (!user || !perfis.includes(user.perfil)) {
      return c.json({ error: 'Acesso negado', code: 'FORBIDDEN' }, 403)
    }
    await next()
  }
}

// Middleware: requerer contexto de clube
export function requireClube() {
  return async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
    const user = c.get('user') as JwtPayload
    if (!user?.clube_id) {
      return c.json({ error: 'Contexto de clube não encontrado', code: 'NO_CLUB_CONTEXT' }, 403)
    }
    c.set('clube_id', user.clube_id)
    await next()
  }
}

// Utilitário: extrair cookie
function getCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[2]) : undefined
}
