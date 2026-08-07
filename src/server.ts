// ============================================================
// SERVIDOR DE PRODUÇÃO/DESENVOLVIMENTO (NODE.JS + HONO)
// Entry Point para GCP Cloud Run & Local Node.js
// ============================================================

import 'dotenv/config'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from './index'

const port = Number(process.env.PORT) || 3000

// Servir arquivos estáticos da pasta public no ambiente Node.js
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/uploads/*', serveStatic({ root: './public' }))

console.log(`🎾 Servidor TênisRank rodando em http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})
