// ============================================================
// PLATAFORMA DE RANKING DE TÊNIS MULTI-CLUBE
// Entry Point Principal
// ============================================================

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { getDB } from './db'
import { Bindings, Variables } from './types'

import authRoutes from './routes/auth'
import adminGlobalRoutes from './routes/admin-global'
import adminClubeRoutes from './routes/admin-clube'
import jogadorRoutes from './routes/jogador'
import pagamentosRoutes from './routes/pagamentos'
import desafiosRoutes from './routes/desafios'
import publicacoesRoutes from './routes/publicacoes'
import notificacoesRoutes from './routes/notificacoes'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Middlewares globais
app.use('*', logger())
app.use('*', async (c, next) => {
  if (!c.env) {
    (c as any).env = {}
  }
  try {
    c.env.DB = getDB(c.env.DB)
  } catch (e) {
    // Ignorar erro no middleware se c.env.DB não estiver pronto
  }
  await next()
})

app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length']
}))

// Rotas de API
app.route('/api/auth', authRoutes)
app.route('/api/admin/global', adminGlobalRoutes)
app.route('/api/admin/clube', adminClubeRoutes)
app.route('/api/admin/clube/pagamentos', pagamentosRoutes)
app.route('/api/admin/clube/notificacoes', notificacoesRoutes)
app.route('/api/jogador', jogadorRoutes)
app.route('/api/desafios', desafiosRoutes)
app.route('/api/publicacoes', publicacoesRoutes)

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Setup inicial do banco - criar admin padrão se não existir
app.get('/api/setup', async (c) => {
  try {
    const db = c.env.DB
    
    // Verificar se admin já existe
    const admin = await db.prepare(`SELECT id FROM usuarios WHERE perfil = 'ADMIN_GLOBAL' LIMIT 1`).first()
    if (admin) {
      return c.json({ message: 'Sistema já configurado', setup_needed: false })
    }
    
    // Criar admin padrão
    const { hashPassword } = await import('./middleware/auth')
    const { generateId } = await import('./utils')
    
    const senhaHash = await hashPassword('Admin@2025!')
    const id = generateId()
    
    await db.prepare(`
      INSERT INTO usuarios (id, nome, email, senha_hash, status, perfil) 
      VALUES (?, 'Administrador Global', 'admin@tenis.com', ?, 'ATIVO', 'ADMIN_GLOBAL')
    `).bind(id, senhaHash).run()
    
    return c.json({ message: 'Admin criado com sucesso', email: 'admin@tenis.com', senha: 'Admin@2025!', setup_needed: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Servir arquivos estáticos
app.use('/static/*', serveStatic({ root: './' }))

// SPA - Servir o frontend para todas as rotas não-API
app.get('*', (c) => {
  return c.html(getHTML())
})

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TênisRank - Plataforma de Ranking Multi-Clube</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎾</text></svg>">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --primary: #16a34a;
      --primary-dark: #15803d;
      --secondary: #0ea5e9;
      --accent: #f59e0b;
      --danger: #dc2626;
      --gray-bg: #f0fdf4;
    }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; }
    .sidebar { transition: all 0.3s ease; }
    .nav-item { transition: all 0.2s ease; }
    .nav-item:hover { background: rgba(255,255,255,0.15); }
    .nav-item.active { background: rgba(255,255,255,0.25); border-left: 3px solid white; }
    .card { box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: box-shadow 0.2s; }
    .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .btn { transition: all 0.15s ease; cursor: pointer; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .spinner { border: 3px solid #f3f3f3; border-top: 3px solid var(--primary); border-radius: 50%; width: 24px; height: 24px; animation: spin 0.8s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-yellow { background: #fef9c3; color: #713f12; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-gray { background: #f1f5f9; color: #475569; }
    .table-row:hover { background: #f8fafc; }
    .modal-bg { background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); }
    input, select, textarea { outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
    input:focus, select:focus, textarea:focus { border-color: #16a34a !important; box-shadow: 0 0 0 3px rgba(22,163,74,0.1); }
    .toast { animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    ::-webkit-scrollbar { width: 6px; } 
    ::-webkit-scrollbar-track { background: #f1f1f1; } 
    ::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
    .rank-1 { color: #f59e0b; } .rank-2 { color: #94a3b8; } .rank-3 { color: #92400e; }
    @media (max-width: 768px) { .sidebar { transform: translateX(-100%); position: fixed; z-index: 50; height: 100vh; } .sidebar.open { transform: translateX(0); } }
  </style>
</head>
<body class="min-h-screen">

<!-- Toast Container -->
<div id="toast-container" class="fixed top-4 right-4 z-50 flex flex-col gap-2"></div>

<!-- App Root -->
<div id="app">
  <!-- Login Screen -->
  <div id="login-screen" class="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-800 via-green-700 to-emerald-600 p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 fade-in">
      <div class="text-center mb-8">
        <div class="text-6xl mb-3">🎾</div>
        <h1 class="text-3xl font-bold text-gray-800">TênisRank</h1>
        <p class="text-gray-500 mt-1">Plataforma de Ranking Multi-Clube</p>
      </div>
      <form id="login-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" id="login-email" required placeholder="seu@email.com"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
            value="admin@tenis.com">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <div class="relative">
            <input type="password" id="login-senha" required placeholder="••••••••"
              class="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 pr-10"
              value="Admin@2025!">
            <button type="button" onclick="togglePassword()" class="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
              <i class="fas fa-eye" id="eye-icon"></i>
            </button>
          </div>
        </div>
        <button type="submit" id="login-btn"
          class="btn w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold text-lg">
          <i class="fas fa-sign-in-alt mr-2"></i>Entrar
        </button>
      </form>
      <div class="mt-6 p-4 bg-green-50 rounded-lg text-sm text-green-800">
        <p class="font-semibold mb-1"><i class="fas fa-info-circle mr-1"></i>Acesso inicial:</p>
        <p>Admin: <strong>admin@tenis.com</strong> / <strong>Admin@2025!</strong></p>
        <p class="mt-1 text-xs text-green-600">Execute /api/setup se for o primeiro acesso</p>
      </div>
      <div id="login-error" class="hidden mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"></div>
    </div>
  </div>

  <!-- Main App (hidden until login) -->
  <div id="main-app" class="hidden flex h-screen overflow-hidden">
    
    <!-- Sidebar -->
    <div id="sidebar" class="sidebar w-64 bg-gradient-to-b from-green-800 to-green-900 text-white flex flex-col">
      <div class="p-5 border-b border-green-700">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🎾</span>
          <div>
            <h1 class="font-bold text-lg leading-tight">TênisRank</h1>
            <p id="sidebar-clube" class="text-green-300 text-xs">Carregando...</p>
          </div>
        </div>
      </div>
      
      <!-- User Info -->
      <div class="p-4 border-b border-green-700 bg-green-900/30">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold text-lg" id="user-avatar">?</div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm truncate" id="user-name">Usuário</p>
            <span class="badge badge-yellow text-xs mt-0.5" id="user-perfil">-</span>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto p-3 space-y-1" id="sidebar-nav">
        <!-- Dynamic based on role -->
      </nav>

      <!-- Logout -->
      <div class="p-3 border-t border-green-700">
        <button onclick="logout()" class="btn w-full flex items-center gap-2 px-4 py-2.5 rounded-lg nav-item text-green-200 hover:text-white text-sm">
          <i class="fas fa-sign-out-alt"></i> Sair
        </button>
      </div>
    </div>

    <!-- Mobile overlay -->
    <div id="sidebar-overlay" class="hidden fixed inset-0 bg-black/50 z-40 md:hidden" onclick="toggleSidebar()"></div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top Bar -->
      <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-3">
          <button onclick="toggleSidebar()" class="md:hidden text-gray-500 hover:text-gray-700 text-xl">
            <i class="fas fa-bars"></i>
          </button>
          <h2 class="text-gray-800 font-semibold text-lg" id="page-title">Dashboard</h2>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500 hidden sm:block" id="header-clube"></span>
          <button onclick="refreshPage()" class="btn p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Atualizar">
            <i class="fas fa-sync-alt"></i>
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50" id="page-content">
        <div class="flex items-center justify-center h-64">
          <div class="spinner"></div>
        </div>
      </main>
    </div>
  </div>
</div>

<!-- Modal Container -->
<div id="modal-container"></div>

<script>
// ============================================================
// ESTADO GLOBAL
// ============================================================
const State = {
  token: localStorage.getItem('auth_token'),
  user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
  currentPage: 'dashboard',
  data: {}
}

// ============================================================
// API CLIENT
// ============================================================
const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  if (State.token) config.headers.Authorization = 'Bearer ' + State.token
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) logout()
    return Promise.reject(err)
  }
)

// ============================================================
// TOAST
// ============================================================
function toast(msg, type = 'success', duration = 3500) {
  const colors = { success: 'bg-green-600', error: 'bg-red-600', warning: 'bg-yellow-500', info: 'bg-blue-600' }
  const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' }
  const t = document.createElement('div')
  t.className = \`toast \${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-72 max-w-sm\`
  t.innerHTML = \`<i class="fas fa-\${icons[type]}"></i><span class="flex-1 text-sm">\${msg}</span><button onclick="this.parentElement.remove()" class="ml-2 opacity-70 hover:opacity-100">&times;</button>\`
  document.getElementById('toast-container').appendChild(t)
  setTimeout(() => t.remove(), duration)
}

// ============================================================
// AUTH
// ============================================================
function togglePassword() {
  const input = document.getElementById('login-senha')
  const icon = document.getElementById('eye-icon')
  input.type = input.type === 'password' ? 'text' : 'password'
  icon.className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash'
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = document.getElementById('login-btn')
  const errEl = document.getElementById('login-error')
  const email = document.getElementById('login-email').value
  const senha = document.getElementById('login-senha').value
  
  btn.innerHTML = '<div class="spinner mx-auto" style="width:20px;height:20px;border-width:2px"></div>'
  btn.disabled = true
  errEl.classList.add('hidden')

  try {
    const res = await api.post('/auth/login', { email, senha })
    const { token, usuario } = res.data.data
    State.token = token
    State.user = usuario
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_user', JSON.stringify(usuario))
    initApp()
  } catch(err) {
    const msg = err.response?.data?.error || 'Erro ao fazer login'
    errEl.textContent = msg
    errEl.classList.remove('hidden')
    btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Entrar'
    btn.disabled = false
  }
})

function logout() {
  State.token = null
  State.user = null
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
  document.getElementById('login-screen').classList.remove('hidden')
  document.getElementById('main-app').classList.add('hidden')
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
function initApp() {
  if (!State.token || !State.user) {
    document.getElementById('login-screen').classList.remove('hidden')
    document.getElementById('main-app').classList.add('hidden')
    return
  }

  document.getElementById('login-screen').classList.add('hidden')
  document.getElementById('main-app').classList.remove('hidden')

  // Configurar UI do usuário
  const u = State.user
  document.getElementById('user-name').textContent = u.nome
  document.getElementById('user-avatar').textContent = u.nome.charAt(0).toUpperCase()
  document.getElementById('user-perfil').textContent = perfilLabel(u.perfil)
  document.getElementById('sidebar-clube').textContent = u.clube_nome || 'Global'
  document.getElementById('header-clube').textContent = u.clube_nome ? '🏆 ' + u.clube_nome : ''

  renderNav()
  navigateTo('dashboard')
}

function perfilLabel(perfil) {
  return { ADMIN_GLOBAL: 'Admin Global', ADMIN_CLUBE: 'Admin Clube', JOGADOR: 'Jogador' }[perfil] || perfil
}

// ============================================================
// NAVEGAÇÃO
// ============================================================
const navItems = {
  ADMIN_GLOBAL: [
    { id: 'dashboard', label: 'Dashboard', icon: 'chart-line' },
    { id: 'clubes', label: 'Clubes', icon: 'building' },
    { id: 'usuarios', label: 'Usuários', icon: 'users' },
    { id: 'relatorio-jogadores', label: 'Rel. Jogadores', icon: 'user-friends' },
    { id: 'relatorio-pagamentos', label: 'Rel. Pagamentos', icon: 'file-invoice-dollar' },
    { id: 'auditoria', label: 'Auditoria', icon: 'history' },
  ],
  ADMIN_CLUBE: [
    { id: 'dashboard', label: 'Dashboard', icon: 'chart-line' },
    { id: 'classes', label: 'Classes', icon: 'layer-group' },
    { id: 'jogadores', label: 'Jogadores', icon: 'user-friends' },
    { id: 'pagamentos', label: 'Pagamentos', icon: 'money-bill-wave' },
    { id: 'sorteios', label: 'Sorteios', icon: 'random' },
    { id: 'rodadas', label: 'Rodadas', icon: 'calendar-alt' },
    { id: 'partidas', label: 'Partidas', icon: 'table-tennis' },
    { id: 'ranking', label: 'Ranking', icon: 'trophy' },
    { id: 'publicacoes', label: 'Publicações', icon: 'newspaper' },
    { id: 'configuracoes', label: 'Configurações', icon: 'cog' },
  ],
  JOGADOR: [
    { id: 'dashboard', label: 'Meu Painel', icon: 'home' },
    { id: 'ranking', label: 'Ranking', icon: 'trophy' },
    { id: 'minhas-partidas', label: 'Minhas Partidas', icon: 'table-tennis' },
    { id: 'desafios', label: 'Desafios', icon: 'fist-raised' },
    { id: 'publicacoes', label: 'Publicações', icon: 'newspaper' },
    { id: 'perfil', label: 'Meu Perfil', icon: 'user' },
  ]
}

function renderNav() {
  const items = navItems[State.user.perfil] || []
  const nav = document.getElementById('sidebar-nav')
  nav.innerHTML = items.map(item => \`
    <button onclick="navigateTo('\${item.id}')" id="nav-\${item.id}"
      class="btn nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-green-100 hover:text-white text-sm">
      <i class="fas fa-\${item.icon} w-5 text-center"></i>
      <span>\${item.label}</span>
    </button>
  \`).join('')
}

function navigateTo(page) {
  State.currentPage = page
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'))
  const navEl = document.getElementById('nav-' + page)
  if (navEl) navEl.classList.add('active')

  const titles = {
    dashboard: 'Dashboard', clubes: 'Gestão de Clubes', usuarios: 'Usuários',
    auditoria: 'Auditoria', classes: 'Classes', jogadores: 'Jogadores',
    sorteios: 'Sorteio de Rodada', rodadas: 'Rodadas', partidas: 'Partidas',
    ranking: 'Ranking', configuracoes: 'Configurações', 'minhas-partidas': 'Minhas Partidas',
    perfil: 'Meu Perfil', pagamentos: 'Gestão de Pagamentos', desafios: 'Desafios',
    publicacoes: 'Publicações', 'relatorio-jogadores': 'Relatório de Jogadores',
    'relatorio-pagamentos': 'Relatório de Pagamentos'
  }
  document.getElementById('page-title').textContent = titles[page] || page

  const content = document.getElementById('page-content')
  content.innerHTML = '<div class="flex items-center justify-center h-64"><div class="spinner"></div></div>'

  setTimeout(() => renderPage(page), 100)
  
  // Fechar sidebar no mobile
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.remove('open')
    document.getElementById('sidebar-overlay').classList.add('hidden')
  }
}

function refreshPage() { navigateTo(State.currentPage) }

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar')
  const overlay = document.getElementById('sidebar-overlay')
  sidebar.classList.toggle('open')
  overlay.classList.toggle('hidden')
}

// ============================================================
// RENDERIZAÇÃO DE PÁGINAS
// ============================================================
async function renderPage(page) {
  const perfil = State.user.perfil
  try {
    if (page === 'dashboard') {
      if (perfil === 'ADMIN_GLOBAL') await renderDashboardGlobal()
      else if (perfil === 'ADMIN_CLUBE') await renderDashboardClube()
      else await renderDashboardJogador()
    } else if (page === 'clubes' && perfil === 'ADMIN_GLOBAL') await renderClubes()
    else if (page === 'usuarios' && perfil === 'ADMIN_GLOBAL') await renderUsuarios()
    else if (page === 'auditoria' && perfil === 'ADMIN_GLOBAL') await renderAuditoria()
    else if (page === 'relatorio-jogadores' && perfil === 'ADMIN_GLOBAL') await renderRelatorioJogadores()
    else if (page === 'relatorio-pagamentos' && perfil === 'ADMIN_GLOBAL') await renderRelatorioPagamentosGlobal()
    else if (page === 'classes') await renderClasses()
    else if (page === 'jogadores') await renderJogadores()
    else if (page === 'pagamentos' && perfil === 'ADMIN_CLUBE') await renderPagamentos()
    else if (page === 'sorteios') await renderSorteios()
    else if (page === 'rodadas') await renderRodadas()
    else if (page === 'partidas') await renderPartidas()
    else if (page === 'ranking') {
      if (perfil === 'ADMIN_CLUBE' || perfil === 'ADMIN_GLOBAL') await renderRankingAdmin()
      else await renderRankingJogador()
    }
    else if (page === 'configuracoes') await renderConfiguracoes()
    else if (page === 'minhas-partidas') await renderMinhasPartidas()
    else if (page === 'desafios') await renderDesafiosJogador()
    else if (page === 'publicacoes') await renderPublicacoes()
    else if (page === 'perfil') await renderPerfil()
    else setContent('<div class="text-center text-gray-400 mt-20"><i class="fas fa-construction text-4xl mb-4"></i><p>Página em desenvolvimento</p></div>')
  } catch(e) {
    console.error(e)
    setContent('<div class="text-center text-red-400 mt-20"><i class="fas fa-exclamation-circle text-4xl mb-4"></i><p>Erro ao carregar página</p></div>')
  }
}

function setContent(html) {
  document.getElementById('page-content').innerHTML = '<div class="fade-in">' + html + '</div>'
}

// ============================================================
// HELPERS UI
// ============================================================
function statusBadge(status, type = 'club') {
  const map = {
    ATIVO: 'badge-green', ATIVA: 'badge-green', ATIVADO: 'badge-green',
    INATIVO: 'badge-red', INATIVA: 'badge-red',
    PENDENTE: 'badge-yellow', EM_ANDAMENTO: 'badge-blue',
    FINALIZADA: 'badge-green', WO: 'badge-gray', CANCELADA: 'badge-red',
    ENCERRADA: 'badge-gray'
  }
  const labels = {
    ATIVO: 'Ativo', ATIVA: 'Ativa', INATIVO: 'Inativo', INATIVA: 'Inativa',
    PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em Andamento', FINALIZADA: 'Finalizada',
    WO: 'W.O.', CANCELADA: 'Cancelada', ENCERRADA: 'Encerrada', ATIVADO: 'Ativo'
  }
  return \`<span class="badge \${map[status] || 'badge-gray'}">\${labels[status] || status}</span>\`
}

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDateOnly(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('pt-BR')
}

function statCard(icon, label, value, color = 'green', sub = '') {
  return \`
    <div class="card bg-white rounded-xl p-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-gray-500 text-sm font-medium">\${label}</p>
          <p class="text-3xl font-bold text-gray-800 mt-1">\${value}</p>
          \${sub ? \`<p class="text-xs text-gray-400 mt-1">\${sub}</p>\` : ''}
        </div>
        <div class="w-14 h-14 rounded-2xl bg-\${color}-100 flex items-center justify-center">
          <i class="fas fa-\${icon} text-\${color}-600 text-xl"></i>
        </div>
      </div>
    </div>
  \`
}

// ============================================================
// MODAL
// ============================================================
function showModal(title, bodyHtml, onConfirm, confirmLabel = 'Salvar', size = 'max-w-lg') {
  const modal = document.createElement('div')
  modal.id = 'modal-overlay'
  modal.className = 'fixed inset-0 modal-bg flex items-center justify-center z-50 p-4'
  modal.innerHTML = \`
    <div class="bg-white rounded-2xl shadow-2xl w-full \${size} max-h-[90vh] flex flex-col fade-in">
      <div class="flex items-center justify-between p-5 border-b border-gray-100">
        <h3 class="text-lg font-bold text-gray-800">\${title}</h3>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">&times;</button>
      </div>
      <div class="p-5 overflow-y-auto flex-1">\${bodyHtml}</div>
      <div class="flex gap-3 p-5 border-t border-gray-100">
        <button onclick="closeModal()" class="btn flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 font-medium">Cancelar</button>
        <button id="modal-confirm" class="btn flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-semibold">\${confirmLabel}</button>
      </div>
    </div>
  \`
  document.getElementById('modal-container').appendChild(modal)
  if (onConfirm) document.getElementById('modal-confirm').addEventListener('click', onConfirm)
  document.addEventListener('keydown', handleEsc)
}

function closeModal() {
  const modal = document.getElementById('modal-overlay')
  if (modal) modal.remove()
  document.removeEventListener('keydown', handleEsc)
}

function handleEsc(e) { if (e.key === 'Escape') closeModal() }

function confirmDelete(msg, onConfirm) {
  showModal(
    '<span class="text-red-600"><i class="fas fa-exclamation-triangle mr-2"></i>Confirmar Ação</span>',
    \`<p class="text-gray-700">\${msg}</p>\`,
    onConfirm, 'Confirmar'
  )
  document.getElementById('modal-confirm').className = 'btn flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold'
}

function formGroup(label, inputHtml, required = false) {
  return \`
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-1">\${label}\${required ? '<span class="text-red-500 ml-1">*</span>' : ''}</label>
      \${inputHtml}
    </div>
  \`
}

function inputClass() { return 'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm' }
function selectClass() { return 'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm bg-white' }

// ============================================================
// DASHBOARD GLOBAL
// ============================================================
async function renderDashboardGlobal() {
  const res = await api.get('/admin/global/dashboard')
  const d = res.data.data
  
  setContent(\`
    <div class="space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        \${statCard('building', 'Total Clubes', d.total_clubes, 'blue')}
        \${statCard('check-circle', 'Clubes Ativos', d.clubes_ativos, 'green')}
        \${statCard('users', 'Usuários', d.total_usuarios, 'purple')}
        \${statCard('user-friends', 'Jogadores', d.total_jogadores, 'yellow')}
        \${statCard('random', 'Rodadas', d.total_rodadas, 'indigo')}
        \${statCard('hourglass-half', 'Partidas Pendentes', d.partidas_pendentes, 'orange')}
      </div>
      
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="card bg-white rounded-xl p-5">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-building text-blue-500"></i>Clubes Recentes</h3>
          \${d.clubes_recentes.length === 0 ? '<p class="text-gray-400 text-sm text-center py-6">Nenhum clube cadastrado</p>' : \`
            <div class="space-y-2">
              \${d.clubes_recentes.map(c => \`
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p class="font-medium text-gray-800 text-sm">\${c.nome}</p>
                    <p class="text-xs text-gray-400">\${c.cidade || ''}\${c.estado ? ', '+c.estado : ''}</p>
                  </div>
                  \${statusBadge(c.status)}
                </div>
              \`).join('')}
            </div>
          \`}
          <button onclick="navigateTo('clubes')" class="btn mt-4 w-full text-center text-green-600 hover:text-green-700 text-sm font-medium">Ver todos os clubes →</button>
        </div>

        <div class="card bg-white rounded-xl p-5">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-chart-bar text-green-500"></i>Clubes por Atividade</h3>
          \${(d.stats_clubes || []).slice(0,5).map(c => \`
            <div class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">\${c.nome}</p>
                <p class="text-xs text-gray-400">\${c.jogadores_ativos} jogadores · \${c.total_rodadas} rodadas</p>
              </div>
              \${c.partidas_pendentes > 0 ? \`<span class="badge badge-yellow">\${c.partidas_pendentes} pend.</span>\` : '<span class="badge badge-green">OK</span>'}
            </div>
          \`).join('')}
          <button onclick="navigateTo('relatorio-jogadores')" class="btn mt-4 w-full text-center text-green-600 hover:text-green-700 text-sm font-medium">Ver relatório completo →</button>
        </div>
        
        <div class="card bg-white rounded-xl p-5">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-history text-purple-500"></i>Eventos Recentes</h3>
          \${d.eventos_recentes.length === 0 ? '<p class="text-gray-400 text-sm text-center py-6">Sem eventos registrados</p>' : \`
            <div class="space-y-2">
              \${d.eventos_recentes.slice(0,6).map(e => \`
                <div class="flex items-start gap-2 p-2 border-b border-gray-50 last:border-0">
                  <div class="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <i class="fas fa-bolt text-green-600 text-xs"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-gray-700">\${e.tipo_evento.replace(/_/g, ' ')}</p>
                    <p class="text-xs text-gray-400">\${e.usuario_nome || '-'} · \${fmtDate(e.data_evento)}</p>
                  </div>
                </div>
              \`).join('')}
            </div>
          \`}
          <button onclick="navigateTo('auditoria')" class="btn mt-4 w-full text-center text-green-600 hover:text-green-700 text-sm font-medium">Ver auditoria completa →</button>
        </div>
      </div>
    </div>
  \`)
}

// ============================================================
// RELATÓRIO DE JOGADORES (ADMIN GLOBAL)
// ============================================================
async function renderRelatorioJogadores() {
  const [clubesRes] = await Promise.all([api.get('/admin/global/clubes?limit=100')])
  const clubes = clubesRes.data.data.items || []

  setContent(\`
    <div class="space-y-4">
      <div class="card bg-white rounded-xl p-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Clube</label>
            <select id="f-rel-clube" class="\${selectClass()}" onchange="carregarRelJogadores()">
              <option value="">Todos os clubes</option>
              \${clubes.map(c => \`<option value="\${c.id}">\${c.nome}</option>\`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select id="f-rel-status" class="\${selectClass()}" onchange="carregarRelJogadores()">
              <option value="">Todos</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
              <option value="BLOQUEADO">Bloqueado</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Inadimplente</label>
            <select id="f-rel-inad" class="\${selectClass()}" onchange="carregarRelJogadores()">
              <option value="">Todos</option>
              <option value="true">Inadimplentes</option>
              <option value="false">Adimplentes</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Buscar</label>
            <input type="text" id="f-rel-busca" class="\${inputClass()}" placeholder="Nome ou email..." oninput="carregarRelJogadores()">
          </div>
        </div>
      </div>

      <div id="rel-jogadores-tabela">
        <div class="flex justify-center py-12"><div class="spinner"></div></div>
      </div>
    </div>
  \`)

  window.carregarRelJogadores = async () => {
    const clube_id = document.getElementById('f-rel-clube')?.value || ''
    const status = document.getElementById('f-rel-status')?.value || ''
    const inadimplente = document.getElementById('f-rel-inad')?.value || ''
    const busca = document.getElementById('f-rel-busca')?.value || ''
    
    document.getElementById('rel-jogadores-tabela').innerHTML = '<div class="flex justify-center py-12"><div class="spinner"></div></div>'

    try {
      const params = new URLSearchParams()
      if (clube_id) params.append('clube_id', clube_id)
      if (status) params.append('status', status)
      if (inadimplente) params.append('inadimplente', inadimplente)
      if (busca) params.append('busca', busca)
      params.append('limit', '100')

      const res = await api.get('/admin/global/relatorios/jogadores?' + params.toString())
      const { items, total } = res.data.data

      document.getElementById('rel-jogadores-tabela').innerHTML = \`
        <div class="card bg-white rounded-xl overflow-hidden">
          <div class="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="font-bold text-gray-800">Jogadores</h3>
            <span class="badge badge-blue">\${total} resultado(s)</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="text-left px-4 py-3 text-gray-600 font-semibold">Jogador</th>
                  <th class="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Clube / Classe</th>
                  <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Pts</th>
                  <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden lg:table-cell">Jogos</th>
                  <th class="text-center px-4 py-3 text-gray-600 font-semibold">Situação</th>
                </tr>
              </thead>
              <tbody>
                \${items.length === 0 ? '<tr><td colspan="5" class="text-center py-12 text-gray-400">Nenhum jogador encontrado</td></tr>' :
                  items.map(j => \`
                    <tr class="border-b border-gray-50 hover:bg-gray-50">
                      <td class="px-4 py-3">
                        <div>
                          <p class="font-medium text-gray-800">\${j.nome}</p>
                          <p class="text-xs text-gray-400">\${j.email || ''}\${j.telefone ? ' · ' + j.telefone : ''}</p>
                        </div>
                      </td>
                      <td class="px-4 py-3 hidden md:table-cell">
                        <p class="text-sm text-gray-600">\${j.clube_nome || '-'}</p>
                        <p class="text-xs text-gray-400">\${j.classe_nome || '-'}</p>
                      </td>
                      <td class="px-4 py-3 text-center hidden sm:table-cell font-bold text-green-700">\${j.pontos_total || 0}</td>
                      <td class="px-4 py-3 text-center hidden lg:table-cell text-xs text-gray-500">\${j.total_jogos || 0} jogos · \${j.vitorias || 0} vitórias</td>
                      <td class="px-4 py-3 text-center">
                        \${j.inadimplente ? '<span class="badge badge-red">Inadimplente</span>' : statusBadge(j.status)}
                        \${j.dias_inadimplente > 0 ? \`<p class="text-xs text-red-500 mt-0.5">\${j.dias_inadimplente}d atraso</p>\` : ''}
                      </td>
                    </tr>
                  \`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      \`
    } catch(e) {
      document.getElementById('rel-jogadores-tabela').innerHTML = '<div class="text-center text-red-400 py-8">Erro ao carregar relatório</div>'
    }
  }

  await window.carregarRelJogadores()
}

// ============================================================
// RELATÓRIO DE PAGAMENTOS GLOBAL
// ============================================================
async function renderRelatorioPagamentosGlobal() {
  const [clubesRes] = await Promise.all([api.get('/admin/global/clubes?limit=100')])
  const clubes = clubesRes.data.data.items || []

  setContent(\`
    <div class="space-y-4">
      <div class="card bg-white rounded-xl p-4">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Clube</label>
            <select id="f-pgmt-clube" class="\${selectClass()}" onchange="carregarRelPagamentos()">
              <option value="">Todos os clubes</option>
              \${clubes.map(c => \`<option value="\${c.id}">\${c.nome}</option>\`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Referência (mês/ano)</label>
            <input type="text" id="f-pgmt-ref" class="\${inputClass()}" placeholder="Ex: 2025-06" oninput="carregarRelPagamentos()">
          </div>
          <div class="flex items-end">
            <button onclick="carregarRelPagamentos()" class="btn bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 w-full">
              <i class="fas fa-search mr-1"></i> Filtrar
            </button>
          </div>
        </div>
      </div>

      <div id="rel-resumo-pgmt">
        <div class="flex justify-center py-12"><div class="spinner"></div></div>
      </div>
    </div>
  \`)

  window.carregarRelPagamentos = async () => {
    const clube_id = document.getElementById('f-pgmt-clube')?.value || ''
    const referencia = document.getElementById('f-pgmt-ref')?.value || ''

    document.getElementById('rel-resumo-pgmt').innerHTML = '<div class="flex justify-center py-12"><div class="spinner"></div></div>'

    try {
      const params = new URLSearchParams()
      if (clube_id) params.append('clube_id', clube_id)
      if (referencia) params.append('referencia', referencia)

      const res = await api.get('/admin/global/relatorios/pagamentos?' + params.toString())
      const { resumo, por_clube } = res.data.data

      document.getElementById('rel-resumo-pgmt').innerHTML = \`
        <div class="space-y-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            \${statCard('check-circle', 'Adimplentes', resumo.adimplentes, 'green', 'R$ ' + (resumo.total_recebido||0).toFixed(2))}
            \${statCard('clock', 'A Vencer (30d)', resumo.vencendo_30_dias, 'yellow')}
            \${statCard('exclamation-circle', 'Em Atraso', resumo.vencidos, 'red', 'R$ ' + (resumo.valor_em_atraso||0).toFixed(2))}
            \${statCard('dollar-sign', 'Total Arrecadado', 'R$ ' + (resumo.total_arrecadado||0).toFixed(2), 'blue')}
          </div>

          <div class="card bg-white rounded-xl overflow-hidden">
            <div class="p-4 border-b border-gray-100">
              <h3 class="font-bold text-gray-800">Pagamentos por Clube</h3>
            </div>
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="text-left px-4 py-3 text-gray-600 font-semibold">Clube</th>
                  <th class="text-center px-4 py-3 text-gray-600 font-semibold">Pagos</th>
                  <th class="text-center px-4 py-3 text-gray-600 font-semibold">Pendentes</th>
                  <th class="text-center px-4 py-3 text-gray-600 font-semibold">Vencidos</th>
                  <th class="text-right px-4 py-3 text-gray-600 font-semibold">Arrecadado</th>
                </tr>
              </thead>
              <tbody>
                \${por_clube.length === 0 ? '<tr><td colspan="5" class="text-center py-8 text-gray-400">Nenhum dado encontrado</td></tr>' :
                  por_clube.map(c => \`
                    <tr class="border-b border-gray-50 hover:bg-gray-50">
                      <td class="px-4 py-3 font-medium text-gray-800">\${c.clube_nome}</td>
                      <td class="px-4 py-3 text-center"><span class="badge badge-green">\${c.pagos}</span></td>
                      <td class="px-4 py-3 text-center"><span class="badge badge-yellow">\${c.pendentes}</span></td>
                      <td class="px-4 py-3 text-center"><span class="badge badge-red">\${c.vencidos}</span></td>
                      <td class="px-4 py-3 text-right font-bold text-green-700">R$ \${(c.total_arrecadado||0).toFixed(2)}</td>
                    </tr>
                  \`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      \`
    } catch(e) {
      document.getElementById('rel-resumo-pgmt').innerHTML = '<div class="text-center text-red-400 py-8">Relatório de pagamentos não disponível. Execute a migration 0003.</div>'
    }
  }

  await window.carregarRelPagamentos()
}

// ============================================================
// CLUBES (ADMIN GLOBAL)
// ============================================================
async function renderClubes() {
  const res = await api.get('/admin/global/clubes')
  const clubes = res.data.data.items || []
  
  setContent(\`
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <input type="text" id="busca-clube" placeholder="Buscar clube..." class="\${inputClass()} w-56" oninput="filtrarClubes(this.value)">
        </div>
        <button onclick="modalNovoClube()" class="btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
          <i class="fas fa-plus"></i> Novo Clube
        </button>
      </div>
      
      <div class="card bg-white rounded-xl overflow-hidden">
        <table class="w-full text-sm" id="tabela-clubes">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">Clube</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Admins</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Jogadores</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden lg:table-cell">Classes</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold">Status</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            \${clubes.length === 0 ? \`
              <tr><td colspan="6" class="text-center py-12 text-gray-400"><i class="fas fa-building text-3xl mb-3 block"></i>Nenhum clube cadastrado</td></tr>
            \` : clubes.map(c => \`
              <tr class="table-row border-b border-gray-50" data-nome="\${c.nome.toLowerCase()}">
                <td class="px-4 py-3">
                  <div>
                    <p class="font-semibold text-gray-800">\${c.nome}</p>
                    <p class="text-xs text-gray-400">\${c.cidade || ''}\${c.cidade && c.estado ? ', ' : ''}\${c.estado || ''}</p>
                  </div>
                </td>
                <td class="px-4 py-3 text-center hidden sm:table-cell"><span class="font-medium text-gray-700">\${c.total_admins || 0}</span></td>
                <td class="px-4 py-3 text-center hidden md:table-cell"><span class="font-medium text-gray-700">\${c.total_jogadores || 0}</span></td>
                <td class="px-4 py-3 text-center hidden lg:table-cell"><span class="font-medium text-gray-700">\${c.total_classes || 0}</span></td>
                <td class="px-4 py-3 text-center">\${statusBadge(c.status)}</td>
                <td class="px-4 py-3 text-center">
                  <div class="flex justify-center gap-1">
                    <button onclick="modalEditarClube('\${c.id}', \${JSON.stringify(c).replace(/'/g, '&apos;')})" class="btn p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Editar"><i class="fas fa-edit"></i></button>
                    <button onclick="modalAdminClube('\${c.id}', '\${c.nome}')" class="btn p-2 text-purple-500 hover:bg-purple-50 rounded-lg" title="Add Admin"><i class="fas fa-user-plus"></i></button>
                    <button onclick="alterarStatusClube('\${c.id}', '\${c.status}')" class="btn p-2 \${c.status === 'ATIVO' ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'} rounded-lg" title="\${c.status === 'ATIVO' ? 'Inativar' : 'Ativar'}">
                      <i class="fas fa-\${c.status === 'ATIVO' ? 'ban' : 'check-circle'}"></i>
                    </button>
                  </div>
                </td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  \`)
}

function filtrarClubes(busca) {
  document.querySelectorAll('#tabela-clubes tbody tr[data-nome]').forEach(row => {
    row.style.display = row.dataset.nome.includes(busca.toLowerCase()) ? '' : 'none'
  })
}

function modalNovoClube() {
  showModal('Novo Clube', \`
    \${formGroup('Nome do Clube', \`<input type="text" id="f-nome" class="\${inputClass()}" placeholder="Ex: Clube Atlético">\`, true)}
    <div class="grid grid-cols-2 gap-3">
      \${formGroup('Cidade', \`<input type="text" id="f-cidade" class="\${inputClass()}" placeholder="São Paulo">\`)}
      \${formGroup('Estado', \`<input type="text" id="f-estado" class="\${inputClass()}" placeholder="SP" maxlength="2">\`)}
    </div>
    \${formGroup('Email de Contato', \`<input type="email" id="f-email" class="\${inputClass()}" placeholder="contato@clube.com">\`)}
    \${formGroup('Telefone', \`<input type="tel" id="f-telefone" class="\${inputClass()}" placeholder="(11) 9999-9999">\`)}
  \`, async () => {
    try {
      await api.post('/admin/global/clubes', {
        nome: document.getElementById('f-nome').value,
        cidade: document.getElementById('f-cidade').value,
        estado: document.getElementById('f-estado').value,
        email_contato: document.getElementById('f-email').value,
        telefone: document.getElementById('f-telefone').value
      })
      closeModal()
      toast('Clube criado com sucesso!')
      renderClubes()
    } catch(e) { toast(e.response?.data?.error || 'Erro ao criar clube', 'error') }
  })
}

function modalEditarClube(id, c) {
  showModal('Editar Clube', \`
    \${formGroup('Nome do Clube', \`<input type="text" id="f-nome" class="\${inputClass()}" value="\${c.nome || ''}">\`, true)}
    <div class="grid grid-cols-2 gap-3">
      \${formGroup('Cidade', \`<input type="text" id="f-cidade" class="\${inputClass()}" value="\${c.cidade || ''}">\`)}
      \${formGroup('Estado', \`<input type="text" id="f-estado" class="\${inputClass()}" value="\${c.estado || ''}" maxlength="2">\`)}
    </div>
    \${formGroup('Email de Contato', \`<input type="email" id="f-email" class="\${inputClass()}" value="\${c.email_contato || ''}">\`)}
    \${formGroup('Telefone', \`<input type="tel" id="f-telefone" class="\${inputClass()}" value="\${c.telefone || ''}">\`)}
  \`, async () => {
    try {
      await api.put('/admin/global/clubes/' + id, {
        nome: document.getElementById('f-nome').value,
        cidade: document.getElementById('f-cidade').value,
        estado: document.getElementById('f-estado').value,
        email_contato: document.getElementById('f-email').value,
        telefone: document.getElementById('f-telefone').value
      })
      closeModal(); toast('Clube atualizado!'); renderClubes()
    } catch(e) { toast(e.response?.data?.error || 'Erro ao atualizar', 'error') }
  })
}

function modalAdminClube(clube_id, clube_nome) {
  showModal('Adicionar Administrador — ' + clube_nome, \`
    \${formGroup('Nome', \`<input type="text" id="f-nome" class="\${inputClass()}" placeholder="Nome completo">\`, true)}
    \${formGroup('Email', \`<input type="email" id="f-email" class="\${inputClass()}" placeholder="admin@clube.com">\`, true)}
    \${formGroup('Senha', \`<input type="password" id="f-senha" class="\${inputClass()}" placeholder="Mínimo 6 caracteres">\`, true)}
  \`, async () => {
    try {
      await api.post('/admin/global/clubes/' + clube_id + '/administradores', {
        nome: document.getElementById('f-nome').value,
        email: document.getElementById('f-email').value,
        senha: document.getElementById('f-senha').value
      })
      closeModal(); toast('Administrador vinculado ao clube!')
    } catch(e) { toast(e.response?.data?.error || 'Erro ao vincular admin', 'error') }
  })
}

async function alterarStatusClube(id, statusAtual) {
  const novoStatus = statusAtual === 'ATIVO' ? 'INATIVO' : 'ATIVO'
  const msg = statusAtual === 'ATIVO' 
    ? 'Tem certeza que deseja <strong>inativar</strong> este clube? Todos os usuários do clube perderão acesso.'
    : 'Deseja <strong>reativar</strong> este clube?'
  confirmDelete(msg, async () => {
    try {
      await api.patch('/admin/global/clubes/' + id + '/status', { status: novoStatus })
      closeModal(); toast('Status do clube atualizado!'); renderClubes()
    } catch(e) { toast(e.response?.data?.error || 'Erro', 'error') }
  })
}

// ============================================================
// USUÁRIOS (ADMIN GLOBAL)
// ============================================================
async function renderUsuarios() {
  const res = await api.get('/admin/global/usuarios')
  const usuarios = res.data.data || []
  
  setContent(\`
    <div class="space-y-4">
      <div class="card bg-white rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-bold text-gray-800">Todos os Usuários</h3>
          <span class="badge badge-blue">\${usuarios.length} usuários</span>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">Usuário</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Perfil</th>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Clube</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden lg:table-cell">Último Login</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            \${usuarios.map(u => \`
              <tr class="table-row border-b border-gray-50">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">\${u.nome.charAt(0)}</div>
                    <div>
                      <p class="font-medium text-gray-800">\${u.nome}</p>
                      <p class="text-xs text-gray-400">\${u.email}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-center hidden sm:table-cell">\${statusBadge(u.perfil === 'ADMIN_GLOBAL' ? 'ATIVO' : u.perfil === 'ADMIN_CLUBE' ? 'ATIVA' : 'PENDENTE')}<span class="ml-1 text-xs text-gray-500">\${perfilLabel(u.perfil)}</span></td>
                <td class="px-4 py-3 hidden md:table-cell"><span class="text-sm text-gray-600">\${u.clube_nome || '<span class="text-gray-400">-</span>'}</span></td>
                <td class="px-4 py-3 text-center hidden lg:table-cell text-xs text-gray-500">\${fmtDate(u.ultimo_login)}</td>
                <td class="px-4 py-3 text-center">\${statusBadge(u.status)}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  \`)
}

// ============================================================
// AUDITORIA (ADMIN GLOBAL)
// ============================================================
async function renderAuditoria() {
  const res = await api.get('/admin/global/auditoria?limit=50')
  const { items } = res.data.data

  const eventColors = {
    CLUBE_CRIADO: 'green', CLUBE_ATUALIZADO: 'blue', CLUBE_STATUS_ALTERADO: 'yellow',
    RODADA_GERADA: 'purple', PARTIDA_FINALIZADA: 'green', USUARIO_LOGIN: 'blue',
    JOGADOR_CRIADO: 'green', CLASSE_CRIADA: 'green', CONFIGURACAO_ATUALIZADA: 'orange'
  }

  setContent(\`
    <div class="space-y-4">
      <div class="card bg-white rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-100">
          <h3 class="font-bold text-gray-800">Log de Auditoria</h3>
        </div>
        \${items.length === 0 ? '<p class="text-center text-gray-400 py-12">Nenhum evento registrado</p>' : \`
          <div class="divide-y divide-gray-50">
            \${items.map(e => \`
              <div class="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                <div class="w-8 h-8 rounded-full bg-\${eventColors[e.tipo_evento] || 'gray'}-100 flex items-center justify-center shrink-0 mt-0.5">
                  <i class="fas fa-bolt text-\${eventColors[e.tipo_evento] || 'gray'}-600 text-xs"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-medium text-gray-800">\${e.tipo_evento.replace(/_/g, ' ')}</p>
                    <span class="text-xs text-gray-400 whitespace-nowrap">\${fmtDate(e.data_evento)}</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-0.5">
                    \${e.usuario_nome || 'Sistema'}\${e.clube_nome ? ' · ' + e.clube_nome : ''} · Entidade: \${e.entidade}
                  </p>
                  \${e.payload_resumido ? \`<p class="text-xs text-gray-400 mt-0.5 truncate">\${e.payload_resumido}</p>\` : ''}
                </div>
              </div>
            \`).join('')}
          </div>
        \`}
      </div>
    </div>
  \`)
}

// ============================================================
// DASHBOARD DO CLUBE
// ============================================================
async function renderDashboardClube() {
  const res = await api.get('/admin/clube/dashboard')
  const d = res.data.data
  
  setContent(\`
    <div class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        \${statCard('layer-group', 'Classes Ativas', d.total_classes, 'blue')}
        \${statCard('user-friends', 'Jogadores', d.total_jogadores, 'green')}
        \${statCard('random', 'Rodadas', d.total_rodadas, 'purple')}
        \${statCard('hourglass-half', 'Partidas Pendentes', d.partidas_pendentes, 'yellow')}
        \${statCard('check-circle', 'Partidas Finalizadas', d.partidas_finalizadas, 'green')}
      </div>
      
      <div class="grid lg:grid-cols-2 gap-6">
        <div class="card bg-white rounded-xl p-5">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-layer-group text-blue-500"></i>Situação por Classe</h3>
          \${d.classes_stats.length === 0 ? '<p class="text-gray-400 text-sm text-center py-6">Nenhuma classe cadastrada</p>' : \`
            <div class="space-y-3">
              \${d.classes_stats.map(cl => \`
                <div class="p-3 bg-gray-50 rounded-lg">
                  <div class="flex items-center justify-between mb-2">
                    <p class="font-semibold text-gray-800 text-sm">\${cl.nome}</p>
                    <div class="flex gap-2">
                      <span class="badge badge-blue">\${cl.total_jogadores} jogadores</span>
                      \${cl.jogadores_bloqueados > 0 ? \`<span class="badge badge-red">\${cl.jogadores_bloqueados} bloqueados</span>\` : ''}
                    </div>
                  </div>
                  \${cl.total_jogadores > 0 ? \`
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                      <div class="bg-green-500 h-1.5 rounded-full" style="width: \${Math.max(0, ((cl.total_jogadores - cl.jogadores_bloqueados) / cl.total_jogadores) * 100)}%"></div>
                    </div>
                    <p class="text-xs text-gray-400 mt-1">\${cl.total_jogadores - cl.jogadores_bloqueados} elegíveis para sorteio</p>
                  \` : ''}
                </div>
              \`).join('')}
            </div>
          \`}
          <button onclick="navigateTo('sorteios')" class="btn mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
            <i class="fas fa-random"></i> Iniciar Novo Sorteio
          </button>
        </div>
        
        <div class="card bg-white rounded-xl p-5">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-calendar-alt text-purple-500"></i>Últimas Rodadas</h3>
          \${d.ultimas_rodadas.length === 0 ? '<p class="text-gray-400 text-sm text-center py-6">Nenhuma rodada gerada</p>' : \`
            <div class="space-y-2">
              \${d.ultimas_rodadas.map(r => \`
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p class="font-medium text-gray-800 text-sm">Rodada #\${r.numero} — \${r.classe_nome}</p>
                    <p class="text-xs text-gray-400">\${r.total_partidas} partidas · \${fmtDate(r.data_execucao)}</p>
                  </div>
                  \${statusBadge(r.status)}
                </div>
              \`).join('')}
            </div>
          \`}
          <button onclick="navigateTo('rodadas')" class="btn mt-4 w-full text-center text-green-600 hover:text-green-700 text-sm font-medium">Ver todas as rodadas →</button>
        </div>
      </div>
    </div>
  \`)
}

// ============================================================
// CLASSES
// ============================================================
async function renderClasses() {
  const res = await api.get('/admin/clube/classes')
  const classes = res.data.data || []
  
  setContent(\`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-gray-500">\${classes.length} classe(s) cadastrada(s)</p>
        <button onclick="modalNovaClasse()" class="btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
          <i class="fas fa-plus"></i> Nova Classe
        </button>
      </div>
      
      \${classes.length === 0 ? \`
        <div class="card bg-white rounded-xl p-12 text-center text-gray-400">
          <i class="fas fa-layer-group text-4xl mb-4 text-gray-300"></i>
          <p class="font-medium">Nenhuma classe cadastrada</p>
          <p class="text-sm mt-1">Crie a primeira classe para começar</p>
        </div>
      \` : \`
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          \${classes.map(cl => \`
            <div class="card bg-white rounded-xl p-5">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h3 class="font-bold text-gray-800">\${cl.nome}</h3>
                  \${cl.descricao ? \`<p class="text-sm text-gray-500 mt-0.5">\${cl.descricao}</p>\` : ''}
                </div>
                \${statusBadge(cl.status)}
              </div>
              <div class="flex gap-4 text-sm text-gray-600 mb-4">
                <div class="flex items-center gap-1">
                  <i class="fas fa-users text-green-500 text-xs"></i>
                  <span>\${cl.total_jogadores_ativos} ativos</span>
                </div>
                <div class="flex items-center gap-1">
                  <i class="fas fa-users-slash text-gray-400 text-xs"></i>
                  <span>\${cl.total_jogadores - cl.total_jogadores_ativos} inativos</span>
                </div>
              </div>
              <div class="flex gap-2">
                <button onclick="modalEditarClasse('\${cl.id}', \${JSON.stringify(cl).replace(/'/g, '&apos;')})" class="btn flex-1 border border-gray-200 text-gray-600 py-1.5 rounded-lg text-xs hover:bg-gray-50 font-medium">
                  <i class="fas fa-edit mr-1"></i>Editar
                </button>
                <button onclick="alterarStatusClasse('\${cl.id}', '\${cl.status}')" class="btn flex-1 \${cl.status === 'ATIVA' ? 'border border-red-200 text-red-500 hover:bg-red-50' : 'border border-green-200 text-green-600 hover:bg-green-50'} py-1.5 rounded-lg text-xs font-medium">
                  \${cl.status === 'ATIVA' ? '<i class="fas fa-ban mr-1"></i>Inativar' : '<i class="fas fa-check mr-1"></i>Ativar'}
                </button>
              </div>
            </div>
          \`).join('')}
        </div>
      \`}
    </div>
  \`)
}

function modalNovaClasse() {
  showModal('Nova Classe', \`
    \${formGroup('Nome da Classe', \`<input type="text" id="f-nome" class="\${inputClass()}" placeholder="Ex: Classe A, Iniciante, Avançado">\`, true)}
    \${formGroup('Descrição', \`<textarea id="f-desc" class="\${inputClass()}" rows="2" placeholder="Descrição opcional"></textarea>\`)}
    \${formGroup('Ordem de exibição', \`<input type="number" id="f-ordem" class="\${inputClass()}" value="0" min="0">\`)}
  \`, async () => {
    try {
      await api.post('/admin/clube/classes', {
        nome: document.getElementById('f-nome').value,
        descricao: document.getElementById('f-desc').value,
        ordem: parseInt(document.getElementById('f-ordem').value) || 0
      })
      closeModal(); toast('Classe criada!'); renderClasses()
    } catch(e) { toast(e.response?.data?.error || 'Erro ao criar classe', 'error') }
  })
}

function modalEditarClasse(id, cl) {
  showModal('Editar Classe', \`
    \${formGroup('Nome', \`<input type="text" id="f-nome" class="\${inputClass()}" value="\${cl.nome}">\`, true)}
    \${formGroup('Descrição', \`<textarea id="f-desc" class="\${inputClass()}" rows="2">\${cl.descricao || ''}</textarea>\`)}
    \${formGroup('Ordem', \`<input type="number" id="f-ordem" class="\${inputClass()}" value="\${cl.ordem || 0}" min="0">\`)}
  \`, async () => {
    try {
      await api.put('/admin/clube/classes/' + id, {
        nome: document.getElementById('f-nome').value,
        descricao: document.getElementById('f-desc').value,
        ordem: parseInt(document.getElementById('f-ordem').value) || 0
      })
      closeModal(); toast('Classe atualizada!'); renderClasses()
    } catch(e) { toast(e.response?.data?.error || 'Erro', 'error') }
  })
}

async function alterarStatusClasse(id, statusAtual) {
  const novoStatus = statusAtual === 'ATIVA' ? 'INATIVA' : 'ATIVA'
  try {
    await api.patch('/admin/clube/classes/' + id + '/status', { status: novoStatus })
    toast('Status da classe atualizado!'); renderClasses()
  } catch(e) { toast(e.response?.data?.error || 'Erro', 'error') }
}

// ============================================================
// JOGADORES
// ============================================================
async function renderJogadores() {
  const [jogRes, clRes] = await Promise.all([
    api.get('/admin/clube/jogadores'),
    api.get('/admin/clube/classes?status=ATIVA')
  ])
  const jogadores = jogRes.data.data || []
  const classes = clRes.data.data || []
  
  State.data.classes = classes

  setContent(\`
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <input type="text" id="busca-jogador" placeholder="Buscar jogador..." class="\${inputClass()} w-48" oninput="filtrarJogadores(this.value)">
          <select id="filtro-classe" class="\${selectClass()} w-40" onchange="filtrarJogadoresPorClasse(this.value)">
            <option value="">Todas as classes</option>
            \${classes.map(cl => \`<option value="\${cl.id}">\${cl.nome}</option>\`).join('')}
          </select>
        </div>
        <button onclick="modalNovoJogador()" class="btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
          <i class="fas fa-user-plus"></i> Novo Jogador
        </button>
      </div>
      
      <div class="card bg-white rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-bold text-gray-800">Jogadores Cadastrados</h3>
          <span class="badge badge-blue">\${jogadores.length} jogadores</span>
        </div>
        <table class="w-full text-sm" id="tabela-jogadores">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">Jogador</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Classe</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Pontos</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden lg:table-cell">Jogos Abertos</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold">Status</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            \${jogadores.length === 0 ? \`
              <tr><td colspan="6" class="text-center py-12 text-gray-400"><i class="fas fa-user-friends text-3xl mb-3 block"></i>Nenhum jogador cadastrado</td></tr>
            \` : jogadores.map(j => \`
              <tr class="table-row border-b border-gray-50" data-nome="\${j.nome.toLowerCase()}" data-classe="\${j.classe_id}">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">\${j.nome.charAt(0)}</div>
                    <div>
                      <p class="font-semibold text-gray-800">\${j.nome}</p>
                      <p class="text-xs text-gray-400">\${j.email || j.telefone || ''}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-center hidden sm:table-cell">
                  <span class="badge badge-blue">\${j.classe_nome || '-'}</span>
                </td>
                <td class="px-4 py-3 text-center hidden md:table-cell">
                  <span class="font-bold text-gray-700">\${j.pontos_total || 0}</span>
                  \${j.ranking_posicao > 0 ? \`<span class="text-xs text-gray-400 ml-1">#\${j.ranking_posicao}</span>\` : ''}
                </td>
                <td class="px-4 py-3 text-center hidden lg:table-cell">
                  <span class="\${j.jogos_abertos > 0 ? 'text-orange-600 font-bold' : 'text-gray-500'}">\${j.jogos_abertos}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  \${statusBadge(j.status)}
                  \${j.inadimplente ? '<br><span class="badge badge-red text-xs mt-1">Inadim.</span>' : ''}
                </td>
                <td class="px-4 py-3 text-center">
                  <div class="flex justify-center gap-1">
                    <button onclick="modalEditarJogador('\${j.id}', \${JSON.stringify(j).replace(/'/g, '&apos;')})" class="btn p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Editar"><i class="fas fa-edit"></i></button>
                    <button onclick="alterarStatusJogador('\${j.id}', '\${j.status}')" class="btn p-2 \${j.status === 'ATIVO' ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'} rounded-lg" title="\${j.status === 'ATIVO' ? 'Inativar' : 'Ativar'}">
                      <i class="fas fa-\${j.status === 'ATIVO' ? 'user-slash' : 'user-check'}"></i>
                    </button>
                    <button onclick="navigateTo('pagamentos')" class="btn p-2 text-green-500 hover:bg-green-50 rounded-lg" title="Ver pagamentos">
                      <i class="fas fa-money-bill"></i>
                    </button>
                  </div>
                </td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  \`)
}

function filtrarJogadores(busca) {
  document.querySelectorAll('#tabela-jogadores tbody tr[data-nome]').forEach(row => {
    const buscaMatch = !busca || row.dataset.nome.includes(busca.toLowerCase())
    const classeFilter = document.getElementById('filtro-classe')?.value
    const classeMatch = !classeFilter || row.dataset.classe === classeFilter
    row.style.display = buscaMatch && classeMatch ? '' : 'none'
  })
}

function filtrarJogadoresPorClasse(classeId) {
  const busca = document.getElementById('busca-jogador')?.value || ''
  filtrarJogadores(busca)
}

function modalNovoJogador() {
  const classes = State.data.classes || []
  showModal('Novo Jogador', \`
    \${formGroup('Nome', \`<input type="text" id="f-nome" class="\${inputClass()}" placeholder="Nome completo do jogador">\`, true)}
    \${formGroup('Classe', \`
      <select id="f-classe" class="\${selectClass()}">
        <option value="">Selecione a classe</option>
        \${classes.map(cl => \`<option value="\${cl.id}">\${cl.nome}</option>\`).join('')}
      </select>
    \`, true)}
    \${formGroup('Email', \`<input type="email" id="f-email" class="\${inputClass()}" placeholder="email@exemplo.com">\`)}
    \${formGroup('Telefone', \`<input type="tel" id="f-telefone" class="\${inputClass()}" placeholder="(11) 9999-9999">\`)}
  \`, async () => {
    const nome = document.getElementById('f-nome').value
    const classe_id = document.getElementById('f-classe').value
    if (!nome || !classe_id) { toast('Nome e classe são obrigatórios', 'error'); return }
    try {
      await api.post('/admin/clube/jogadores', {
        nome, classe_id,
        email: document.getElementById('f-email').value,
        telefone: document.getElementById('f-telefone').value
      })
      closeModal(); toast('Jogador cadastrado!'); renderJogadores()
    } catch(e) { toast(e.response?.data?.error || 'Erro ao criar jogador', 'error') }
  })
}

function modalEditarJogador(id, j) {
  const classes = State.data.classes || []
  showModal('Editar Jogador', \`
    \${formGroup('Nome', \`<input type="text" id="f-nome" class="\${inputClass()}" value="\${j.nome}">\`, true)}
    \${formGroup('Classe', \`
      <select id="f-classe" class="\${selectClass()}">
        \${classes.map(cl => \`<option value="\${cl.id}" \${cl.id === j.classe_id ? 'selected' : ''}>\${cl.nome}</option>\`).join('')}
      </select>
    \`, true)}
    \${formGroup('Email', \`<input type="email" id="f-email" class="\${inputClass()}" value="\${j.email || ''}">\`)}
    \${formGroup('Telefone', \`<input type="tel" id="f-telefone" class="\${inputClass()}" value="\${j.telefone || ''}">\`)}
  \`, async () => {
    try {
      await api.put('/admin/clube/jogadores/' + id, {
        nome: document.getElementById('f-nome').value,
        classe_id: document.getElementById('f-classe').value,
        email: document.getElementById('f-email').value,
        telefone: document.getElementById('f-telefone').value
      })
      closeModal(); toast('Jogador atualizado!'); renderJogadores()
    } catch(e) { toast(e.response?.data?.error || 'Erro', 'error') }
  })
}

async function alterarStatusJogador(id, statusAtual) {
  const novoStatus = statusAtual === 'ATIVO' ? 'INATIVO' : 'ATIVO'
  try {
    await api.patch('/admin/clube/jogadores/' + id + '/status', { status: novoStatus })
    toast('Status do jogador atualizado!'); renderJogadores()
  } catch(e) { toast(e.response?.data?.error || 'Erro', 'error') }
}

// ============================================================
// PAGAMENTOS (ADMIN CLUBE)
// ============================================================
async function renderPagamentos() {
  const [jogRes, configRes] = await Promise.all([
    api.get('/admin/clube/jogadores?status=ATIVO&limit=200').catch(() => ({ data: { data: [] } })),
    api.get('/admin/clube/configuracoes').catch(() => ({ data: { data: {} } }))
  ])
  const jogadores = jogRes.data.data || []
  const config = configRes.data.data || {}

  let resumoData = { adimplentes: 0, inadimplentes: 0, vencidos: 0, vencendo_30_dias: 0, total_arrecadado: 0, valor_em_atraso: 0 }
  let pagamentosData = []

  try {
    const [resumoRes, pgmtRes] = await Promise.all([
      api.get('/api/admin/clube/pagamentos/resumo').catch(e => null),
      api.get('/api/admin/clube/pagamentos?limit=100').catch(e => null)
    ])
    if (resumoRes) resumoData = resumoRes.data.data || resumoData
    if (pgmtRes) pagamentosData = pgmtRes.data.data?.items || []
  } catch(e) {}

  setContent(\`
    <div class="space-y-5">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        \${statCard('check-circle', 'Adimplentes', resumoData.adimplentes || 0, 'green')}
        \${statCard('clock', 'A Vencer', resumoData.vencendo_30_dias || 0, 'yellow', 'próx. 30 dias')}
        \${statCard('exclamation-circle', 'Em Atraso', resumoData.vencidos || 0, 'red')}
        \${statCard('dollar-sign', 'Arrecadado', 'R$ ' + ((resumoData.total_arrecadado || 0)).toFixed(2), 'blue')}
      </div>

      <div class="card bg-white rounded-xl p-5">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 class="font-bold text-gray-800 flex items-center gap-2"><i class="fas fa-money-bill-wave text-green-600"></i>Gestão de Pagamentos</h3>
          <div class="flex gap-2">
            <button onclick="modalNovoPagamento(\${JSON.stringify(jogadores).replace(/'/g,'&apos;')}, \${JSON.stringify(config).replace(/'/g,'&apos;')})" 
              class="btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <i class="fas fa-plus"></i> Registrar Pagamento
            </button>
            <button onclick="modalGerarMensalidades(\${JSON.stringify(jogadores).replace(/'/g,'&apos;')}, \${JSON.stringify(config).replace(/'/g,'&apos;')})"
              class="btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <i class="fas fa-calendar-plus mr-1"></i> Gerar Mensalidades
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 mb-4">
          <select id="f-pgmt-status" class="\${selectClass()} w-44" onchange="filtrarPagamentosClube()">
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
            <option value="VENCIDO">Vencido</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
          <select id="f-pgmt-jogador" class="\${selectClass()} w-48" onchange="filtrarPagamentosClube()">
            <option value="">Todos os jogadores</option>
            \${jogadores.map(j => \`<option value="\${j.id}">\${j.nome}</option>\`).join('')}
          </select>
          <button onclick="carregarPagamentosClube()" class="btn bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
            <i class="fas fa-search mr-1"></i> Buscar
          </button>
        </div>

        <div id="pgmt-lista">
          <div class="overflow-x-auto">
            <table class="w-full text-sm" id="tabela-pgmt">
              <thead class="bg-gray-50">
                <tr>
                  <th class="text-left px-4 py-3 text-gray-600 font-semibold">Jogador</th>
                  <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Referência</th>
                  <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Vencimento</th>
                  <th class="text-right px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Valor</th>
                  <th class="text-center px-4 py-3 text-gray-600 font-semibold">Status</th>
                  <th class="text-center px-4 py-3 text-gray-600 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody id="pgmt-tbody">
                \${pagamentosData.length === 0 ? '<tr><td colspan="6" class="text-center py-12 text-gray-400"><i class="fas fa-money-bill text-3xl mb-3 block text-gray-300"></i>Nenhum pagamento registrado</td></tr>' :
                  pagamentosData.map(p => \`
                    <tr class="border-b border-gray-50 hover:bg-gray-50" data-status="\${p.status}" data-jogador="\${p.jogador_id}">
                      <td class="px-4 py-3">
                        <p class="font-medium text-gray-800">\${p.jogador_nome}</p>
                        <p class="text-xs text-gray-400">\${p.jogador_email || ''}</p>
                      </td>
                      <td class="px-4 py-3 text-center hidden sm:table-cell text-sm text-gray-600">\${p.referencia}</td>
                      <td class="px-4 py-3 text-center hidden md:table-cell text-xs text-gray-500">\${fmtDateOnly(p.data_vencimento)}</td>
                      <td class="px-4 py-3 text-right hidden sm:table-cell font-semibold text-gray-800">R$ \${(p.valor||0).toFixed(2)}</td>
                      <td class="px-4 py-3 text-center">
                        \${p.status === 'VENCIDO' || (p.status === 'PENDENTE' && p.data_vencimento < new Date().toISOString().split('T')[0]) ? 
                          '<span class="badge badge-red">Vencido</span>' : 
                          statusBadge(p.status)}
                      </td>
                      <td class="px-4 py-3 text-center">
                        \${p.status !== 'PAGO' ? \`
                          <button onclick="marcarPago('\${p.id}')" class="btn p-2 text-green-500 hover:bg-green-50 rounded-lg text-xs" title="Marcar como pago">
                            <i class="fas fa-check"></i>
                          </button>
                        \` : '<span class="text-gray-300 text-xs">-</span>'}
                      </td>
                    </tr>
                  \`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  \`)

  window.filtrarPagamentosClube = () => {
    const status = document.getElementById('f-pgmt-status')?.value
    const jogador = document.getElementById('f-pgmt-jogador')?.value
    document.querySelectorAll('#tabela-pgmt tbody tr[data-status]').forEach(row => {
      const sMatch = !status || row.dataset.status === status
      const jMatch = !jogador || row.dataset.jogador === jogador
      row.style.display = sMatch && jMatch ? '' : 'none'
    })
  }

  window.carregarPagamentosClube = async () => {
    await renderPagamentos()
  }

  window.marcarPago = async (id) => {
    try {
      const mesAtual = new Date().toISOString().split('T')[0]
      await api.patch(\`/api/admin/clube/pagamentos/\${id}\`, { status: 'PAGO', data_pagamento: mesAtual, metodo_pagamento: 'PIX' })
      toast('Pagamento marcado como pago!')
      renderPagamentos()
    } catch(e) { toast(e.response?.data?.error || 'Erro', 'error') }
  }

  window.modalNovoPagamento = (jogs, cfg) => {
    const jogadores = typeof jogs === 'string' ? JSON.parse(jogs) : jogs
    const config = typeof cfg === 'string' ? JSON.parse(cfg) : cfg
    const mesAtual = new Date().toISOString().slice(0,7)
    const dataVenc = new Date()
    dataVenc.setDate(10)
    const dataVencStr = dataVenc.toISOString().split('T')[0]

    showModal('Registrar Pagamento', \`
      \${formGroup('Jogador', \`
        <select id="f-pg-jogador" class="\${selectClass()}">
          <option value="">-- Selecione --</option>
          \${jogadores.map(j => \`<option value="\${j.id}">\${j.nome}</option>\`).join('')}
        </select>
      \`, true)}
      \${formGroup('Referência (mês/ano)', \`<input type="text" id="f-pg-ref" class="\${inputClass()}" value="\${mesAtual}" placeholder="2025-06">\`, true)}
      \${formGroup('Valor (R$)', \`<input type="number" id="f-pg-valor" class="\${inputClass()}" value="\${config.valor_mensalidade || 0}" step="0.01" min="0">\`, true)}
      \${formGroup('Data de Vencimento', \`<input type="date" id="f-pg-venc" class="\${inputClass()}" value="\${dataVencStr}">\`, true)}
      \${formGroup('Status', \`
        <select id="f-pg-status" class="\${selectClass()}">
          <option value="PENDENTE">Pendente</option>
          <option value="PAGO">Pago</option>
        </select>
      \`)}
      \${formGroup('Método de Pagamento', \`
        <select id="f-pg-metodo" class="\${selectClass()}">
          <option value="">-- Selecione --</option>
          <option value="PIX">PIX</option>
          <option value="CARTAO_CREDITO">Cartão de Crédito</option>
          <option value="CARTAO_DEBITO">Cartão de Débito</option>
          <option value="DINHEIRO">Dinheiro</option>
          <option value="ISENTO">Isento</option>
        </select>
      \`)}
      \${formGroup('Observações', \`<textarea id="f-pg-obs" class="\${inputClass()}" rows="2" placeholder="Opcional..."></textarea>\`)}
    \`, async () => {
      try {
        await api.post('/api/admin/clube/pagamentos', {
          jogador_id: document.getElementById('f-pg-jogador').value,
          referencia: document.getElementById('f-pg-ref').value,
          valor: parseFloat(document.getElementById('f-pg-valor').value),
          data_vencimento: document.getElementById('f-pg-venc').value,
          status: document.getElementById('f-pg-status').value,
          metodo_pagamento: document.getElementById('f-pg-metodo').value || null,
          observacoes: document.getElementById('f-pg-obs').value || null
        })
        closeModal()
        toast('Pagamento registrado!')
        renderPagamentos()
      } catch(e) { toast(e.response?.data?.error || 'Erro ao registrar', 'error') }
    }, 'Registrar')
  }

  window.modalGerarMensalidades = (jogs, cfg) => {
    const jogadores = typeof jogs === 'string' ? JSON.parse(jogs) : jogs
    const config = typeof cfg === 'string' ? JSON.parse(cfg) : cfg
    const mesAtual = new Date().toISOString().slice(0,7)
    const dataVenc = new Date()
    dataVenc.setDate(10)

    showModal('Gerar Mensalidades em Lote', \`
      <div class="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
        <i class="fas fa-info-circle mr-2"></i>Gera uma cobrança pendente para todos os jogadores ativos
      </div>
      \${formGroup('Referência (mês/ano)', \`<input type="text" id="f-lot-ref" class="\${inputClass()}" value="\${mesAtual}" placeholder="2025-06">\`, true)}
      \${formGroup('Valor (R$)', \`<input type="number" id="f-lot-valor" class="\${inputClass()}" value="\${config.valor_mensalidade || 0}" step="0.01" min="0">\`, true)}
      \${formGroup('Data de Vencimento', \`<input type="date" id="f-lot-venc" class="\${inputClass()}" value="\${dataVenc.toISOString().split('T')[0]}">\`, true)}
      <p class="text-sm text-gray-500"><i class="fas fa-users mr-1"></i>\${jogadores.length} jogadores ativos serão cobrados</p>
    \`, async () => {
      try {
        const ref = document.getElementById('f-lot-ref').value
        const valor = parseFloat(document.getElementById('f-lot-valor').value)
        const venc = document.getElementById('f-lot-venc').value
        if (!ref || !valor || !venc) { toast('Preencha todos os campos', 'warning'); return }
        for (const j of jogadores) {
          await api.post('/api/admin/clube/pagamentos', { jogador_id: j.id, referencia: ref, valor, data_vencimento: venc, status: 'PENDENTE' }).catch(e => null)
        }
        closeModal()
        toast(\`\${jogadores.length} cobranças geradas!\`)
        renderPagamentos()
      } catch(e) { toast('Erro ao gerar mensalidades', 'error') }
    }, 'Gerar Mensalidades')
  }
}

// ============================================================
// PUBLICAÇÕES
// ============================================================
async function renderPublicacoes() {
  const perfil = State.user.perfil
  let pubs = []

  try {
    if (perfil === 'JOGADOR') {
      const res = await api.get('/jogador/publicacoes').catch(() => null)
      pubs = res?.data?.data || []
    } else {
      const res = await api.get('/api/publicacoes').catch(() => null)
      pubs = res?.data?.data?.items || res?.data?.data || []
    }
  } catch(e) {}

  const tipoIcon = { AVISO: 'bell', RESULTADO: 'trophy', EVENTO: 'calendar', NOVIDADE: 'star', OUTRO: 'newspaper' }
  const tipoCor = { AVISO: 'yellow', RESULTADO: 'green', EVENTO: 'blue', NOVIDADE: 'purple', OUTRO: 'gray' }

  const podePostar = perfil !== 'JOGADOR'

  setContent(\`
    <div class="space-y-4 max-w-3xl mx-auto">
      \${podePostar ? \`
        <div class="card bg-white rounded-xl p-5">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-pen-to-square text-green-600"></i>Nova Publicação</h3>
          <div class="space-y-3">
            \${formGroup('Título', \`<input type="text" id="pub-titulo" class="\${inputClass()}" placeholder="Título da publicação">\`)}
            \${formGroup('Tipo', \`
              <select id="pub-tipo" class="\${selectClass()}">
                <option value="AVISO">📢 Aviso</option>
                <option value="RESULTADO">🏆 Resultado</option>
                <option value="EVENTO">📅 Evento</option>
                <option value="NOVIDADE">⭐ Novidade</option>
                <option value="OUTRO">📰 Outro</option>
              </select>
            \`)}
            \${formGroup('Conteúdo', \`<textarea id="pub-conteudo" class="\${inputClass()}" rows="3" placeholder="Escreva o conteúdo..."></textarea>\`)}
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" id="pub-fixado"> Fixar publicação
              </label>
            </div>
            <button onclick="publicarPost()" class="btn bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium text-sm">
              <i class="fas fa-paper-plane mr-1"></i> Publicar
            </button>
          </div>
        </div>
      \` : ''}

      <div class="space-y-3">
        \${pubs.length === 0 ? \`
          <div class="card bg-white rounded-xl p-12 text-center text-gray-400">
            <i class="fas fa-newspaper text-4xl mb-4 text-gray-300"></i>
            <p>Nenhuma publicação ainda</p>
          </div>
        \` : pubs.map(pub => \`
          <div class="card bg-white rounded-xl p-5 \${pub.fixado ? 'border-l-4 border-green-500' : ''}">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-\${tipoCor[pub.tipo] || 'gray'}-100 flex items-center justify-center shrink-0">
                <i class="fas fa-\${tipoIcon[pub.tipo] || 'newspaper'} text-\${tipoCor[pub.tipo] || 'gray'}-600"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    \${pub.fixado ? '<span class="badge badge-green text-xs mb-1">📌 Fixada</span>' : ''}
                    <h3 class="font-bold text-gray-800">\${pub.titulo}</h3>
                    <p class="text-xs text-gray-400 mt-0.5">\${pub.autor_nome || 'Sistema'} · \${fmtDate(pub.created_at)}</p>
                  </div>
                  <span class="badge badge-\${tipoCor[pub.tipo] || 'gray'}-100 text-xs">\${pub.tipo}</span>
                </div>
                <p class="text-sm text-gray-600 mt-2">\${pub.conteudo}</p>
                \${pub.instagram_url || pub.facebook_url ? \`
                  <div class="flex gap-2 mt-2">
                    \${pub.instagram_url ? \`<a href="\${pub.instagram_url}" target="_blank" class="text-pink-500 text-sm hover:underline"><i class="fab fa-instagram mr-1"></i>Instagram</a>\` : ''}
                    \${pub.facebook_url ? \`<a href="\${pub.facebook_url}" target="_blank" class="text-blue-500 text-sm hover:underline"><i class="fab fa-facebook mr-1"></i>Facebook</a>\` : ''}
                  </div>
                \` : ''}
              </div>
            </div>
          </div>
        \`).join('')}
      </div>
    </div>
  \`)

  window.publicarPost = async () => {
    const titulo = document.getElementById('pub-titulo')?.value
    const conteudo = document.getElementById('pub-conteudo')?.value
    const tipo = document.getElementById('pub-tipo')?.value
    const fixado = document.getElementById('pub-fixado')?.checked

    if (!titulo || !conteudo) { toast('Preencha título e conteúdo', 'warning'); return }

    try {
      await api.post('/api/publicacoes', { titulo, conteudo, tipo, fixado: fixado ? 1 : 0 })
      toast('Publicação criada!')
      renderPublicacoes()
    } catch(e) { toast(e.response?.data?.error || 'Erro ao publicar', 'error') }
  }
}

// ============================================================
// SORTEIOS
// ============================================================
async function renderSorteios() {
  const [clRes, configRes] = await Promise.all([
    api.get('/admin/clube/classes?status=ATIVA'),
    api.get('/admin/clube/configuracoes')
  ])
  const classes = clRes.data.data || []
  const config = configRes.data.data || {}

  setContent(\`
    <div class="space-y-6 max-w-2xl mx-auto">
      <div class="card bg-white rounded-xl p-6">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
            <i class="fas fa-random text-purple-600 text-xl"></i>
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-800">Gerar Nova Rodada</h2>
            <p class="text-sm text-gray-500">Sorteio automático de confrontos por classe</p>
          </div>
        </div>
        
        <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800">
          <p class="font-semibold mb-1"><i class="fas fa-info-circle mr-1"></i>Regras de Elegibilidade:</p>
          <p>Jogadores com <strong>\${config.limite_jogos_aberto_por_jogador || 3} ou mais jogos em aberto</strong> serão excluídos automaticamente do sorteio.</p>
          <p class="mt-1">Período de WO: <strong>\${config.dias_para_wo || 14} dias</strong> após o sorteio.</p>
        </div>
        
        <div class="space-y-4">
          \${formGroup('Selecione a Classe para Sortear', \`
            <select id="sorteio-classe" class="\${selectClass()} text-base py-3">
              <option value="">-- Selecione uma classe --</option>
              \${classes.map(cl => \`<option value="\${cl.id}">\${cl.nome}</option>\`).join('')}
            </select>
          \`, true)}
          
          <div id="sorteio-preview" class="hidden p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-2 font-medium">Carregando informações...</p>
          </div>
          
          <button id="btn-sortear" onclick="executarSorteio()" class="btn w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold text-base flex items-center justify-center gap-2">
            <i class="fas fa-dice"></i> Realizar Sorteio
          </button>
        </div>
      </div>
      
      <div id="sorteio-resultado" class="hidden"></div>
    </div>
  \`)

  document.getElementById('sorteio-classe').addEventListener('change', async (e) => {
    const classeId = e.target.value
    if (!classeId) { document.getElementById('sorteio-preview').classList.add('hidden'); return }
    
    try {
      const jogRes = await api.get('/admin/clube/jogadores?status=ATIVO&classe_id=' + classeId)
      const jogadores = jogRes.data.data || []
      const limite = config.limite_jogos_aberto_por_jogador || 3
      const elegiveis = jogadores.filter(j => j.jogos_abertos < limite)
      const excluidos = jogadores.filter(j => j.jogos_abertos >= limite)
      const pares = Math.floor(elegiveis.length / 2)

      document.getElementById('sorteio-preview').innerHTML = \`
        <div class="grid grid-cols-3 gap-3 text-center mb-3">
          <div class="p-3 bg-white rounded-lg"><p class="text-2xl font-bold text-gray-800">\${jogadores.length}</p><p class="text-xs text-gray-500">Total</p></div>
          <div class="p-3 bg-green-50 rounded-lg"><p class="text-2xl font-bold text-green-700">\${elegiveis.length}</p><p class="text-xs text-green-600">Elegíveis</p></div>
          <div class="p-3 bg-red-50 rounded-lg"><p class="text-2xl font-bold text-red-600">\${excluidos.length}</p><p class="text-xs text-red-500">Excluídos</p></div>
        </div>
        <p class="text-sm text-center \${pares >= 1 ? 'text-green-700' : 'text-red-600'} font-medium">
          \${pares >= 1 ? \`✓ \${pares} confronto(s) serão gerados\` : '✗ Jogadores insuficientes para sortear'}
        </p>
        \${excluidos.length > 0 ? \`
          <div class="mt-3 text-xs text-gray-500">
            <p class="font-medium mb-1">Excluídos por limite de jogos abertos:</p>
            \${excluidos.map(j => \`<span class="inline-block bg-red-50 text-red-600 px-2 py-0.5 rounded mr-1 mb-1">\${j.nome} (\${j.jogos_abertos} abertos)</span>\`).join('')}
          </div>
        \` : ''}
      \`
      document.getElementById('sorteio-preview').classList.remove('hidden')
    } catch(e) {}
  })
}

async function executarSorteio() {
  const classeId = document.getElementById('sorteio-classe').value
  if (!classeId) { toast('Selecione uma classe', 'warning'); return }
  
  const btn = document.getElementById('btn-sortear')
  btn.innerHTML = '<div class="spinner mx-auto" style="width:20px;height:20px;border-width:2px"></div>'
  btn.disabled = true

  try {
    const res = await api.post('/admin/clube/sorteios', { classe_id: classeId })
    const d = res.data.data
    
    toast(\`🎾 Rodada #\${d.rodada.numero} gerada com \${d.rodada.total_partidas} confrontos!\`, 'success', 5000)
    
    document.getElementById('sorteio-resultado').innerHTML = \`
      <div class="card bg-white rounded-xl p-5 fade-in">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><i class="fas fa-check text-green-600"></i></div>
          <div>
            <h3 class="font-bold text-gray-800">Rodada #\${d.rodada.numero} Gerada!</h3>
            <p class="text-sm text-gray-500">\${d.rodada.total_partidas} confrontos · \${d.jogadores_elegiveis} elegíveis · \${d.jogadores_excluidos} excluídos</p>
          </div>
        </div>
        <div class="space-y-2">
          \${d.partidas.map((p, i) => \`
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-400 w-5 text-center font-mono">\${i+1}</span>
              <div class="flex-1 flex items-center justify-between">
                <span class="font-semibold text-gray-800 text-sm">\${p.jogador_a_nome}</span>
                <span class="text-xs text-gray-400 px-2">VS</span>
                <span class="font-semibold text-gray-800 text-sm">\${p.jogador_b_nome}</span>
              </div>
            </div>
          \`).join('')}
        </div>
        <div class="flex gap-3 mt-4">
          <button onclick="navigateTo('rodadas')" class="btn flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">Ver Rodadas</button>
          <button onclick="navigateTo('partidas')" class="btn flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Ver Partidas</button>
        </div>
      </div>
    \`
    document.getElementById('sorteio-resultado').classList.remove('hidden')
  } catch(e) {
    toast(e.response?.data?.error || 'Erro ao realizar sorteio', 'error', 5000)
  }
  
  btn.innerHTML = '<i class="fas fa-dice mr-2"></i>Realizar Sorteio'
  btn.disabled = false
}

// ============================================================
// RODADAS
// ============================================================
async function renderRodadas() {
  const res = await api.get('/admin/clube/rodadas')
  const rodadas = res.data.data || []
  
  setContent(\`
    <div class="space-y-4">
      <div class="card bg-white rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-bold text-gray-800">Rodadas Geradas</h3>
          <span class="badge badge-blue">\${rodadas.length} rodadas</span>
        </div>
        \${rodadas.length === 0 ? \`
          <p class="text-center text-gray-400 py-12"><i class="fas fa-calendar-alt text-3xl mb-3 block text-gray-300"></i>Nenhuma rodada gerada</p>
        \` : \`
          <div class="divide-y divide-gray-50">
            \${rodadas.map(r => \`
              <div class="p-4 hover:bg-gray-50 cursor-pointer" onclick="verRodada('\${r.id}')">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <span class="font-bold text-purple-700 text-sm">#\${r.numero}</span>
                    </div>
                    <div>
                      <p class="font-semibold text-gray-800">Rodada \${r.numero} — \${r.classe_nome}</p>
                      <p class="text-xs text-gray-400">
                        \${r.total_partidas} confrontos · Por: \${r.executado_por_nome} · \${fmtDate(r.data_execucao)}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    \${statusBadge(r.status)}
                    <i class="fas fa-chevron-right text-gray-300 text-sm"></i>
                  </div>
                </div>
              </div>
            \`).join('')}
          </div>
        \`}
      </div>
    </div>
  \`)
}

async function verRodada(id) {
  const res = await api.get('/admin/clube/rodadas/' + id)
  const { rodada, partidas } = res.data.data

  showModal(\`Rodada #\${rodada.numero} — \${rodada.classe_nome}\`, \`
    <div class="space-y-3">
      <div class="flex flex-wrap gap-2 mb-4">
        \${statusBadge(rodada.status)}
        <span class="badge badge-blue">\${rodada.total_partidas} partidas</span>
        <span class="badge badge-green">\${rodada.total_jogadores_elegiveis} elegíveis</span>
        \${rodada.total_jogadores_excluidos > 0 ? \`<span class="badge badge-red">\${rodada.total_jogadores_excluidos} excluídos</span>\` : ''}
      </div>
      <div class="space-y-2 max-h-80 overflow-y-auto">
        \${partidas.map((p, i) => \`
          <div class="p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-400">#\${i+1}</span>
              \${statusBadge(p.status)}
            </div>
            <div class="flex items-center justify-between mt-1">
              <span class="font-medium text-sm \${p.vencedor_id === p.jogador_a_id ? 'text-green-700' : 'text-gray-800'}">\${p.jogador_a_nome}</span>
              <span class="text-xs text-gray-400">\${p.placar_a && p.placar_b ? p.placar_a + ' × ' + p.placar_b : 'VS'}</span>
              <span class="font-medium text-sm \${p.vencedor_id === p.jogador_b_id ? 'text-green-700' : 'text-gray-800'}">\${p.jogador_b_nome}</span>
            </div>
            \${p.vencedor_nome ? \`<p class="text-xs text-green-600 text-center mt-1">🏆 \${p.vencedor_nome}</p>\` : ''}
          </div>
        \`).join('')}
      </div>
    </div>
  \`, null, null)
}

// ============================================================
// PARTIDAS
// ============================================================
async function renderPartidas() {
  const [pRes, clRes] = await Promise.all([
    api.get('/admin/clube/partidas?limit=100'),
    api.get('/admin/clube/classes?status=ATIVA')
  ])
  const partidas = pRes.data.data || []
  const classes = clRes.data.data || []

  const pendentes = partidas.filter(p => p.status === 'PENDENTE').length
  const emAndamento = partidas.filter(p => p.status === 'EM_ANDAMENTO').length

  setContent(\`
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <select id="filtro-status-partida" class="\${selectClass()} w-44" onchange="filtrarPartidas()">
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente (\${pendentes})</option>
          <option value="EM_ANDAMENTO">Em Andamento (\${emAndamento})</option>
          <option value="FINALIZADA">Finalizada</option>
          <option value="WO">W.O.</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        <select id="filtro-classe-partida" class="\${selectClass()} w-40" onchange="filtrarPartidas()">
          <option value="">Todas as classes</option>
          \${classes.map(cl => \`<option value="\${cl.id}">\${cl.nome}</option>\`).join('')}
        </select>
      </div>
      
      <div class="card bg-white rounded-xl overflow-hidden">
        <table class="w-full text-sm" id="tabela-partidas">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">Confronto</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Classe / Rodada</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Data Limite</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold">Status</th>
              <th class="text-center px-4 py-3 text-gray-600 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            \${partidas.length === 0 ? \`
              <tr><td colspan="5" class="text-center py-12 text-gray-400"><i class="fas fa-table-tennis text-3xl mb-3 block text-gray-300"></i>Nenhuma partida encontrada</td></tr>
            \` : partidas.map(p => \`
              <tr class="table-row border-b border-gray-50" data-status="\${p.status}" data-classe="\${p.classe_id}">
                <td class="px-4 py-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-gray-800 \${p.vencedor_id === p.jogador_a_id ? 'text-green-700' : ''}">\${p.jogador_a_nome}</span>
                      <span class="text-gray-400 text-xs">×</span>
                      <span class="font-semibold text-gray-800 \${p.vencedor_id === p.jogador_b_id ? 'text-green-700' : ''}">\${p.jogador_b_nome}</span>
                    </div>
                    \${p.placar_a && p.placar_b ? \`<p class="text-xs text-gray-400 mt-0.5">Placar: \${p.placar_a} × \${p.placar_b}</p>\` : ''}
                    \${p.vencedor_nome ? \`<p class="text-xs text-green-600 mt-0.5">🏆 \${p.vencedor_nome}</p>\` : ''}
                  </div>
                </td>
                <td class="px-4 py-3 text-center hidden sm:table-cell text-sm text-gray-600">
                  <span class="badge badge-blue">\${p.classe_nome}</span>
                  \${p.rodada_numero ? \`<p class="text-xs text-gray-400 mt-0.5">Rodada #\${p.rodada_numero}</p>\` : ''}
                </td>
                <td class="px-4 py-3 text-center hidden md:table-cell text-xs text-gray-500">\${fmtDateOnly(p.data_limite)}</td>
                <td class="px-4 py-3 text-center">\${statusBadge(p.status)}</td>
                <td class="px-4 py-3 text-center">
                  \${['PENDENTE', 'EM_ANDAMENTO'].includes(p.status) ? \`
                    <button onclick="modalAtualizarPartida('\${p.id}', \${JSON.stringify(p).replace(/'/g, '&apos;')})" class="btn p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Atualizar resultado">
                      <i class="fas fa-edit"></i>
                    </button>
                  \` : '<span class="text-gray-300 text-xs">-</span>'}
                </td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  \`)
}

function filtrarPartidas() {
  const status = document.getElementById('filtro-status-partida')?.value
  const classe = document.getElementById('filtro-classe-partida')?.value
  document.querySelectorAll('#tabela-partidas tbody tr[data-status]').forEach(row => {
    const statusMatch = !status || row.dataset.status === status
    const classeMatch = !classe || row.dataset.classe === classe
    row.style.display = statusMatch && classeMatch ? '' : 'none'
  })
}

function modalAtualizarPartida(id, p) {
  showModal(\`Atualizar Partida\`, \`
    <div class="mb-4 p-3 bg-gray-50 rounded-lg text-center">
      <p class="font-semibold text-gray-800">\${p.jogador_a_nome} vs \${p.jogador_b_nome}</p>
      <p class="text-xs text-gray-400 mt-0.5">Classe: \${p.classe_nome}</p>
    </div>
    \${formGroup('Status', \`
      <select id="f-status" class="\${selectClass()}">
        <option value="PENDENTE" \${p.status==='PENDENTE'?'selected':''}>Pendente</option>
        <option value="EM_ANDAMENTO" \${p.status==='EM_ANDAMENTO'?'selected':''}>Em Andamento</option>
        <option value="FINALIZADA">Finalizada</option>
        <option value="WO">W.O.</option>
        <option value="CANCELADA">Cancelada</option>
      </select>
    \`)}
    \${formGroup('Vencedor', \`
      <select id="f-vencedor" class="\${selectClass()}">
        <option value="">-- Selecione se houver vencedor --</option>
        <option value="\${p.jogador_a_id}">\${p.jogador_a_nome}</option>
        <option value="\${p.jogador_b_id}">\${p.jogador_b_nome}</option>
      </select>
    \`)}
    <div class="grid grid-cols-2 gap-3">
      \${formGroup('Placar A', \`<input type="text" id="f-placar-a" class="\${inputClass()}" value="\${p.placar_a || ''}" placeholder="6-3, 7-5">\`)}
      \${formGroup('Placar B', \`<input type="text" id="f-placar-b" class="\${inputClass()}" value="\${p.placar_b || ''}" placeholder="3-6, 5-7">\`)}
    </div>
    \${formGroup('Observações', \`<textarea id="f-obs" class="\${inputClass()}" rows="2" placeholder="Observações opcionais...">\${p.observacoes || ''}</textarea>\`)}
  \`, async () => {
    try {
      await api.patch('/admin/clube/partidas/' + id, {
        status: document.getElementById('f-status').value,
        vencedor_id: document.getElementById('f-vencedor').value || null,
        placar_a: document.getElementById('f-placar-a').value,
        placar_b: document.getElementById('f-placar-b').value,
        observacoes: document.getElementById('f-obs').value
      })
      closeModal(); toast('Partida atualizada!'); renderPartidas()
    } catch(e) { toast(e.response?.data?.error || 'Erro ao atualizar partida', 'error') }
  }, 'Salvar Resultado')
}

// ============================================================
// RANKING ADMIN
// ============================================================
async function renderRankingAdmin() {
  const clRes = await api.get('/admin/clube/classes?status=ATIVA')
  const classes = clRes.data.data || []
  
  let classeId = classes[0]?.id || ''
  
  const renderRankingLista = async (cId) => {
    if (!cId) return
    const res = await api.get('/admin/clube/ranking?classe_id=' + cId)
    const jogadores = res.data.data || []
    
    document.getElementById('ranking-lista').innerHTML = \`
      <div class="space-y-2">
        \${jogadores.length === 0 ? '<p class="text-center text-gray-400 py-8">Nenhum jogador nesta classe</p>' : jogadores.map((j, i) => \`
          <div class="flex items-center gap-3 p-3 \${i === 0 ? 'bg-yellow-50 border border-yellow-200' : i === 1 ? 'bg-gray-50 border border-gray-200' : i === 2 ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-gray-100'} rounded-xl">
            <div class="w-10 h-10 flex items-center justify-center font-bold \${i === 0 ? 'text-yellow-500 text-xl' : i === 1 ? 'text-gray-400 text-xl' : i === 2 ? 'text-orange-600 text-xl' : 'text-gray-400'}">
              \${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i+1)}
            </div>
            <div class="flex-1">
              <p class="font-bold text-gray-800">\${j.nome}</p>
              <p class="text-xs text-gray-500">\${j.total_jogos || 0} jogos · \${j.vitorias || 0} vitórias · \${j.derrotas || 0} derrotas</p>
            </div>
            <div class="text-right">
              <p class="text-xl font-bold \${i < 3 ? 'text-green-700' : 'text-gray-700'}">\${j.pontos_total || 0}</p>
              <p class="text-xs text-gray-400">pts</p>
            </div>
            \${j.jogos_abertos > 0 ? \`<div class="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center" title="\${j.jogos_abertos} jogos abertos"><span class="text-xs font-bold text-orange-600">\${j.jogos_abertos}</span></div>\` : ''}
          </div>
        \`).join('')}
      </div>
    \`
  }

  setContent(\`
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <select id="ranking-classe-select" class="\${selectClass()} w-52" onchange="document.getElementById('ranking-titulo').textContent = this.options[this.selectedIndex].text">
          \${classes.map(cl => \`<option value="\${cl.id}">\${cl.nome}</option>\`).join('')}
        </select>
        <button onclick="atualizarRankingView()" class="btn bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
          <i class="fas fa-sync mr-1"></i> Atualizar
        </button>
      </div>
      
      <div class="card bg-white rounded-xl p-5">
        <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i class="fas fa-trophy text-yellow-500"></i>
          Ranking — <span id="ranking-titulo">\${classes[0]?.nome || ''}</span>
        </h3>
        <div id="ranking-lista">
          <div class="flex justify-center py-8"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  \`)

  window.atualizarRankingView = async () => {
    const cId = document.getElementById('ranking-classe-select')?.value
    await renderRankingLista(cId)
  }

  await renderRankingLista(classeId)
  
  document.getElementById('ranking-classe-select').addEventListener('change', async (e) => {
    await renderRankingLista(e.target.value)
  })
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================
async function renderConfiguracoes() {
  const res = await api.get('/admin/clube/configuracoes')
  const c = res.data.data || {}

  setContent(\`
    <div class="max-w-3xl mx-auto space-y-5">
      
      <!-- SORTEIOS -->
      <div class="card bg-white rounded-xl p-6">
        <h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-random text-purple-500"></i>Sorteios</h3>
        <div class="grid sm:grid-cols-2 gap-4">
          \${formGroup('Periodicidade de Sorteio (dias)', \`<input type="number" id="f-period" class="\${inputClass()}" value="\${c.periodicidade_sorteio || 7}" min="1">\`)}
          \${formGroup('Limite de Jogos em Aberto por Jogador', \`<input type="number" id="f-limite" class="\${inputClass()}" value="\${c.limite_jogos_aberto_por_jogador || 3}" min="1">\`)}
          \${formGroup('Dias para W.O. Automático', \`<input type="number" id="f-wo-dias" class="\${inputClass()}" value="\${c.dias_para_wo || 14}" min="1">\`)}
          \${formGroup('Limite de Quadras para Ranking', \`<input type="number" id="f-quadras" class="\${inputClass()}" value="\${c.limite_quadras || 4}" min="1" title="Impede marcação se jogos abertos > quadras disponíveis">\`)}
        </div>
      </div>

      <!-- FORMATO DE JOGO -->
      <div class="card bg-white rounded-xl p-6">
        <h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-table-tennis text-blue-500"></i>Formato de Jogo</h3>
        <div class="grid sm:grid-cols-2 gap-4">
          \${formGroup('Formato de Set', \`
            <select id="f-formato-set" class="\${selectClass()}">
              <option value="3SETS" \${c.formato_set === '3SETS' ? 'selected' : ''}>3 Sets (3º Tie-Break)</option>
              <option value="SET_PRO" \${c.formato_set === 'SET_PRO' ? 'selected' : ''}>Set Pro com Vantagem</option>
            </select>
          \`)}
          \${formGroup('Módulo de Desafios', \`
            <select id="f-desafio" class="\${selectClass()}">
              <option value="0" \${!c.desafio_ativo ? 'selected' : ''}>Desativado</option>
              <option value="1" \${c.desafio_ativo ? 'selected' : ''}>Ativado</option>
            </select>
          \`)}
        </div>
      </div>

      <!-- PONTUAÇÃO -->
      <div class="card bg-white rounded-xl p-6">
        <h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-star text-yellow-500"></i>Pontuação</h3>
        <div class="grid grid-cols-3 gap-4">
          \${formGroup('Pontos por Vitória', \`<input type="number" id="f-pts-v" class="\${inputClass()}" value="\${c.pontos_vitoria || 3}" min="0">\`)}
          \${formGroup('Pontos por Derrota', \`<input type="number" id="f-pts-d" class="\${inputClass()}" value="\${c.pontos_derrota || 1}" min="0">\`)}
          \${formGroup('Pontos por W.O. (ganho)', \`<input type="number" id="f-pts-wo" class="\${inputClass()}" value="\${c.pontos_wo || 0}" min="0">\`)}
        </div>
      </div>

      <!-- PAGAMENTOS & INADIMPLÊNCIA -->
      <div class="card bg-white rounded-xl p-6">
        <h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-money-bill-wave text-green-500"></i>Pagamentos & Inadimplência</h3>
        <div class="grid sm:grid-cols-2 gap-4">
          \${formGroup('Valor da Mensalidade (R$)', \`<input type="number" id="f-mensalidade" class="\${inputClass()}" value="\${c.valor_mensalidade || 0}" step="0.01" min="0">\`)}
          \${formGroup('Chave PIX', \`<input type="text" id="f-pix-chave" class="\${inputClass()}" value="\${c.pix_chave || ''}" placeholder="CPF, email, telefone ou chave aleatória">\`)}
          \${formGroup('Titular PIX', \`<input type="text" id="f-pix-titular" class="\${inputClass()}" value="\${c.pix_titular || ''}" placeholder="Nome do titular">\`)}
          \${formGroup('Dias para Bloqueio Ranking (inadimplência)', \`<input type="number" id="f-inad-bloq" class="\${inputClass()}" value="\${c.dias_inadimplencia_bloqueio || 10}" min="1">\`)}
          \${formGroup('Dias para Inativação da Conta (inadimplência)', \`<input type="number" id="f-inad-inat" class="\${inputClass()}" value="\${c.dias_inadimplencia_inativacao || 20}" min="1">\`)}
        </div>
      </div>

      <!-- NOTIFICAÇÕES & REDES SOCIAIS -->
      <div class="card bg-white rounded-xl p-6">
        <h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-bell text-orange-500"></i>Notificações & Redes Sociais</h3>
        <div class="grid sm:grid-cols-2 gap-4">
          \${formGroup('Notificações WhatsApp', \`
            <select id="f-whatsapp" class="\${selectClass()}">
              <option value="0" \${!c.whatsapp_notificacoes ? 'selected' : ''}>Desativado</option>
              <option value="1" \${c.whatsapp_notificacoes ? 'selected' : ''}>Ativado</option>
            </select>
          \`)}
          \${formGroup('Notificações por Email', \`
            <select id="f-email-notif" class="\${selectClass()}">
              <option value="0" \${!c.email_notificacoes ? 'selected' : ''}>Desativado</option>
              <option value="1" \${c.email_notificacoes ? 'selected' : ''}>Ativado</option>
            </select>
          \`)}
          \${formGroup('Instagram URL do Clube', \`<input type="url" id="f-instagram" class="\${inputClass()}" value="\${c.instagram_url || ''}" placeholder="https://instagram.com/seucube">\`)}
          \${formGroup('Facebook URL do Clube', \`<input type="url" id="f-facebook" class="\${inputClass()}" value="\${c.facebook_url || ''}" placeholder="https://facebook.com/seucube">\`)}
        </div>
      </div>

      <button onclick="salvarConfiguracoes()" class="btn w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
        <i class="fas fa-save"></i> Salvar Todas as Configurações
      </button>
    </div>
  \`)
}

async function salvarConfiguracoes() {
  try {
    await api.put('/admin/clube/configuracoes', {
      periodicidade_sorteio: parseInt(document.getElementById('f-period').value),
      limite_jogos_aberto_por_jogador: parseInt(document.getElementById('f-limite').value),
      dias_para_wo: parseInt(document.getElementById('f-wo-dias').value),
      limite_quadras: parseInt(document.getElementById('f-quadras').value),
      formato_set: document.getElementById('f-formato-set').value,
      desafio_ativo: parseInt(document.getElementById('f-desafio').value),
      pontos_vitoria: parseInt(document.getElementById('f-pts-v').value),
      pontos_derrota: parseInt(document.getElementById('f-pts-d').value),
      pontos_wo: parseInt(document.getElementById('f-pts-wo').value),
      valor_mensalidade: parseFloat(document.getElementById('f-mensalidade').value) || 0,
      pix_chave: document.getElementById('f-pix-chave').value || null,
      pix_titular: document.getElementById('f-pix-titular').value || null,
      dias_inadimplencia_bloqueio: parseInt(document.getElementById('f-inad-bloq').value),
      dias_inadimplencia_inativacao: parseInt(document.getElementById('f-inad-inat').value),
      whatsapp_notificacoes: parseInt(document.getElementById('f-whatsapp').value),
      email_notificacoes: parseInt(document.getElementById('f-email-notif').value),
      instagram_url: document.getElementById('f-instagram').value || null,
      facebook_url: document.getElementById('f-facebook').value || null
    })
    toast('Configurações salvas com sucesso!')
  } catch(e) { toast(e.response?.data?.error || 'Erro ao salvar', 'error') }
}

// ============================================================
// ÁREA DO JOGADOR - DASHBOARD
// ============================================================
async function renderDashboardJogador() {
  try {
    const res = await api.get('/jogador/dashboard')
    const d = res.data.data
    const jogador = d.jogador
    const ins = d.insights || {}

    if (!jogador) {
      setContent(\`
        <div class="card bg-white rounded-xl p-12 text-center">
          <i class="fas fa-user-slash text-4xl text-gray-300 mb-4"></i>
          <p class="font-medium text-gray-600">Perfil de jogador não encontrado</p>
          <p class="text-sm text-gray-400 mt-1">Peça ao administrador do clube para vincular seu perfil</p>
        </div>
      \`)
      return
    }

    const aprovClass = ins.aproveitamento >= 60 ? 'green' : ins.aproveitamento >= 40 ? 'yellow' : 'red'

    setContent(\`
      <div class="space-y-5">
        <!-- Alerta inadimplência -->
        \${d.pagamento_pendente ? \`
          <div class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <i class="fas fa-exclamation-triangle text-red-500 mt-0.5"></i>
            <div>
              <p class="font-semibold text-red-700">Atenção: Pagamento em Atraso</p>
              <p class="text-sm text-red-600">Referência: \${d.pagamento_pendente.referencia} · 
                Valor: R$ \${(d.pagamento_pendente.valor||0).toFixed(2)} · 
                \${d.pagamento_pendente.dias_atraso > 0 ? \`\${d.pagamento_pendente.dias_atraso} dias de atraso\` : 'Vencimento próximo'}
              </p>
            </div>
          </div>
        \` : ''}

        \${d.desafios_pendentes > 0 ? \`
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i class="fas fa-fist-raised text-blue-500"></i>
              <p class="font-semibold text-blue-700">Você tem \${d.desafios_pendentes} desafio(s) pendente(s)</p>
            </div>
            <button onclick="navigateTo('desafios')" class="btn bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Ver Desafios</button>
          </div>
        \` : ''}

        <!-- Perfil e ranking -->
        <div class="grid md:grid-cols-3 gap-4">
          <div class="card bg-white rounded-xl p-5 flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-2xl shrink-0">
              \${jogador.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <p class="font-bold text-gray-800 text-lg">\${jogador.nome}</p>
              <p class="text-sm text-gray-500">\${jogador.classe_nome || ''}</p>
              <p class="text-xs text-gray-400">\${jogador.clube_nome || ''}</p>
            </div>
          </div>
          
          <div class="card bg-white rounded-xl p-5 text-center">
            <p class="text-gray-500 text-sm font-medium">Posição no Ranking</p>
            <p class="text-4xl font-bold text-green-700 mt-1">#\${d.posicao_ranking || '-'}</p>
            <p class="text-xs text-gray-400 mt-1">de \${d.total_jogadores_classe || 0} na classe</p>
          </div>
          
          <div class="card bg-white rounded-xl p-5 text-center">
            <p class="text-gray-500 text-sm font-medium">Pontuação Total</p>
            <p class="text-4xl font-bold text-blue-700 mt-1">\${jogador.pontos_total || 0}</p>
            <p class="text-xs text-gray-400 mt-1">pontos</p>
          </div>
        </div>

        <!-- Insights -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          \${statCard('trophy', 'Vitórias', ins.vitorias || 0, 'green')}
          \${statCard('times-circle', 'Derrotas', ins.derrotas || 0, 'red')}
          \${statCard('percentage', 'Aproveitamento', (ins.aproveitamento || 0) + '%', aprovClass)}
          \${statCard('hourglass-half', 'Jogos Abertos', ins.jogos_abertos || 0, 'yellow')}
        </div>

        <div class="grid lg:grid-cols-2 gap-5">
          <!-- Próximos Jogos -->
          <div class="card bg-white rounded-xl p-5">
            <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fas fa-calendar-alt text-blue-500"></i>Próximos Jogos
            </h3>
            \${d.proximos_jogos.length === 0 ? '<p class="text-gray-400 text-sm text-center py-4">Nenhum jogo em aberto</p>' : \`
              <div class="space-y-3">
                \${d.proximos_jogos.map(p => \`
                  <div class="p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center justify-between mb-1">
                      <span class="badge badge-blue">Rodada #\${p.rodada_numero || '?'}</span>
                      \${statusBadge(p.status)}
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="font-semibold text-sm \${p.jogador_a_id === jogador.id ? 'text-green-700' : 'text-gray-800'}">\${p.jogador_a_nome}</span>
                      <span class="text-gray-400 text-xs font-bold">VS</span>
                      <span class="font-semibold text-sm \${p.jogador_b_id === jogador.id ? 'text-green-700' : 'text-gray-800'}">\${p.jogador_b_nome}</span>
                    </div>
                    \${p.data_limite ? \`<p class="text-xs text-gray-400 mt-1"><i class="fas fa-clock mr-1"></i>Prazo: \${fmtDateOnly(p.data_limite)}</p>\` : ''}
                    \${p.quadra ? \`<p class="text-xs text-gray-400"><i class="fas fa-map-marker-alt mr-1"></i>\${p.quadra} \${p.horario || ''}</p>\` : ''}
                  </div>
                \`).join('')}
              </div>
            \`}
            <button onclick="navigateTo('minhas-partidas')" class="btn mt-4 w-full text-center text-green-600 hover:text-green-700 text-sm font-medium">Ver todas as partidas →</button>
          </div>

          <!-- Últimos Resultados -->
          <div class="card bg-white rounded-xl p-5">
            <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fas fa-history text-purple-500"></i>Últimos Resultados
            </h3>
            \${d.ultimos_resultados.length === 0 ? '<p class="text-gray-400 text-sm text-center py-4">Nenhum resultado ainda</p>' : \`
              <div class="space-y-3">
                \${d.ultimos_resultados.map(p => {
                  const venceu = p.vencedor_id === jogador.id
                  const adversario = p.jogador_a_id === jogador.id ? p.jogador_b_nome : p.jogador_a_nome
                  return \`
                    <div class="p-3 \${venceu ? 'bg-green-50 border border-green-100' : 'bg-gray-50'} rounded-lg">
                      <div class="flex items-center justify-between">
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="text-lg">\${venceu ? '🏆' : '😔'}</span>
                            <p class="font-semibold text-sm text-gray-800">vs \${adversario}</p>
                          </div>
                          \${p.placar_a && p.placar_b ? \`<p class="text-xs text-gray-500 mt-0.5">Placar: \${p.placar_a} × \${p.placar_b}</p>\` : ''}
                          <p class="text-xs text-gray-400">\${p.classe_nome} · \${fmtDateOnly(p.updated_at)}</p>
                        </div>
                        <span class="\${venceu ? 'badge badge-green' : 'badge badge-red'}">\${venceu ? 'Vitória' : 'Derrota'}</span>
                      </div>
                    </div>
                  \`
                }).join('')}
              </div>
            \`}
            <button onclick="navigateTo('ranking')" class="btn mt-4 w-full text-center text-green-600 hover:text-green-700 text-sm font-medium">Ver ranking completo →</button>
          </div>
        </div>
      </div>
    \`)
  } catch(e) {
    console.error(e)
    setContent('<div class="text-center text-red-400 mt-20"><i class="fas fa-exclamation-circle text-4xl mb-4"></i><p>Erro ao carregar dashboard</p></div>')
  }
}

// ============================================================
// DESAFIOS (JOGADOR)
// ============================================================
async function renderDesafiosJogador() {
  const [desafiosRes, adversariosRes] = await Promise.all([
    api.get('/jogador/desafios').catch(() => ({ data: { data: [] } })),
    api.get('/jogador/adversarios').catch(() => ({ data: { data: [] } }))
  ])
  const desafios = desafiosRes.data.data || []
  const adversarios = adversariosRes.data.data || []
  
  const pendentesRecebidos = desafios.filter(d => d.status === 'PENDENTE' && d.desafiado_id !== State.user.sub)
  const meusPendentes = desafios.filter(d => d.status === 'PENDENTE' && d.desafiante_id !== State.user.sub)
  const historico = desafios.filter(d => !['PENDENTE'].includes(d.status))

  setContent(\`
    <div class="space-y-5 max-w-3xl mx-auto">
      <!-- Desafiar adversário -->
      \${adversarios.length > 0 ? \`
        <div class="card bg-white rounded-xl p-5">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-fist-raised text-red-500"></i>Enviar Desafio</h3>
          <div class="grid sm:grid-cols-2 gap-3">
            \${adversarios.map(j => \`
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-800 text-sm">\${j.nome}</p>
                  <p class="text-xs text-gray-400">#\${j.ranking_posicao || '?'} · \${j.pontos_total || 0} pts</p>
                </div>
                <button onclick="enviarDesafio('\${j.id}', '\${j.nome}')" class="btn bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                  <i class="fas fa-fist-raised mr-1"></i>Desafiar
                </button>
              </div>
            \`).join('')}
          </div>
        </div>
      \` : ''}

      <!-- Desafios recebidos pendentes -->
      \${desafios.filter(d => d.status === 'PENDENTE').length > 0 ? \`
        <div class="card bg-white rounded-xl p-5">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-inbox text-blue-500"></i>Desafios Pendentes</h3>
          <div class="space-y-3">
            \${desafios.filter(d => d.status === 'PENDENTE').map(d => \`
              <div class="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-semibold text-gray-800">
                      \${d.desafiante_nome} desafia \${d.desafiado_nome}
                    </p>
                    <p class="text-xs text-gray-500">\${d.classe_nome} · \${fmtDate(d.data_proposta)}</p>
                    \${d.mensagem ? \`<p class="text-sm text-gray-600 mt-1 italic">"\${d.mensagem}"</p>\` : ''}
                  </div>
                  \${statusBadge(d.status)}
                </div>
                <div class="flex gap-2 mt-3">
                  <button onclick="responderDesafio('\${d.id}', 'ACEITO')" class="btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex-1">
                    <i class="fas fa-check mr-1"></i>Aceitar
                  </button>
                  <button onclick="responderDesafio('\${d.id}', 'RECUSADO')" class="btn bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex-1">
                    <i class="fas fa-times mr-1"></i>Recusar
                  </button>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>
      \` : ''}

      <!-- Histórico -->
      \${historico.length > 0 ? \`
        <div class="card bg-white rounded-xl p-5">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-history text-gray-500"></i>Histórico de Desafios</h3>
          <div class="space-y-2">
            \${historico.map(d => \`
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-sm text-gray-800">\${d.desafiante_nome} vs \${d.desafiado_nome}</p>
                  <p class="text-xs text-gray-400">\${d.classe_nome} · \${fmtDate(d.data_proposta)}</p>
                </div>
                \${statusBadge(d.status)}
              </div>
            \`).join('')}
          </div>
        </div>
      \` : ''}

      \${adversarios.length === 0 && desafios.length === 0 ? \`
        <div class="card bg-white rounded-xl p-12 text-center text-gray-400">
          <i class="fas fa-fist-raised text-4xl mb-4 text-gray-300"></i>
          <p class="font-medium">Módulo de Desafios</p>
          <p class="text-sm mt-1">Nenhum adversário disponível ou módulo não está ativo</p>
        </div>
      \` : ''}
    </div>
  \`)

  window.enviarDesafio = (adversario_id, adversario_nome) => {
    showModal(\`Desafiar \${adversario_nome}\`, \`
      \${formGroup('Mensagem (opcional)', \`<textarea id="f-dsf-msg" class="\${inputClass()}" rows="2" placeholder="Uma mensagem motivacional..."></textarea>\`)}
      <p class="text-sm text-gray-500"><i class="fas fa-info-circle mr-1"></i>O desafio expira em 7 dias se não for aceito.</p>
    \`, async () => {
      try {
        await api.post('/jogador/desafios', {
          desafiado_id: adversario_id,
          mensagem: document.getElementById('f-dsf-msg').value || null
        })
        closeModal()
        toast('Desafio enviado para ' + adversario_nome + '!')
        renderDesafiosJogador()
      } catch(e) { toast(e.response?.data?.error || 'Erro ao enviar desafio', 'error') }
    }, 'Enviar Desafio')
  }

  window.responderDesafio = async (id, resposta) => {
    try {
      await api.patch('/jogador/desafios/' + id, { resposta })
      toast(resposta === 'ACEITO' ? 'Desafio aceito!' : 'Desafio recusado', resposta === 'ACEITO' ? 'success' : 'info')
      renderDesafiosJogador()
    } catch(e) { toast(e.response?.data?.error || 'Erro', 'error') }
  }
}

// ============================================================
// ÁREA DO JOGADOR
// ============================================================
async function renderRankingJogador() {
  const [rankRes, classesRes] = await Promise.all([
    api.get('/jogador/ranking'),
    api.get('/jogador/classes').catch(() => ({ data: { data: [] } }))
  ])
  let jogadores = rankRes.data.data || []
  const classes = classesRes.data.data || []
  const meuId = State.user.sub

  const renderLista = (jogs) => \`
    <div class="space-y-2">
      \${jogs.length === 0 ? '<p class="text-center text-gray-400 py-8">Sem jogadores no ranking</p>' : jogs.map((j, i) => \`
        <div class="flex items-center gap-3 p-3 \${i === 0 ? 'bg-yellow-50 border border-yellow-100' : i === 1 ? 'bg-gray-50 border border-gray-100' : i === 2 ? 'bg-orange-50 border border-orange-100' : 'bg-white border border-gray-50'} rounded-xl">
          <div class="w-10 text-center">
            <span class="font-bold text-lg \${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-600' : 'text-gray-500'}">
              \${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#'+(i+1)}
            </span>
          </div>
          <div class="flex-1">
            <p class="font-bold text-gray-800 \${j.id === meuId ? 'text-green-700' : ''}">\${j.nome} \${j.id === meuId ? '<span class="badge badge-green text-xs">Você</span>' : ''}</p>
            <p class="text-xs text-gray-500">\${j.classe_nome} · \${j.vitorias || 0}V · \${j.jogos_realizados || 0} jogos</p>
          </div>
          <div class="text-right">
            <p class="font-bold text-green-700 text-xl">\${j.pontos_total || 0}</p>
            <p class="text-xs text-gray-400">pts</p>
          </div>
          \${j.jogos_abertos > 0 ? \`<div class="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center" title="\${j.jogos_abertos} abertos"><span class="text-xs font-bold text-orange-600">\${j.jogos_abertos}</span></div>\` : ''}
        </div>
      \`).join('')}
    </div>
  \`

  setContent(\`
    <div class="space-y-4">
      \${classes.length > 1 ? \`
        <div class="flex items-center gap-3">
          <select id="ranking-classe-jogador" class="\${selectClass()} w-52" onchange="filtrarRankingJogador(this.value)">
            <option value="">Todas as classes</option>
            \${classes.map(cl => \`<option value="\${cl.id}">\${cl.nome}</option>\`).join('')}
          </select>
        </div>
      \` : ''}
      <div class="card bg-white rounded-xl p-5">
        <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-trophy text-yellow-500"></i>Ranking do Clube</h3>
        <div id="ranking-lista-jogador">
          \${renderLista(jogadores)}
        </div>
      </div>
    </div>
  \`)

  window.filtrarRankingJogador = async (classeId) => {
    const url = classeId ? \`/jogador/ranking?classe_id=\${classeId}\` : '/jogador/ranking'
    const res = await api.get(url)
    const jogs = res.data.data || []
    document.getElementById('ranking-lista-jogador').innerHTML = renderLista(jogs)
  }
}

async function renderMinhasPartidas() {
  const res = await api.get('/jogador/partidas')
  const partidas = res.data.data || []
  setContent(\`
    <div class="space-y-4">
      <div class="card bg-white rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-100">
          <h3 class="font-bold text-gray-800">Minhas Partidas</h3>
        </div>
        \${partidas.length === 0 ? '<p class="text-center text-gray-400 py-12">Nenhuma partida encontrada</p>' : \`
          <div class="divide-y divide-gray-50">
            \${partidas.map(p => \`
              <div class="p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-semibold text-gray-800">\${p.jogador_a_nome} vs \${p.jogador_b_nome}</p>
                    <p class="text-xs text-gray-400">\${p.classe_nome} · Rodada #\${p.rodada_numero || '?'} · \${fmtDate(p.created_at)}</p>
                    \${p.placar_a && p.placar_b ? \`<p class="text-sm font-medium text-gray-600 mt-1">Placar: \${p.placar_a} × \${p.placar_b}</p>\` : ''}
                    \${p.vencedor_nome ? \`<p class="text-sm text-green-600 mt-0.5">🏆 Vencedor: \${p.vencedor_nome}</p>\` : ''}
                  </div>
                  \${statusBadge(p.status)}
                </div>
              </div>
            \`).join('')}
          </div>
        \`}
      </div>
    </div>
  \`)
}

async function renderPerfil() {
  const res = await api.get('/jogador/perfil')
  const { usuario, jogador } = res.data.data

  setContent(\`
    <div class="max-w-xl mx-auto space-y-4">
      <div class="card bg-white rounded-xl p-6">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-2xl">
            \${usuario.nome.charAt(0)}
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-800">\${usuario.nome}</h2>
            <p class="text-gray-500">\${usuario.email}</p>
            <span class="badge badge-green mt-1">\${perfilLabel(usuario.perfil)}</span>
          </div>
        </div>
        
        \${jogador ? \`
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="p-3 bg-green-50 rounded-lg">
              <p class="text-2xl font-bold text-green-700">\${jogador.pontos_total || 0}</p>
              <p class="text-xs text-gray-500">Pontos</p>
            </div>
            <div class="p-3 bg-blue-50 rounded-lg">
              <p class="text-2xl font-bold text-blue-700">#\${jogador.ranking_posicao || '-'}</p>
              <p class="text-xs text-gray-500">Ranking</p>
            </div>
            <div class="p-3 bg-orange-50 rounded-lg">
              <p class="text-2xl font-bold text-orange-600">\${jogador.jogos_abertos || 0}</p>
              <p class="text-xs text-gray-500">Abertos</p>
            </div>
          </div>
          <p class="text-sm text-gray-500 text-center mt-3">Classe: <strong>\${jogador.classe_nome}</strong></p>
        \` : '<p class="text-gray-400 text-center py-4">Perfil de jogador não encontrado</p>'}
      </div>
    </div>
  \`)
}

// ============================================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================================
if (State.token && State.user) {
  initApp()
}
</script>

</body>
</html>`
}

export default app
