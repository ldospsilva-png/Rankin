// ============================================================
// ADAPTADOR DE BANCO DE DADOS UNIFICADO (D1 / POSTGRESQL / SQLITE)
// ============================================================

import { Pool } from 'pg'

export interface DBResult<T = any> {
  results: T[]
  success: boolean
  meta?: any
}

export interface DBStatement {
  bind(...params: any[]): DBStatement
  first<T = any>(): Promise<T | null>
  all<T = any>(): Promise<DBResult<T>>
  run(): Promise<{ success: boolean; meta?: any }>
}

export interface DBAdapter {
  prepare(sql: string): DBStatement
}

let pgPool: Pool | null = null

export function getPgPool(): Pool | null {
  if (pgPool) return pgPool

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return null

  pgPool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })

  pgPool.on('error', (err) => {
    console.error('Erro inesperado no Pool do PostgreSQL:', err)
  })

  return pgPool
}

// Converter queries de SQLite '?' para PostgreSQL '$1, $2...'
function convertSqliteToPostgres(sql: string): string {
  let paramIndex = 1
  let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`)
  
  // Normalizar funções de data de SQLite para PostgreSQL
  pgSql = pgSql.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP')
  pgSql = pgSql.replace(/lower\(hex\(randomblob\(16\)\)\)/gi, 'gen_random_uuid()')
  
  return pgSql
}

export function createPgAdapter(pool: Pool): DBAdapter {
  return {
    prepare(originalSql: string) {
      const convertedSql = convertSqliteToPostgres(originalSql)
      let boundParams: any[] = []

      const statement: DBStatement = {
        bind(...params: any[]) {
          boundParams = params.map(p => p === undefined ? null : p)
          return statement
        },
        async first<T = any>(): Promise<T | null> {
          try {
            const res = await pool.query(convertedSql, boundParams)
            return (res.rows[0] as T) || null
          } catch (err) {
            console.error('Erro SQL (first):', err, { sql: convertedSql, params: boundParams })
            throw err
          }
        },
        async all<T = any>(): Promise<DBResult<T>> {
          try {
            const res = await pool.query(convertedSql, boundParams)
            return {
              results: res.rows as T[],
              success: true,
              meta: { rowCount: res.rowCount }
            }
          } catch (err) {
            console.error('Erro SQL (all):', err, { sql: convertedSql, params: boundParams })
            throw err
          }
        },
        async run(): Promise<{ success: boolean; meta?: any }> {
          try {
            const res = await pool.query(convertedSql, boundParams)
            return {
              success: true,
              meta: { rowCount: res.rowCount }
            }
          } catch (err) {
            console.error('Erro SQL (run):', err, { sql: convertedSql, params: boundParams })
            throw err
          }
        }
      }

      return statement
    }
  }
}

// Obter adaptador de banco de dados baseado no contexto ou ambiente
export function getDB(envDb?: any): DBAdapter {
  // 1. Tentar usar PostgreSQL se DATABASE_URL estiver presente
  const pool = getPgPool()
  if (pool) {
    return createPgAdapter(pool)
  }

  // 2. Se houver binding de D1 do Cloudflare
  if (envDb && typeof envDb.prepare === 'function') {
    return envDb as DBAdapter
  }

  throw new Error('Nenhuma conexão com banco de dados configurada (DATABASE_URL ou D1 DB binding é necessário).')
}
