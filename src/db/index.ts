// ============================================================
// ADAPTADOR DE BANCO DE DADOS UNIFICADO (D1 / POSTGRESQL / LOCAL SQLITE)
// ============================================================

import { Pool } from 'pg'
import { DatabaseSync } from 'node:sqlite'
import fs from 'fs'
import path from 'path'

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
let localSqliteDb: DatabaseSync | null = null

export function getPgPool(): Pool | null {
  if (pgPool) return pgPool

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || !databaseUrl.startsWith('postgres')) return null

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

// Adaptador para SQLite nativo local (node:sqlite)
export function getLocalSqliteAdapter(): DBAdapter {
  if (!localSqliteDb) {
    const dbPath = path.join(process.cwd(), 'local.db')
    const isNewDb = !fs.existsSync(dbPath)

    localSqliteDb = new DatabaseSync(dbPath)

    // Se for um novo banco SQLite local, aplicar schemas de inicialização
    if (isNewDb) {
      console.log('📂 Inicializando novo banco de dados SQLite local (local.db)...')
      try {
        const schemaPath1 = path.join(process.cwd(), 'migrations', '0001_initial_schema.sql')
        const schemaPath2 = path.join(process.cwd(), 'migrations', '0002_seed_admin.sql')
        const schemaPath3 = path.join(process.cwd(), 'migrations', '0003_melhorias.sql')

        if (fs.existsSync(schemaPath1)) {
          localSqliteDb.exec(fs.readFileSync(schemaPath1, 'utf-8'))
        }
        if (fs.existsSync(schemaPath2)) {
          localSqliteDb.exec(fs.readFileSync(schemaPath2, 'utf-8'))
        }
        if (fs.existsSync(schemaPath3)) {
          localSqliteDb.exec(fs.readFileSync(schemaPath3, 'utf-8'))
        }
        console.log('✅ Banco local.db e usuário admin inicializados com sucesso!')
      } catch (e) {
        console.error('Erro ao inicializar schema local:', e)
      }
    }
  }

  const db = localSqliteDb

  return {
    prepare(sql: string) {
      let boundParams: any[] = []

      const statement: DBStatement = {
        bind(...params: any[]) {
          boundParams = params.map(p => p === undefined ? null : p)
          return statement
        },
        async first<T = any>(): Promise<T | null> {
          try {
            const stmt = db.prepare(sql)
            const result = stmt.get(...boundParams)
            return (result as T) || null
          } catch (err) {
            console.error('Erro Local SQLite (first):', err, { sql, params: boundParams })
            throw err
          }
        },
        async all<T = any>(): Promise<DBResult<T>> {
          try {
            const stmt = db.prepare(sql)
            const results = stmt.all(...boundParams)
            return {
              results: results as T[],
              success: true
            }
          } catch (err) {
            console.error('Erro Local SQLite (all):', err, { sql, params: boundParams })
            throw err
          }
        },
        async run(): Promise<{ success: boolean; meta?: any }> {
          try {
            const stmt = db.prepare(sql)
            const info = stmt.run(...boundParams)
            return {
              success: true,
              meta: info
            }
          } catch (err) {
            console.error('Erro Local SQLite (run):', err, { sql, params: boundParams })
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
  // 1. Tentar usar PostgreSQL se DATABASE_URL estiver presente e for postgres
  const pool = getPgPool()
  if (pool) {
    return createPgAdapter(pool)
  }

  // 2. Se houver binding de D1 do Cloudflare
  if (envDb && typeof envDb.prepare === 'function') {
    return envDb as DBAdapter
  }

  // 3. Fallback para banco SQLite local automático (node:sqlite)
  return getLocalSqliteAdapter()
}
