// ============================================================
// HTML FRONTEND - TênisRank (SPA completo)
// ============================================================

export function getHTML(): string {
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
    :root { --primary:#16a34a;--primary-dark:#15803d;--secondary:#0ea5e9;--accent:#f59e0b;--danger:#dc2626; }
    body { font-family:'Segoe UI',system-ui,sans-serif;background:#f8fafc; }
    .sidebar { transition:all 0.3s ease; }
    .nav-item { transition:all 0.2s ease; }
    .nav-item:hover { background:rgba(255,255,255,0.15); }
    .nav-item.active { background:rgba(255,255,255,0.25);border-left:3px solid white; }
    .card { box-shadow:0 1px 3px rgba(0,0,0,0.1);transition:box-shadow 0.2s; }
    .card:hover { box-shadow:0 4px 12px rgba(0,0,0,0.15); }
    .btn { transition:all 0.15s ease;cursor:pointer; }
    .btn:disabled { opacity:0.6;cursor:not-allowed; }
    .fade-in { animation:fadeIn 0.3s ease; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
    .spinner { border:3px solid #f3f3f3;border-top:3px solid var(--primary);border-radius:50%;width:24px;height:24px;animation:spin 0.8s linear infinite; }
    @keyframes spin { 0%{transform:rotate(0deg)}100%{transform:rotate(360deg)} }
    .badge { display:inline-flex;align-items:center;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600; }
    .badge-green{background:#dcfce7;color:#166534}.badge-red{background:#fee2e2;color:#991b1b}
    .badge-yellow{background:#fef9c3;color:#713f12}.badge-blue{background:#dbeafe;color:#1e40af}
    .badge-gray{background:#f1f5f9;color:#475569}.badge-orange{background:#ffedd5;color:#c2410c}
    .badge-purple{background:#f3e8ff;color:#7e22ce}
    .table-row:hover{background:#f8fafc}
    .modal-bg{background:rgba(0,0,0,0.5);backdrop-filter:blur(2px)}
    input,select,textarea{outline:none;transition:border-color 0.2s,box-shadow 0.2s}
    input:focus,select:focus,textarea:focus{border-color:#16a34a!important;box-shadow:0 0 0 3px rgba(22,163,74,0.1)}
    .toast{animation:slideIn 0.3s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#f1f1f1}::-webkit-scrollbar-thumb{background:#c1c1c1;border-radius:3px}
    @media(max-width:768px){.sidebar{transform:translateX(-100%);position:fixed;z-index:50;height:100vh}.sidebar.open{transform:translateX(0)}}
    .tab-btn.active{border-bottom:2px solid #16a34a;color:#16a34a;font-weight:600}
    .inadimplente-row{background:#fff5f5!important}
    .chart-container{position:relative;height:220px}
  </style>
</head>
<body class="min-h-screen">
<div id="toast-container" class="fixed top-4 right-4 z-50 flex flex-col gap-2"></div>
<div id="app">

  <!-- LOGIN -->
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
          <input type="email" id="login-email" required placeholder="seu@email.com" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800" value="admin@tenis.com">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <div class="relative">
            <input type="password" id="login-senha" required placeholder="••••••••" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 pr-10" value="Admin@2025!">
            <button type="button" onclick="togglePassword()" class="absolute right-3 top-3 text-gray-400 hover:text-gray-600"><i class="fas fa-eye" id="eye-icon"></i></button>
          </div>
        </div>
        <button type="submit" id="login-btn" class="btn w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold text-lg">
          <i class="fas fa-sign-in-alt mr-2"></i>Entrar
        </button>
      </form>
      <div id="login-error" class="hidden mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"></div>
    </div>
  </div>

  <!-- MAIN APP -->
  <div id="main-app" class="hidden flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <div id="sidebar" class="sidebar w-64 bg-gradient-to-b from-green-800 to-green-900 text-white flex flex-col">
      <div class="p-5 border-b border-green-700">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🎾</span>
          <div><h1 class="font-bold text-lg leading-tight">TênisRank</h1><p id="sidebar-clube" class="text-green-300 text-xs">Carregando...</p></div>
        </div>
      </div>
      <div class="p-4 border-b border-green-700 bg-green-900/30">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold text-lg" id="user-avatar">?</div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm truncate" id="user-name">Usuário</p>
            <span class="badge badge-yellow text-xs mt-0.5" id="user-perfil">-</span>
          </div>
        </div>
      </div>
      <nav class="flex-1 overflow-y-auto p-3 space-y-1" id="sidebar-nav"></nav>
      <div class="p-3 border-t border-green-700">
        <button onclick="logout()" class="btn w-full flex items-center gap-2 px-4 py-2.5 rounded-lg nav-item text-green-200 hover:text-white text-sm">
          <i class="fas fa-sign-out-alt"></i> Sair
        </button>
      </div>
    </div>
    <div id="sidebar-overlay" class="hidden fixed inset-0 bg-black/50 z-40 md:hidden" onclick="toggleSidebar()"></div>

    <!-- Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-3">
          <button onclick="toggleSidebar()" class="md:hidden text-gray-500 hover:text-gray-700 text-xl"><i class="fas fa-bars"></i></button>
          <h2 class="text-gray-800 font-semibold text-lg" id="page-title">Dashboard</h2>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500 hidden sm:block" id="header-clube"></span>
          <button onclick="refreshPage()" class="btn p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Atualizar"><i class="fas fa-sync-alt"></i></button>
        </div>
      </header>
      <main class="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50" id="page-content">
        <div class="flex items-center justify-center h-64"><div class="spinner"></div></div>
      </main>
    </div>
  </div>
</div>
<div id="modal-container"></div>

<script>
// ============================================================
// ESTADO GLOBAL
// ============================================================
const State={token:localStorage.getItem('auth_token'),user:JSON.parse(localStorage.getItem('auth_user')||'null'),currentPage:'dashboard',data:{}}

// API
const api=axios.create({baseURL:'/api'})
api.interceptors.request.use(c=>{if(State.token)c.headers.Authorization='Bearer '+State.token;return c})
api.interceptors.response.use(r=>r,err=>{if(err.response?.status===401)logout();return Promise.reject(err)})

// TOAST
function toast(msg,type='success',dur=3500){
  const colors={success:'bg-green-600',error:'bg-red-600',warning:'bg-yellow-500',info:'bg-blue-600'}
  const icons={success:'check-circle',error:'exclamation-circle',warning:'exclamation-triangle',info:'info-circle'}
  const t=document.createElement('div')
  t.className=\`toast \${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-72 max-w-sm\`
  t.innerHTML=\`<i class="fas fa-\${icons[type]}"></i><span class="flex-1 text-sm">\${msg}</span><button onclick="this.parentElement.remove()" class="ml-2 opacity-70 hover:opacity-100">&times;</button>\`
  document.getElementById('toast-container').appendChild(t)
  setTimeout(()=>t.remove(),dur)
}

// AUTH
function togglePassword(){const i=document.getElementById('login-senha');const ic=document.getElementById('eye-icon');i.type=i.type==='password'?'text':'password';ic.className=i.type==='password'?'fas fa-eye':'fas fa-eye-slash'}

document.getElementById('login-form').addEventListener('submit',async(e)=>{
  e.preventDefault()
  const btn=document.getElementById('login-btn'),err=document.getElementById('login-error')
  btn.innerHTML='<div class="spinner mx-auto" style="width:20px;height:20px;border-width:2px"></div>'
  btn.disabled=true;err.classList.add('hidden')
  try{
    const res=await api.post('/auth/login',{email:document.getElementById('login-email').value,senha:document.getElementById('login-senha').value})
    const{token,usuario}=res.data.data
    State.token=token;State.user=usuario
    localStorage.setItem('auth_token',token);localStorage.setItem('auth_user',JSON.stringify(usuario))
    initApp()
  }catch(ex){
    err.textContent=ex.response?.data?.error||'Erro ao fazer login';err.classList.remove('hidden')
    btn.innerHTML='<i class="fas fa-sign-in-alt mr-2"></i>Entrar';btn.disabled=false
  }
})

function logout(){State.token=null;State.user=null;localStorage.removeItem('auth_token');localStorage.removeItem('auth_user');document.getElementById('login-screen').classList.remove('hidden');document.getElementById('main-app').classList.add('hidden')}

// INIT
function initApp(){
  if(!State.token||!State.user){document.getElementById('login-screen').classList.remove('hidden');document.getElementById('main-app').classList.add('hidden');return}
  document.getElementById('login-screen').classList.add('hidden');document.getElementById('main-app').classList.remove('hidden')
  const u=State.user
  document.getElementById('user-name').textContent=u.nome
  document.getElementById('user-avatar').textContent=u.nome.charAt(0).toUpperCase()
  document.getElementById('user-perfil').textContent=perfilLabel(u.perfil)
  document.getElementById('sidebar-clube').textContent=u.clube_nome||'Global'
  document.getElementById('header-clube').textContent=u.clube_nome?'🏆 '+u.clube_nome:''
  renderNav();navigateTo('dashboard')
}

function perfilLabel(p){return{ADMIN_GLOBAL:'Admin Global',ADMIN_CLUBE:'Admin Clube',JOGADOR:'Jogador'}[p]||p}

// NAV
const navItems={
  ADMIN_GLOBAL:[
    {id:'dashboard',label:'Dashboard',icon:'chart-line'},
    {id:'clubes',label:'Clubes',icon:'building'},
    {id:'usuarios',label:'Usuários',icon:'users'},
    {id:'pagamentos-global',label:'Pagamentos',icon:'dollar-sign'},
    {id:'relatorios-global',label:'Relatórios',icon:'file-chart-bar'},
    {id:'auditoria',label:'Auditoria',icon:'history'},
  ],
  ADMIN_CLUBE:[
    {id:'dashboard',label:'Dashboard',icon:'chart-line'},
    {id:'classes',label:'Classes',icon:'layer-group'},
    {id:'jogadores',label:'Jogadores',icon:'user-friends'},
    {id:'sorteios',label:'Sorteios',icon:'random'},
    {id:'rodadas',label:'Rodadas',icon:'calendar-alt'},
    {id:'partidas',label:'Partidas',icon:'table-tennis'},
    {id:'desafios-admin',label:'Desafios',icon:'bolt'},
    {id:'ranking',label:'Ranking',icon:'trophy'},
    {id:'pagamentos',label:'Pagamentos',icon:'dollar-sign'},
    {id:'publicacoes-admin',label:'Publicações',icon:'newspaper'},
    {id:'notificacoes',label:'Notificações',icon:'bell'},
    {id:'configuracoes',label:'Configurações',icon:'cog'},
  ],
  JOGADOR:[
    {id:'meu-painel',label:'Meu Painel',icon:'home'},
    {id:'ranking',label:'Ranking',icon:'trophy'},
    {id:'minhas-partidas',label:'Minhas Partidas',icon:'table-tennis'},
    {id:'desafios',label:'Desafios',icon:'bolt'},
    {id:'publicacoes',label:'Feed',icon:'newspaper'},
    {id:'rodadas',label:'Rodadas',icon:'calendar-alt'},
    {id:'meu-pagamento',label:'Meu Pagamento',icon:'dollar-sign'},
  ]
}

function renderNav(){
  const items=navItems[State.user.perfil]||[]
  document.getElementById('sidebar-nav').innerHTML=items.map(i=>\`
    <button onclick="navigateTo('\${i.id}')" id="nav-\${i.id}" class="btn nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-green-100 hover:text-white text-sm">
      <i class="fas fa-\${i.icon} w-5 text-center"></i><span>\${i.label}</span>
    </button>
  \`).join('')
}

function navigateTo(page){
  State.currentPage=page
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'))
  const navEl=document.getElementById('nav-'+page);if(navEl)navEl.classList.add('active')
  const titles={dashboard:'Dashboard',clubes:'Gestão de Clubes',usuarios:'Usuários',auditoria:'Auditoria',classes:'Classes',jogadores:'Jogadores',sorteios:'Sorteio de Rodada',rodadas:'Rodadas',partidas:'Partidas',ranking:'Ranking',configuracoes:'Configurações','minhas-partidas':'Minhas Partidas','meu-painel':'Meu Painel',desafios:'Desafios',publicacoes:'Feed','publicacoes-admin':'Publicações','desafios-admin':'Desafios',pagamentos:'Pagamentos','pagamentos-global':'Pagamentos','relatorios-global':'Relatórios',notificacoes:'Notificações','meu-pagamento':'Meu Pagamento'}
  document.getElementById('page-title').textContent=titles[page]||page
  document.getElementById('page-content').innerHTML='<div class="flex items-center justify-center h-64"><div class="spinner"></div></div>'
  setTimeout(()=>renderPage(page),80)
  if(window.innerWidth<768){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebar-overlay').classList.add('hidden')}
}

function refreshPage(){navigateTo(State.currentPage)}
function toggleSidebar(){const s=document.getElementById('sidebar'),o=document.getElementById('sidebar-overlay');s.classList.toggle('open');o.classList.toggle('hidden')}

// PÁGINA ROUTER
async function renderPage(page){
  const p=State.user.perfil
  try{
    if(page==='dashboard'){if(p==='ADMIN_GLOBAL')await renderDashboardGlobal();else if(p==='ADMIN_CLUBE')await renderDashboardClube();else await renderMeuPainel()}
    else if(page==='meu-painel')await renderMeuPainel()
    else if(page==='clubes'&&p==='ADMIN_GLOBAL')await renderClubes()
    else if(page==='usuarios'&&p==='ADMIN_GLOBAL')await renderUsuarios()
    else if(page==='auditoria'&&p==='ADMIN_GLOBAL')await renderAuditoria()
    else if(page==='pagamentos-global')await renderPagamentosGlobal()
    else if(page==='relatorios-global')await renderRelatoriosGlobal()
    else if(page==='classes')await renderClasses()
    else if(page==='jogadores')await renderJogadores()
    else if(page==='sorteios')await renderSorteios()
    else if(page==='rodadas')await renderRodadas()
    else if(page==='partidas')await renderPartidas()
    else if(page==='ranking')await renderRanking()
    else if(page==='configuracoes')await renderConfiguracoes()
    else if(page==='pagamentos')await renderPagamentos()
    else if(page==='notificacoes')await renderNotificacoes()
    else if(page==='publicacoes-admin')await renderPublicacoes(true)
    else if(page==='desafios-admin')await renderDesafios(true)
    else if(page==='minhas-partidas')await renderMinhasPartidas()
    else if(page==='desafios')await renderDesafios(false)
    else if(page==='publicacoes')await renderPublicacoes(false)
    else if(page==='meu-pagamento')await renderMeuPagamento()
    else setContent('<div class="text-center text-gray-400 mt-20"><i class="fas fa-construction text-4xl mb-4"></i><p>Página em desenvolvimento</p></div>')
  }catch(e){console.error(e);setContent('<div class="text-center text-red-400 mt-20"><i class="fas fa-exclamation-circle text-4xl mb-4"></i><p>Erro ao carregar: '+e.message+'</p></div>')}
}

function setContent(html){document.getElementById('page-content').innerHTML='<div class="fade-in">'+html+'</div>'}

// ============================================================
// HELPERS UI
// ============================================================
function statusBadge(s){
  const m={ATIVO:'badge-green',ATIVA:'badge-green',PAGO:'badge-green',ACEITO:'badge-green',FINALIZADA:'badge-green',
    INATIVO:'badge-red',INATIVA:'badge-red',VENCIDO:'badge-red',CANCELADA:'badge-red',RECUSADO:'badge-red',
    PENDENTE:'badge-yellow',EM_ANDAMENTO:'badge-blue',EXPIRADO:'badge-gray',ENCERRADA:'badge-gray',WO:'badge-gray',
    CANCELADO:'badge-red'}
  const l={ATIVO:'Ativo',ATIVA:'Ativa',INATIVO:'Inativo',INATIVA:'Inativa',PENDENTE:'Pendente',EM_ANDAMENTO:'Em Andamento',
    FINALIZADA:'Finalizada',WO:'W.O.',CANCELADA:'Cancelada',ENCERRADA:'Encerrada',PAGO:'Pago',VENCIDO:'Vencido',
    CANCELADO:'Cancelado',ACEITO:'Aceito',RECUSADO:'Recusado',EXPIRADO:'Expirado'}
  return \`<span class="badge \${m[s]||'badge-gray'}">\${l[s]||s}</span>\`
}
function fmtDate(d){if(!d)return'-';return new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function fmtDateOnly(d){if(!d)return'-';return new Date(d).toLocaleDateString('pt-BR')}
function fmtMoeda(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)}
function statCard(icon,label,value,color='green',sub='',onclick=''){
  return \`<div class="card bg-white rounded-xl p-5 \${onclick?'cursor-pointer hover:border-'+color+'-300 border border-transparent':''}" \${onclick?'onclick="'+onclick+'"':''}>
    <div class="flex items-center justify-between">
      <div><p class="text-gray-500 text-sm font-medium">\${label}</p><p class="text-3xl font-bold text-gray-800 mt-1">\${value}</p>\${sub?'<p class="text-xs text-gray-400 mt-1">'+sub+'</p>':''}</div>
      <div class="w-14 h-14 rounded-2xl bg-\${color}-100 flex items-center justify-center"><i class="fas fa-\${icon} text-\${color}-600 text-xl"></i></div>
    </div>
  </div>\`
}

// MODAL
function showModal(title,body,onConfirm,confirmLabel='Salvar',size='max-w-lg'){
  closeModal()
  const m=document.createElement('div');m.id='modal-overlay';m.className='fixed inset-0 modal-bg flex items-center justify-center z-50 p-4'
  m.innerHTML=\`<div class="bg-white rounded-2xl shadow-2xl w-full \${size} max-h-[90vh] flex flex-col fade-in">
    <div class="flex items-center justify-between p-5 border-b border-gray-100">
      <h3 class="text-lg font-bold text-gray-800">\${title}</h3>
      <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">&times;</button>
    </div>
    <div class="p-5 overflow-y-auto flex-1">\${body}</div>
    \${onConfirm!==null?\`<div class="flex gap-3 p-5 border-t border-gray-100">
      <button onclick="closeModal()" class="btn flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 font-medium">Cancelar</button>
      <button id="modal-confirm" class="btn flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-semibold">\${confirmLabel}</button>
    </div>\`:''}
  </div>\`
  document.getElementById('modal-container').appendChild(m)
  if(onConfirm)document.getElementById('modal-confirm').addEventListener('click',onConfirm)
  document.addEventListener('keydown',handleEsc)
}
function closeModal(){const m=document.getElementById('modal-overlay');if(m)m.remove();document.removeEventListener('keydown',handleEsc)}
function handleEsc(e){if(e.key==='Escape')closeModal()}
function confirmAction(msg,onConfirm,danger=true){
  showModal(danger?'<span class="text-red-600"><i class="fas fa-exclamation-triangle mr-2"></i>Confirmar</span>':'<i class="fas fa-question-circle mr-2 text-blue-500"></i>Confirmar',\`<p class="text-gray-700">\${msg}</p>\`,onConfirm,'Confirmar')
  if(danger)document.getElementById('modal-confirm').className='btn flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold'
}
function formGroup(label,inputHtml,req=false){return\`<div class="mb-4"><label class="block text-sm font-medium text-gray-700 mb-1">\${label}\${req?'<span class="text-red-500 ml-1">*</span>':''}</label>\${inputHtml}</div>\`}
function ic(){return'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm'}
function sc(){return'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm bg-white'}

// ============================================================
// DASHBOARD GLOBAL
// ============================================================
async function renderDashboardGlobal(){
  const res=await api.get('/admin/global/dashboard');const d=res.data.data
  setContent(\`<div class="space-y-6">
    <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      \${statCard('building','Total Clubes',d.total_clubes,'blue')}
      \${statCard('check-circle','Clubes Ativos',d.clubes_ativos,'green')}
      \${statCard('users','Usuários',d.total_usuarios,'purple')}
      \${statCard('user-friends','Jogadores',d.total_jogadores,'yellow')}
      \${statCard('random','Rodadas',d.total_rodadas,'indigo')}
      \${statCard('hourglass-half','Partidas Pendentes',d.partidas_pendentes,'orange')}
    </div>
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="card bg-white rounded-xl p-5">
        <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-building text-blue-500"></i>Clubes Recentes</h3>
        \${d.clubes_recentes.map(c=>\`<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
          <div><p class="font-medium text-gray-800 text-sm">\${c.nome}</p><p class="text-xs text-gray-400">\${fmtDate(c.created_at)}</p></div>
          \${statusBadge(c.status)}
        </div>\`).join('')||'<p class="text-gray-400 text-sm text-center py-4">Nenhum clube</p>'}
        <button onclick="navigateTo('clubes')" class="btn mt-3 w-full text-center text-green-600 text-sm font-medium">Ver todos →</button>
      </div>
      <div class="card bg-white rounded-xl p-5">
        <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-history text-purple-500"></i>Eventos Recentes</h3>
        \${d.eventos_recentes.map(e=>\`<div class="flex items-start gap-2 p-2 border-b border-gray-50 last:border-0">
          <div class="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0"><i class="fas fa-bolt text-green-600 text-xs"></i></div>
          <div><p class="text-xs font-medium text-gray-700">\${e.tipo_evento.replace(/_/g,' ')}</p><p class="text-xs text-gray-400">\${e.usuario_nome||'-'} · \${fmtDate(e.data_evento)}</p></div>
        </div>\`).join('')||'<p class="text-gray-400 text-sm text-center py-4">Sem eventos</p>'}
        <button onclick="navigateTo('auditoria')" class="btn mt-3 w-full text-center text-green-600 text-sm font-medium">Ver auditoria →</button>
      </div>
    </div>
  </div>\`)
}

// ============================================================
// CLUBES
// ============================================================
async function renderClubes(){
  const res=await api.get('/admin/global/clubes');const clubes=res.data.data.items||[]
  setContent(\`<div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <input type="text" id="busca-clube" placeholder="Buscar clube..." class="\${ic()} w-56" oninput="filtrarClubes(this.value)">
      <button onclick="modalNovoClube()" class="btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2"><i class="fas fa-plus"></i> Novo Clube</button>
    </div>
    <div class="card bg-white rounded-xl overflow-hidden">
      <table class="w-full text-sm" id="tabela-clubes">
        <thead class="bg-gray-50 border-b"><tr>
          <th class="text-left px-4 py-3 text-gray-600 font-semibold">Clube</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Jogadores</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Classes</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Status</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Ações</th>
        </tr></thead>
        <tbody>
          \${clubes.length===0?'<tr><td colspan="5" class="text-center py-12 text-gray-400"><i class="fas fa-building text-3xl mb-3 block"></i>Nenhum clube</td></tr>':
          clubes.map(c=>\`<tr class="table-row border-b border-gray-50" data-nome="\${c.nome.toLowerCase()}">
            <td class="px-4 py-3"><p class="font-semibold text-gray-800">\${c.nome}</p><p class="text-xs text-gray-400">\${c.cidade||''}\${c.cidade&&c.estado?', ':''}\${c.estado||''}</p></td>
            <td class="px-4 py-3 text-center hidden sm:table-cell">\${c.total_jogadores||0}</td>
            <td class="px-4 py-3 text-center hidden md:table-cell">\${c.total_classes||0}</td>
            <td class="px-4 py-3 text-center">\${statusBadge(c.status)}</td>
            <td class="px-4 py-3 text-center">
              <div class="flex justify-center gap-1">
                <button onclick="modalEditarClube('\${c.id}',\${JSON.stringify(c).replace(/'/g,'&apos;')})" class="btn p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Editar"><i class="fas fa-edit"></i></button>
                <button onclick="modalAdminClube('\${c.id}','\${c.nome}')" class="btn p-2 text-purple-500 hover:bg-purple-50 rounded-lg" title="Add Admin"><i class="fas fa-user-plus"></i></button>
                <button onclick="alterarStatusClube('\${c.id}','\${c.status}')" class="btn p-2 \${c.status==='ATIVO'?'text-red-500 hover:bg-red-50':'text-green-500 hover:bg-green-50'} rounded-lg">
                  <i class="fas fa-\${c.status==='ATIVO'?'ban':'check-circle'}"></i>
                </button>
              </div>
            </td>
          </tr>\`).join('')}
        </tbody>
      </table>
    </div>
  </div>\`)
}

function filtrarClubes(b){document.querySelectorAll('#tabela-clubes tbody tr[data-nome]').forEach(r=>r.style.display=r.dataset.nome.includes(b.toLowerCase())?'':'none')}

function modalNovoClube(){showModal('Novo Clube',\`
  \${formGroup('Nome',\`<input type="text" id="f-nome" class="\${ic()}" placeholder="Ex: Clube Atlético">\`,true)}
  <div class="grid grid-cols-2 gap-3">\${formGroup('Cidade',\`<input type="text" id="f-cidade" class="\${ic()}">\`)}\${formGroup('Estado',\`<input type="text" id="f-estado" class="\${ic()}" maxlength="2">\`)}</div>
  \${formGroup('Email',\`<input type="email" id="f-email" class="\${ic()}">\`)}
  \${formGroup('Telefone',\`<input type="tel" id="f-telefone" class="\${ic()}">\`)}
\`,async()=>{
  try{await api.post('/admin/global/clubes',{nome:document.getElementById('f-nome').value,cidade:document.getElementById('f-cidade').value,estado:document.getElementById('f-estado').value,email_contato:document.getElementById('f-email').value,telefone:document.getElementById('f-telefone').value});closeModal();toast('Clube criado!');renderClubes()}
  catch(e){toast(e.response?.data?.error||'Erro','error')}
})}

function modalEditarClube(id,c){showModal('Editar Clube',\`
  \${formGroup('Nome',\`<input type="text" id="f-nome" class="\${ic()}" value="\${c.nome||''}">\`,true)}
  <div class="grid grid-cols-2 gap-3">\${formGroup('Cidade',\`<input type="text" id="f-cidade" class="\${ic()}" value="\${c.cidade||''}">\`)}\${formGroup('Estado',\`<input type="text" id="f-estado" class="\${ic()}" value="\${c.estado||''}" maxlength="2">\`)}</div>
  \${formGroup('Email',\`<input type="email" id="f-email" class="\${ic()}" value="\${c.email_contato||''}">\`)}
  \${formGroup('Telefone',\`<input type="tel" id="f-telefone" class="\${ic()}" value="\${c.telefone||''}">\`)}
\`,async()=>{
  try{await api.put('/admin/global/clubes/'+id,{nome:document.getElementById('f-nome').value,cidade:document.getElementById('f-cidade').value,estado:document.getElementById('f-estado').value,email_contato:document.getElementById('f-email').value,telefone:document.getElementById('f-telefone').value});closeModal();toast('Clube atualizado!');renderClubes()}
  catch(e){toast(e.response?.data?.error||'Erro','error')}
})}

function modalAdminClube(cid,cnome){showModal('Adicionar Admin — '+cnome,\`
  \${formGroup('Nome',\`<input type="text" id="f-nome" class="\${ic()}">\`,true)}
  \${formGroup('Email',\`<input type="email" id="f-email" class="\${ic()}">\`,true)}
  \${formGroup('Senha',\`<input type="password" id="f-senha" class="\${ic()}">\`,true)}
\`,async()=>{
  try{await api.post('/admin/global/clubes/'+cid+'/administradores',{nome:document.getElementById('f-nome').value,email:document.getElementById('f-email').value,senha:document.getElementById('f-senha').value});closeModal();toast('Admin vinculado!')}
  catch(e){toast(e.response?.data?.error||'Erro','error')}
})}

async function alterarStatusClube(id,s){
  confirmAction(s==='ATIVO'?'Deseja <strong>inativar</strong> este clube?':'Deseja <strong>reativar</strong> este clube?',async()=>{
    try{await api.patch('/admin/global/clubes/'+id+'/status',{status:s==='ATIVO'?'INATIVO':'ATIVO'});closeModal();toast('Status atualizado!');renderClubes()}
    catch(e){toast('Erro','error')}
  })
}

// ============================================================
// USUÁRIOS GLOBAL
// ============================================================
async function renderUsuarios(){
  const res=await api.get('/admin/global/usuarios');const usuarios=res.data.data||[]
  setContent(\`<div class="space-y-4">
    <div class="flex justify-between items-center">
      <span class="text-sm text-gray-500">\${usuarios.length} usuários</span>
      <button onclick="modalNovoUsuarioGlobal()" class="btn bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"><i class="fas fa-user-plus"></i> Novo Usuário</button>
    </div>
    <div class="card bg-white rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50"><tr>
          <th class="text-left px-4 py-3 text-gray-600 font-semibold">Usuário</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Perfil</th>
          <th class="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Clube</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden lg:table-cell">Último Login</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Status</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Ações</th>
        </tr></thead>
        <tbody>
          \${usuarios.map(u=>\`<tr class="table-row border-b border-gray-50">
            <td class="px-4 py-3"><div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">\${u.nome.charAt(0)}</div>
              <div><p class="font-medium text-gray-800">\${u.nome}</p><p class="text-xs text-gray-400">\${u.email}</p></div>
            </div></td>
            <td class="px-4 py-3 text-center hidden sm:table-cell"><span class="badge badge-blue text-xs">\${perfilLabel(u.perfil)}</span></td>
            <td class="px-4 py-3 hidden md:table-cell text-sm text-gray-600">\${u.clube_nome||'-'}</td>
            <td class="px-4 py-3 text-center hidden lg:table-cell text-xs text-gray-500">\${fmtDate(u.ultimo_login)}</td>
            <td class="px-4 py-3 text-center">\${statusBadge(u.status)}</td>
            <td class="px-4 py-3 text-center">
              <button onclick="modalEditarUsuario('\${u.id}',\${JSON.stringify(u).replace(/'/g,'&apos;')})" class="btn p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><i class="fas fa-edit"></i></button>
            </td>
          </tr>\`).join('')}
        </tbody>
      </table>
    </div>
  </div>\`)
}

function modalNovoUsuarioGlobal(){showModal('Novo Usuário',\`
  \${formGroup('Nome',\`<input type="text" id="f-nome" class="\${ic()}">\`,true)}
  \${formGroup('Email',\`<input type="email" id="f-email" class="\${ic()}">\`,true)}
  \${formGroup('Senha',\`<input type="password" id="f-senha" class="\${ic()}">\`,true)}
  \${formGroup('Perfil',\`<select id="f-perfil" class="\${sc()}"><option value="ADMIN_GLOBAL">Admin Global</option><option value="ADMIN_CLUBE">Admin Clube</option><option value="JOGADOR">Jogador</option></select>\`,true)}
\`,async()=>{
  try{await api.post('/auth/register',{nome:document.getElementById('f-nome').value,email:document.getElementById('f-email').value,senha:document.getElementById('f-senha').value,perfil:document.getElementById('f-perfil').value});closeModal();toast('Usuário criado!');renderUsuarios()}
  catch(e){toast(e.response?.data?.error||'Erro','error')}
})}

function modalEditarUsuario(id,u){showModal('Editar Usuário',\`
  \${formGroup('Nome',\`<input type="text" id="f-nome" class="\${ic()}" value="\${u.nome}">\`,true)}
  \${formGroup('Status',\`<select id="f-status" class="\${sc()}"><option value="ATIVO" \${u.status==='ATIVO'?'selected':''}>Ativo</option><option value="INATIVO" \${u.status==='INATIVO'?'selected':''}>Inativo</option></select>\`,true)}
\`,async()=>{toast('Em desenvolvimento','info')})}

// ============================================================
// AUDITORIA
// ============================================================
async function renderAuditoria(){
  const res=await api.get('/admin/global/auditoria?limit=100');const{items}=res.data.data
  setContent(\`<div class="card bg-white rounded-xl overflow-hidden">
    <div class="p-4 border-b flex items-center justify-between"><h3 class="font-bold text-gray-800">Log de Auditoria</h3><span class="badge badge-blue">\${items.length} eventos</span></div>
    <div class="divide-y divide-gray-50">
      \${items.map(e=>\`<div class="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
        <div class="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5"><i class="fas fa-bolt text-green-600 text-xs"></i></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-medium text-gray-800">\${e.tipo_evento.replace(/_/g,' ')}</p>
            <span class="text-xs text-gray-400 whitespace-nowrap">\${fmtDate(e.data_evento)}</span>
          </div>
          <p class="text-xs text-gray-500">\${e.usuario_nome||'Sistema'}\${e.clube_nome?' · '+e.clube_nome:''}</p>
          \${e.payload_resumido?'<p class="text-xs text-gray-400 truncate">'+e.payload_resumido+'</p>':''}
        </div>
      </div>\`).join('')||'<p class="text-center text-gray-400 py-12">Sem eventos</p>'}
    </div>
  </div>\`)
}

// ============================================================
// PAGAMENTOS GLOBAL
// ============================================================
async function renderPagamentosGlobal(){
  const cRes=await api.get('/admin/global/clubes');const clubes=cRes.data.data.items||[]
  setContent(\`<div class="space-y-4">
    <div class="card bg-white rounded-xl p-5">
      <h3 class="font-bold text-gray-800 mb-4"><i class="fas fa-dollar-sign text-green-500 mr-2"></i>Gestão de Pagamentos por Clube</h3>
      <p class="text-sm text-gray-500 mb-4">Selecione um clube para gerir pagamentos:</p>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        \${clubes.filter(c=>c.status==='ATIVO').map(c=>\`
          <div class="p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 cursor-pointer transition-all" onclick="toast('Acesse como Admin do Clube para gerir pagamentos.','info',5000)">
            <p class="font-semibold text-gray-800">\${c.nome}</p>
            <p class="text-xs text-gray-400 mt-1">\${c.total_jogadores||0} jogadores</p>
          </div>
        \`).join('')||'<p class="text-gray-400 text-sm col-span-3">Nenhum clube ativo</p>'}
      </div>
    </div>
  </div>\`)
}

// ============================================================
// RELATÓRIOS GLOBAL
// ============================================================
async function renderRelatoriosGlobal(){
  const res=await api.get('/admin/global/dashboard');const d=res.data.data
  setContent(\`<div class="space-y-6">
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      \${statCard('building','Total Clubes',d.total_clubes,'blue')}
      \${statCard('user-friends','Total Jogadores',d.total_jogadores,'green')}
      \${statCard('random','Rodadas Geradas',d.total_rodadas,'purple')}
      \${statCard('table-tennis','Partidas Pendentes',d.partidas_pendentes,'yellow')}
    </div>
    <div class="card bg-white rounded-xl p-5">
      <h3 class="font-bold text-gray-800 mb-4"><i class="fas fa-chart-bar text-blue-500 mr-2"></i>Relatório de Clubes</h3>
      <table class="w-full text-sm">
        <thead class="bg-gray-50"><tr>
          <th class="text-left px-4 py-3 text-gray-600 font-semibold">Clube</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Admins</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Jogadores</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Classes</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Status</th>
        </tr></thead>
        <tbody>
          \${d.clubes_recentes.map(c=>\`<tr class="border-b border-gray-50">
            <td class="px-4 py-3 font-medium text-gray-800">\${c.nome}</td>
            <td class="px-4 py-3 text-center text-gray-600">-</td>
            <td class="px-4 py-3 text-center text-gray-600">-</td>
            <td class="px-4 py-3 text-center text-gray-600">-</td>
            <td class="px-4 py-3 text-center">\${statusBadge(c.status)}</td>
          </tr>\`).join('')}
        </tbody>
      </table>
    </div>
  </div>\`)
}

// ============================================================
// DASHBOARD DO CLUBE
// ============================================================
async function renderDashboardClube(){
  const res=await api.get('/admin/clube/dashboard');const d=res.data.data
  setContent(\`<div class="space-y-6">
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      \${statCard('layer-group','Classes',d.total_classes,'blue','',\"navigateTo('classes')\")}
      \${statCard('user-friends','Jogadores',d.total_jogadores,'green','',\"navigateTo('jogadores')\")}
      \${statCard('random','Rodadas',d.total_rodadas,'purple','',\"navigateTo('rodadas')\")}
      \${statCard('hourglass-half','Pendentes',d.partidas_pendentes,'yellow','',\"navigateTo('partidas')\")}
      \${statCard('check-circle','Finalizadas',d.partidas_finalizadas,'green')}
    </div>
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="card bg-white rounded-xl p-5">
        <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-layer-group text-blue-500"></i>Classes</h3>
        \${d.classes_stats.length===0?'<p class="text-gray-400 text-sm text-center py-4">Nenhuma classe</p>':d.classes_stats.map(cl=>\`
          <div class="p-3 bg-gray-50 rounded-lg mb-2">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-gray-800 text-sm">\${cl.nome}</p>
              <div class="flex gap-1">
                <span class="badge badge-blue">\${cl.total_jogadores}</span>
                \${cl.jogadores_bloqueados>0?'<span class="badge badge-red">'+cl.jogadores_bloqueados+' bloq.</span>':''}
              </div>
            </div>
            \${cl.total_jogadores>0?\`<div class="w-full bg-gray-200 rounded-full h-1.5"><div class="bg-green-500 h-1.5 rounded-full" style="width:\${Math.max(0,((cl.total_jogadores-cl.jogadores_bloqueados)/cl.total_jogadores)*100)}%"></div></div>\`:''}
          </div>
        \`).join('')}
        <button onclick="navigateTo('sorteios')" class="btn mt-3 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
          <i class="fas fa-random"></i> Iniciar Sorteio
        </button>
      </div>
      <div class="card bg-white rounded-xl p-5">
        <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-calendar-alt text-purple-500"></i>Últimas Rodadas</h3>
        \${d.ultimas_rodadas.length===0?'<p class="text-gray-400 text-sm text-center py-4">Nenhuma rodada</p>':d.ultimas_rodadas.map(r=>\`
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
            <div><p class="font-medium text-sm">#\${r.numero} — \${r.classe_nome}</p><p class="text-xs text-gray-400">\${r.total_partidas} partidas · \${fmtDate(r.data_execucao)}</p></div>
            \${statusBadge(r.status)}
          </div>
        \`).join('')}
        <button onclick="navigateTo('rodadas')" class="btn mt-3 w-full text-center text-green-600 text-sm font-medium">Ver todas →</button>
      </div>
    </div>
  </div>\`)
}

// ============================================================
// CLASSES
// ============================================================
async function renderClasses(){
  const res=await api.get('/admin/clube/classes');const classes=res.data.data||[]
  setContent(\`<div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500">\${classes.length} classe(s)</p>
      <button onclick="modalNovaClasse()" class="btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2"><i class="fas fa-plus"></i> Nova Classe</button>
    </div>
    \${classes.length===0?'<div class="card bg-white rounded-xl p-12 text-center text-gray-400"><i class="fas fa-layer-group text-4xl mb-4 text-gray-300"></i><p>Nenhuma classe</p></div>':\`
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        \${classes.map(cl=>\`<div class="card bg-white rounded-xl p-5">
          <div class="flex items-start justify-between mb-3">
            <div><h3 class="font-bold text-gray-800">\${cl.nome}</h3>\${cl.descricao?'<p class="text-sm text-gray-500 mt-0.5">'+cl.descricao+'</p>':''}</div>
            \${statusBadge(cl.status)}
          </div>
          <p class="text-sm text-gray-500 mb-3"><i class="fas fa-users mr-1 text-green-500 text-xs"></i>\${cl.total_jogadores_ativos} ativos de \${cl.total_jogadores}</p>
          <div class="flex gap-2">
            <button onclick="modalEditarClasse('\${cl.id}',\${JSON.stringify(cl).replace(/'/g,'&apos;')})" class="btn flex-1 border border-gray-200 text-gray-600 py-1.5 rounded-lg text-xs hover:bg-gray-50"><i class="fas fa-edit mr-1"></i>Editar</button>
            <button onclick="alterarStatusClasse('\${cl.id}','\${cl.status}')" class="btn flex-1 \${cl.status==='ATIVA'?'border border-red-200 text-red-500 hover:bg-red-50':'border border-green-200 text-green-600 hover:bg-green-50'} py-1.5 rounded-lg text-xs">
              \${cl.status==='ATIVA'?'Inativar':'Ativar'}
            </button>
          </div>
        </div>\`).join('')}
      </div>
    \`}
  </div>\`)
}

function modalNovaClasse(){showModal('Nova Classe',\`
  \${formGroup('Nome',\`<input type="text" id="f-nome" class="\${ic()}" placeholder="Ex: Classe A">\`,true)}
  \${formGroup('Descrição',\`<textarea id="f-desc" class="\${ic()}" rows="2"></textarea>\`)}
  \${formGroup('Ordem',\`<input type="number" id="f-ordem" class="\${ic()}" value="0">\`)}
\`,async()=>{
  try{await api.post('/admin/clube/classes',{nome:document.getElementById('f-nome').value,descricao:document.getElementById('f-desc').value,ordem:parseInt(document.getElementById('f-ordem').value)||0});closeModal();toast('Classe criada!');renderClasses()}
  catch(e){toast(e.response?.data?.error||'Erro','error')}
})}

function modalEditarClasse(id,cl){showModal('Editar Classe',\`
  \${formGroup('Nome',\`<input type="text" id="f-nome" class="\${ic()}" value="\${cl.nome}">\`,true)}
  \${formGroup('Descrição',\`<textarea id="f-desc" class="\${ic()}" rows="2">\${cl.descricao||''}</textarea>\`)}
  \${formGroup('Ordem',\`<input type="number" id="f-ordem" class="\${ic()}" value="\${cl.ordem||0}">\`)}
\`,async()=>{
  try{await api.put('/admin/clube/classes/'+id,{nome:document.getElementById('f-nome').value,descricao:document.getElementById('f-desc').value,ordem:parseInt(document.getElementById('f-ordem').value)||0});closeModal();toast('Classe atualizada!');renderClasses()}
  catch(e){toast(e.response?.data?.error||'Erro','error')}
})}

async function alterarStatusClasse(id,s){
  try{await api.patch('/admin/clube/classes/'+id+'/status',{status:s==='ATIVA'?'INATIVA':'ATIVA'});toast('Status atualizado!');renderClasses()}
  catch(e){toast(e.response?.data?.error||'Erro','error')}
}

// ============================================================
// JOGADORES
// ============================================================
async function renderJogadores(){
  const[jRes,clRes]=await Promise.all([api.get('/admin/clube/jogadores'),api.get('/admin/clube/classes?status=ATIVA')])
  const jogadores=jRes.data.data||[];const classes=clRes.data.data||[]
  State.data.classes=classes
  setContent(\`<div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-2">
        <input type="text" id="busca-j" placeholder="Buscar..." class="\${ic()} w-44" oninput="filtrarJ(this.value)">
        <select id="filtro-cl" class="\${sc()} w-40" onchange="filtrarJ(document.getElementById('busca-j').value)">
          <option value="">Todas classes</option>
          \${classes.map(cl=>\`<option value="\${cl.id}">\${cl.nome}</option>\`).join('')}
        </select>
        <select id="filtro-st" class="\${sc()} w-36" onchange="filtrarJ(document.getElementById('busca-j').value)">
          <option value="">Todos</option><option value="ATIVO">Ativos</option><option value="INATIVO">Inativos</option>
        </select>
      </div>
      <button onclick="modalNovoJogador()" class="btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2"><i class="fas fa-user-plus"></i> Novo</button>
    </div>
    <div class="card bg-white rounded-xl overflow-hidden">
      <div class="p-4 border-b flex items-center justify-between"><h3 class="font-bold text-gray-800">Jogadores</h3><span class="badge badge-blue">\${jogadores.length}</span></div>
      <table class="w-full text-sm" id="tabela-j">
        <thead class="bg-gray-50"><tr>
          <th class="text-left px-4 py-3 text-gray-600 font-semibold">Jogador</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Classe</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Pts</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden lg:table-cell">Abertos</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden lg:table-cell">Inadimp.</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Status</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Ações</th>
        </tr></thead>
        <tbody>
          \${jogadores.length===0?'<tr><td colspan="7" class="text-center py-12 text-gray-400">Nenhum jogador</td></tr>':
          jogadores.map(j=>\`<tr class="table-row border-b border-gray-50 \${j.inadimplente?'inadimplente-row':''}" data-nome="\${j.nome.toLowerCase()}" data-classe="\${j.classe_id}" data-status="\${j.status}">
            <td class="px-4 py-3"><div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">\${j.nome.charAt(0)}</div>
              <div><p class="font-semibold text-gray-800">\${j.nome}</p><p class="text-xs text-gray-400">\${j.email||j.telefone||''}</p></div>
            </div></td>
            <td class="px-4 py-3 text-center hidden sm:table-cell"><span class="badge badge-blue">\${j.classe_nome||'-'}</span></td>
            <td class="px-4 py-3 text-center hidden md:table-cell"><span class="font-bold text-gray-700">\${j.pontos_total||0}</span>\${j.ranking_posicao>0?'<span class="text-xs text-gray-400 ml-1">#'+j.ranking_posicao+'</span>':''}</td>
            <td class="px-4 py-3 text-center hidden lg:table-cell"><span class="\${j.jogos_abertos>0?'text-orange-600 font-bold':'text-gray-500'}">\${j.jogos_abertos}</span></td>
            <td class="px-4 py-3 text-center hidden lg:table-cell">\${j.inadimplente?'<span class="badge badge-red">'+j.dias_inadimplente+'d</span>':'<span class="badge badge-green">OK</span>'}</td>
            <td class="px-4 py-3 text-center">\${statusBadge(j.status)}</td>
            <td class="px-4 py-3 text-center"><div class="flex justify-center gap-1">
              <button onclick="modalEditarJogador('\${j.id}',\${JSON.stringify(j).replace(/'/g,'&apos;')})" class="btn p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><i class="fas fa-edit"></i></button>
              <button onclick="alterarStatusJogador('\${j.id}','\${j.status}')" class="btn p-2 \${j.status==='ATIVO'?'text-red-500 hover:bg-red-50':'text-green-500 hover:bg-green-50'} rounded-lg"><i class="fas fa-\${j.status==='ATIVO'?'user-slash':'user-check'}"></i></button>
            </div></td>
          </tr>\`).join('')}
        </tbody>
      </table>
    </div>
  </div>\`)
}

function filtrarJ(b){
  const cl=document.getElementById('filtro-cl')?.value;const st=document.getElementById('filtro-st')?.value
  document.querySelectorAll('#tabela-j tbody tr[data-nome]').forEach(r=>{
    const bm=!b||r.dataset.nome.includes(b.toLowerCase());const cm=!cl||r.dataset.classe===cl;const sm=!st||r.dataset.status===st
    r.style.display=bm&&cm&&sm?'':'none'
  })
}

function modalNovoJogador(){
  const classes=State.data.classes||[]
  showModal('Novo Jogador',\`
    \${formGroup('Nome',\`<input type="text" id="f-nome" class="\${ic()}" placeholder="Nome completo">\`,true)}
    \${formGroup('Classe',\`<select id="f-classe" class="\${sc()}"><option value="">Selecione</option>\${classes.map(cl=>'<option value="'+cl.id+'">'+cl.nome+'</option>').join('')}</select>\`,true)}
    \${formGroup('Email',\`<input type="email" id="f-email" class="\${ic()}">\`)}
    \${formGroup('Telefone',\`<input type="tel" id="f-telefone" class="\${ic()}">\`)}
    \${formGroup('Instagram',\`<input type="text" id="f-insta" class="\${ic()}" placeholder="@usuario">\`)}
  \`,async()=>{
    const n=document.getElementById('f-nome').value;const c=document.getElementById('f-classe').value
    if(!n||!c){toast('Nome e classe são obrigatórios','error');return}
    try{await api.post('/admin/clube/jogadores',{nome:n,classe_id:c,email:document.getElementById('f-email').value,telefone:document.getElementById('f-telefone').value,instagram_url:document.getElementById('f-insta').value});closeModal();toast('Jogador criado!');renderJogadores()}
    catch(e){toast(e.response?.data?.error||'Erro','error')}
  })
}

function modalEditarJogador(id,j){
  const classes=State.data.classes||[]
  showModal('Editar Jogador',\`
    \${formGroup('Nome',\`<input type="text" id="f-nome" class="\${ic()}" value="\${j.nome}">\`,true)}
    \${formGroup('Classe',\`<select id="f-classe" class="\${sc()}">\${classes.map(cl=>'<option value="'+cl.id+'"'+(cl.id===j.classe_id?' selected':'')+'>'+cl.nome+'</option>').join('')}</select>\`,true)}
    \${formGroup('Email',\`<input type="email" id="f-email" class="\${ic()}" value="\${j.email||''}">\`)}
    \${formGroup('Telefone',\`<input type="tel" id="f-telefone" class="\${ic()}" value="\${j.telefone||''}">\`)}
    \${formGroup('Instagram',\`<input type="text" id="f-insta" class="\${ic()}" value="\${j.instagram_url||''}">\`)}
  \`,async()=>{
    try{await api.put('/admin/clube/jogadores/'+id,{nome:document.getElementById('f-nome').value,classe_id:document.getElementById('f-classe').value,email:document.getElementById('f-email').value,telefone:document.getElementById('f-telefone').value,instagram_url:document.getElementById('f-insta').value});closeModal();toast('Atualizado!');renderJogadores()}
    catch(e){toast(e.response?.data?.error||'Erro','error')}
  })
}

async function alterarStatusJogador(id,s){
  try{await api.patch('/admin/clube/jogadores/'+id+'/status',{status:s==='ATIVO'?'INATIVO':'ATIVO'});toast('Status atualizado!');renderJogadores()}
  catch(e){toast(e.response?.data?.error||'Erro','error')}
}

// ============================================================
// SORTEIOS
// ============================================================
async function renderSorteios(){
  const[clRes,cfRes]=await Promise.all([api.get('/admin/clube/classes?status=ATIVA'),api.get('/admin/clube/configuracoes')])
  const classes=clRes.data.data||[];const config=cfRes.data.data||{}
  const fmtSet=config.formato_set==='SET_PRO'?'Set Pro (vantagem)':'3 Sets (3° tie-break)'
  setContent(\`<div class="space-y-6 max-w-2xl mx-auto">
    <div class="card bg-white rounded-xl p-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center"><i class="fas fa-random text-purple-600 text-xl"></i></div>
        <div><h2 class="text-xl font-bold text-gray-800">Gerar Nova Rodada</h2><p class="text-sm text-gray-500">Sorteio automático por classe</p></div>
      </div>
      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="p-3 bg-blue-50 rounded-lg text-center"><p class="text-xs text-blue-600 font-medium">Limite Jogos</p><p class="font-bold text-blue-800">\${config.limite_jogos_aberto_por_jogador||3}</p></div>
        <div class="p-3 bg-green-50 rounded-lg text-center"><p class="text-xs text-green-600 font-medium">Quadras</p><p class="font-bold text-green-800">\${config.limite_quadras||4}</p></div>
        <div class="p-3 bg-purple-50 rounded-lg text-center"><p class="text-xs text-purple-600 font-medium">Formato</p><p class="font-bold text-purple-800 text-xs">\${fmtSet}</p></div>
      </div>
      \${formGroup('Classe para Sortear',\`<select id="sorteio-classe" class="\${sc()} text-base py-3"><option value="">-- Selecione --</option>\${classes.map(cl=>'<option value="'+cl.id+'">'+cl.nome+'</option>').join('')}</select>\`,true)}
      <div id="sorteio-preview" class="hidden p-4 bg-gray-50 rounded-lg mb-4"></div>
      <button id="btn-sortear" onclick="executarSorteio()" class="btn w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
        <i class="fas fa-dice"></i> Realizar Sorteio
      </button>
    </div>
    <div id="sorteio-resultado" class="hidden"></div>
  </div>\`)

  document.getElementById('sorteio-classe').addEventListener('change',async(e)=>{
    const cId=e.target.value
    if(!cId){document.getElementById('sorteio-preview').classList.add('hidden');return}
    try{
      const jRes=await api.get('/admin/clube/jogadores?status=ATIVO&classe_id='+cId)
      const jogadores=jRes.data.data||[];const lim=config.limite_jogos_aberto_por_jogador||3
      const el=jogadores.filter(j=>j.jogos_abertos<lim&&!j.inadimplente)
      const excl=jogadores.filter(j=>j.jogos_abertos>=lim||j.inadimplente)
      const pares=Math.floor(el.length/2)
      document.getElementById('sorteio-preview').innerHTML=\`
        <div class="grid grid-cols-3 gap-2 text-center mb-3">
          <div class="p-2 bg-white rounded-lg"><p class="text-xl font-bold text-gray-800">\${jogadores.length}</p><p class="text-xs text-gray-500">Total</p></div>
          <div class="p-2 bg-green-50 rounded-lg"><p class="text-xl font-bold text-green-700">\${el.length}</p><p class="text-xs text-green-600">Elegíveis</p></div>
          <div class="p-2 bg-red-50 rounded-lg"><p class="text-xl font-bold text-red-600">\${excl.length}</p><p class="text-xs text-red-500">Excluídos</p></div>
        </div>
        <p class="text-sm text-center \${pares>=1?'text-green-700':'text-red-600'} font-medium">
          \${pares>=1?'✓ '+pares+' confronto(s) serão gerados':'✗ Jogadores insuficientes'}
        </p>
        \${excl.length>0?'<div class="mt-2 text-xs text-gray-500"><p class="font-medium mb-1">Excluídos:</p>'+excl.map(j=>'<span class="inline-block bg-red-50 text-red-600 px-2 py-0.5 rounded mr-1 mb-1">'+j.nome+' ('+j.jogos_abertos+' abertos'+(j.inadimplente?' | inadimp.':'')+')</span>').join('')+'</div>':''}
      \`
      document.getElementById('sorteio-preview').classList.remove('hidden')
    }catch(e){}
  })
}

async function executarSorteio(){
  const cId=document.getElementById('sorteio-classe').value
  if(!cId){toast('Selecione uma classe','warning');return}
  const btn=document.getElementById('btn-sortear')
  btn.innerHTML='<div class="spinner mx-auto" style="width:20px;height:20px;border-width:2px"></div>';btn.disabled=true
  try{
    const res=await api.post('/admin/clube/sorteios',{classe_id:cId});const d=res.data.data
    toast('🎾 Rodada #'+d.rodada.numero+' gerada com '+d.rodada.total_partidas+' confrontos!','success',5000)
    document.getElementById('sorteio-resultado').innerHTML=\`<div class="card bg-white rounded-xl p-5 fade-in">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><i class="fas fa-check text-green-600"></i></div>
        <div><h3 class="font-bold text-gray-800">Rodada #\${d.rodada.numero} Gerada!</h3>
          <p class="text-sm text-gray-500">\${d.rodada.total_partidas} confrontos · \${d.jogadores_elegiveis} elegíveis · \${d.jogadores_excluidos} excluídos</p>
        </div>
      </div>
      <div class="space-y-2">
        \${d.partidas.map((p,i)=>\`<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <span class="text-sm text-gray-400 w-5 text-center font-mono">\${i+1}</span>
          <div class="flex-1 flex items-center justify-between">
            <span class="font-semibold text-sm">\${p.jogador_a_nome}</span>
            <span class="text-xs text-gray-400 px-2">VS</span>
            <span class="font-semibold text-sm">\${p.jogador_b_nome}</span>
          </div>
        </div>\`).join('')}
      </div>
      <div class="flex gap-3 mt-4">
        <button onclick="notificarRodada('\${d.rodada.id}')" class="btn flex-1 border border-green-200 text-green-700 py-2 rounded-lg text-sm hover:bg-green-50"><i class="fas fa-bell mr-1"></i>Notificar</button>
        <button onclick="navigateTo('partidas')" class="btn flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">Ver Partidas</button>
      </div>
    </div>\`
    document.getElementById('sorteio-resultado').classList.remove('hidden')
  }catch(e){toast(e.response?.data?.error||'Erro no sorteio','error',5000)}
  btn.innerHTML='<i class="fas fa-dice mr-2"></i>Realizar Sorteio';btn.disabled=false
}

async function notificarRodada(rodadaId){
  try{const r=await api.post('/admin/clube/notificacoes/nova-rodada',{rodada_id:rodadaId});toast('✅ '+r.data.data.notificacoes_enviadas+' notificações enviadas!')}
  catch(e){toast(e.response?.data?.error||'Erro ao notificar','error')}
}

// ============================================================
// RODADAS
// ============================================================
async function renderRodadas(){
  const res=await api.get('/admin/clube/rodadas');const rodadas=res.data.data||[]
  const isAdmin=State.user.perfil!=='JOGADOR'
  if(State.user.perfil==='JOGADOR'){
    const r2=await api.get('/jogador/rodadas');const rodadas2=r2.data.data||[]
    setContent(\`<div class="card bg-white rounded-xl overflow-hidden">
      <div class="p-4 border-b"><h3 class="font-bold text-gray-800">Rodadas</h3></div>
      \${rodadas2.length===0?'<p class="text-center text-gray-400 py-12">Nenhuma rodada</p>':'<div class="divide-y divide-gray-50">'+rodadas2.map(r=>\`<div class="p-4 hover:bg-gray-50 cursor-pointer" onclick="verRodada('\${r.id}')">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><span class="font-bold text-purple-700 text-sm">#\${r.numero}</span></div>
            <div><p class="font-semibold text-sm">#\${r.numero} — \${r.classe_nome}</p><p class="text-xs text-gray-400">\${r.total_partidas} partidas · \${fmtDate(r.data_execucao)}</p></div>
          </div>
          \${statusBadge(r.status)}
        </div>
      </div>\`).join('')+'</div>'}
    </div>\`)
    return
  }
  setContent(\`<div class="space-y-4">
    <div class="card bg-white rounded-xl overflow-hidden">
      <div class="p-4 border-b flex items-center justify-between"><h3 class="font-bold text-gray-800">Rodadas</h3><span class="badge badge-blue">\${rodadas.length}</span></div>
      \${rodadas.length===0?'<p class="text-center text-gray-400 py-12">Nenhuma rodada gerada</p>':\`<div class="divide-y divide-gray-50">
        \${rodadas.map(r=>\`<div class="p-4 hover:bg-gray-50 cursor-pointer" onclick="verRodada('\${r.id}')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><span class="font-bold text-purple-700 text-sm">#\${r.numero}</span></div>
              <div><p class="font-semibold text-sm">#\${r.numero} — \${r.classe_nome}</p>
                <p class="text-xs text-gray-400">\${r.total_partidas} partidas · \${r.executado_por_nome} · \${fmtDate(r.data_execucao)}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">\${statusBadge(r.status)}<i class="fas fa-chevron-right text-gray-300 text-sm"></i></div>
          </div>
        </div>\`).join('')}
      </div>\`}
    </div>
  </div>\`)
}

async function verRodada(id){
  const res=await api.get('/admin/clube/rodadas/'+id);const{rodada,partidas}=res.data.data
  showModal('Rodada #'+rodada.numero+' — '+rodada.classe_nome,\`
    <div class="flex flex-wrap gap-2 mb-4">\${statusBadge(rodada.status)}<span class="badge badge-blue">\${rodada.total_partidas} partidas</span><span class="badge badge-green">\${rodada.total_jogadores_elegiveis} elegíveis</span>\${rodada.total_jogadores_excluidos>0?'<span class="badge badge-red">'+rodada.total_jogadores_excluidos+' excluídos</span>':''}</div>
    <div class="space-y-2 max-h-80 overflow-y-auto">
      \${partidas.map((p,i)=>\`<div class="p-3 bg-gray-50 rounded-lg">
        <div class="flex items-center justify-between"><span class="text-xs text-gray-400">#\${i+1}</span>\${statusBadge(p.status)}</div>
        <div class="flex items-center justify-between mt-1">
          <span class="font-medium text-sm \${p.vencedor_id===p.jogador_a_id?'text-green-700':''}">\${p.jogador_a_nome}</span>
          <span class="text-xs text-gray-400">\${p.placar_a&&p.placar_b?p.placar_a+' × '+p.placar_b:'VS'}</span>
          <span class="font-medium text-sm \${p.vencedor_id===p.jogador_b_id?'text-green-700':''}">\${p.jogador_b_nome}</span>
        </div>
        \${p.vencedor_nome?'<p class="text-xs text-green-600 text-center mt-1">🏆 '+p.vencedor_nome+'</p>':''}
      </div>\`).join('')}
    </div>
  \`,null)
}

// ============================================================
// PARTIDAS
// ============================================================
async function renderPartidas(){
  const[pRes,clRes]=await Promise.all([api.get('/admin/clube/partidas?limit=100'),api.get('/admin/clube/classes?status=ATIVA')])
  const partidas=pRes.data.data||[];const classes=clRes.data.data||[]
  setContent(\`<div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <select id="f-st-p" class="\${sc()} w-44" onchange="filtrarP()">
        <option value="">Todos status</option><option value="PENDENTE">Pendente</option><option value="EM_ANDAMENTO">Em Andamento</option>
        <option value="FINALIZADA">Finalizada</option><option value="WO">W.O.</option><option value="CANCELADA">Cancelada</option>
      </select>
      <select id="f-cl-p" class="\${sc()} w-40" onchange="filtrarP()">
        <option value="">Todas classes</option>\${classes.map(cl=>'<option value="'+cl.id+'">'+cl.nome+'</option>').join('')}
      </select>
    </div>
    <div class="card bg-white rounded-xl overflow-hidden">
      <table class="w-full text-sm" id="tabela-p">
        <thead class="bg-gray-50"><tr>
          <th class="text-left px-4 py-3 text-gray-600 font-semibold">Confronto</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Classe / Rodada</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Data Limite</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Status</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Ações</th>
        </tr></thead>
        <tbody>
          \${partidas.length===0?'<tr><td colspan="5" class="text-center py-12 text-gray-400">Nenhuma partida</td></tr>':
          partidas.map(p=>\`<tr class="table-row border-b border-gray-50" data-status="\${p.status}" data-classe="\${p.classe_id}">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-800 text-sm \${p.vencedor_id===p.jogador_a_id?'text-green-700':''}">\${p.jogador_a_nome}</span>
                <span class="text-gray-400 text-xs">×</span>
                <span class="font-semibold text-gray-800 text-sm \${p.vencedor_id===p.jogador_b_id?'text-green-700':''}">\${p.jogador_b_nome}</span>
              </div>
              \${p.placar_a&&p.placar_b?'<p class="text-xs text-gray-400">'+p.placar_a+' × '+p.placar_b+'</p>':''}
              \${p.vencedor_nome?'<p class="text-xs text-green-600">🏆 '+p.vencedor_nome+'</p>':''}
            </td>
            <td class="px-4 py-3 text-center hidden sm:table-cell"><span class="badge badge-blue">\${p.classe_nome}</span>\${p.rodada_numero?'<p class="text-xs text-gray-400 mt-0.5">Rd #'+p.rodada_numero+'</p>':''}</td>
            <td class="px-4 py-3 text-center hidden md:table-cell text-xs text-gray-500">\${fmtDateOnly(p.data_limite)}</td>
            <td class="px-4 py-3 text-center">\${statusBadge(p.status)}</td>
            <td class="px-4 py-3 text-center">
              \${['PENDENTE','EM_ANDAMENTO'].includes(p.status)?'<button onclick="modalPartida(\''+p.id+'\','+JSON.stringify(p).replace(/'/g,'&apos;')+')" class="btn p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><i class="fas fa-edit"></i></button>':'<span class="text-gray-300 text-xs">-</span>'}
            </td>
          </tr>\`).join('')}
        </tbody>
      </table>
    </div>
  </div>\`)
}

function filtrarP(){const s=document.getElementById('f-st-p')?.value;const c=document.getElementById('f-cl-p')?.value;document.querySelectorAll('#tabela-p tbody tr[data-status]').forEach(r=>r.style.display=(!s||r.dataset.status===s)&&(!c||r.dataset.classe===c)?'':'none')}

function modalPartida(id,p){
  showModal('Atualizar Partida',\`
    <div class="mb-4 p-3 bg-gray-50 rounded-lg text-center"><p class="font-semibold text-gray-800">\${p.jogador_a_nome} vs \${p.jogador_b_nome}</p></div>
    \${formGroup('Status',\`<select id="f-st" class="\${sc()}"><option value="PENDENTE"\${p.status==='PENDENTE'?' selected':''}>Pendente</option><option value="EM_ANDAMENTO"\${p.status==='EM_ANDAMENTO'?' selected':''}>Em Andamento</option><option value="FINALIZADA">Finalizada</option><option value="WO">W.O.</option><option value="CANCELADA">Cancelada</option></select>\`)}
    \${formGroup('Vencedor',\`<select id="f-ven" class="\${sc()}"><option value="">-- Sem vencedor --</option><option value="\${p.jogador_a_id}">\${p.jogador_a_nome}</option><option value="\${p.jogador_b_id}">\${p.jogador_b_nome}</option></select>\`)}
    <div class="grid grid-cols-2 gap-3">
      \${formGroup('Placar A',\`<input type="text" id="f-pa" class="\${ic()}" value="\${p.placar_a||''}" placeholder="6-3">\`)}
      \${formGroup('Placar B',\`<input type="text" id="f-pb" class="\${ic()}" value="\${p.placar_b||''}" placeholder="3-6">\`)}
    </div>
    \${formGroup('Data/Hora Agendada',\`<input type="datetime-local" id="f-agenda" class="\${ic()}">\`)}
    \${formGroup('Quadra',\`<input type="text" id="f-quadra" class="\${ic()}" value="\${p.quadra||''}" placeholder="Quadra 1">\`)}
    \${formGroup('Observações',\`<textarea id="f-obs" class="\${ic()}" rows="2">\${p.observacoes||''}</textarea>\`)}
  \`,async()=>{
    try{await api.patch('/admin/clube/partidas/'+id,{status:document.getElementById('f-st').value,vencedor_id:document.getElementById('f-ven').value||null,placar_a:document.getElementById('f-pa').value,placar_b:document.getElementById('f-pb').value,data_agendada:document.getElementById('f-agenda').value||null,quadra:document.getElementById('f-quadra').value,observacoes:document.getElementById('f-obs').value});closeModal();toast('Partida atualizada!');renderPartidas()}
    catch(e){toast(e.response?.data?.error||'Erro','error')}
  },'Salvar')
}

// ============================================================
// RANKING
// ============================================================
async function renderRanking(){
  const clRes=await api.get(State.user.perfil==='JOGADOR'?'/jogador/ranking':'/admin/clube/classes?status=ATIVA')
  if(State.user.perfil==='JOGADOR'){
    const jogadores=clRes.data.data||[]
    setContent(\`<div class="space-y-3">
      \${jogadores.map((j,i)=>\`<div class="card bg-white rounded-xl flex items-center gap-3 p-4 \${i<3?'border-l-4 '+(i===0?'border-yellow-400':i===1?'border-gray-400':'border-orange-500'):''}">
        <div class="w-10 h-10 flex items-center justify-center font-bold text-xl">\${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div>
        <div class="flex-1"><p class="font-bold text-gray-800">\${j.nome}</p><p class="text-xs text-gray-500">\${j.classe_nome} · \${j.vitorias||0} vitórias · \${j.jogos_realizados||0} jogos</p></div>
        <div class="text-right"><p class="text-2xl font-bold text-green-700">\${j.pontos_total||0}</p><p class="text-xs text-gray-400">pts</p></div>
      </div>\`).join('')||'<p class="text-center text-gray-400 py-12">Sem dados</p>'}
    </div>\`)
    return
  }
  const classes=clRes.data.data||[]
  let classeId=classes[0]?.id||''
  const renderLista=async(cId)=>{
    if(!cId)return
    const r=await api.get('/admin/clube/ranking?classe_id='+cId);const jogs=r.data.data||[]
    document.getElementById('rank-lista').innerHTML=jogs.length===0?'<p class="text-center text-gray-400 py-8">Sem jogadores</p>':
      jogs.map((j,i)=>\`<div class="flex items-center gap-3 p-3 \${i===0?'bg-yellow-50 border border-yellow-200':i===1?'bg-gray-50 border border-gray-200':i===2?'bg-orange-50 border border-orange-200':'bg-white border border-gray-100'} rounded-xl mb-2">
        <div class="w-10 h-10 flex items-center justify-center font-bold">\${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div>
        <div class="flex-1">
          <p class="font-bold text-gray-800">\${j.nome}\${j.inadimplente?'<span class="badge badge-red ml-2 text-xs">Inadimp.</span>':''}</p>
          <p class="text-xs text-gray-500">\${j.total_jogos||0} jogos · \${j.vitorias||0} vitórias · \${j.derrotas||0} derrotas</p>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold \${i<3?'text-green-700':'text-gray-700'}">\${j.pontos_total||0}</p>
          <p class="text-xs text-gray-400">pts</p>
        </div>
        \${j.jogos_abertos>0?'<div class="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center"><span class="text-xs font-bold text-orange-600">'+j.jogos_abertos+'</span></div>':''}
      </div>\`).join('')
  }
  setContent(\`<div class="space-y-4">
    <div class="flex items-center gap-3">
      <select id="rank-cl" class="\${sc()} w-52" onchange="atualizarRanking()">
        \${classes.map(cl=>'<option value="'+cl.id+'">'+cl.nome+'</option>').join('')}
      </select>
      <button onclick="atualizarRanking()" class="btn bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"><i class="fas fa-sync mr-1"></i>Atualizar</button>
    </div>
    <div class="card bg-white rounded-xl p-5">
      <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-trophy text-yellow-500"></i>Ranking</h3>
      <div id="rank-lista"><div class="flex justify-center py-8"><div class="spinner"></div></div></div>
    </div>
  </div>\`)
  window.atualizarRanking=()=>renderLista(document.getElementById('rank-cl')?.value)
  document.getElementById('rank-cl').addEventListener('change',e=>renderLista(e.target.value))
  await renderLista(classeId)
}

// ============================================================
// CONFIGURAÇÕES COMPLETAS
// ============================================================
async function renderConfiguracoes(){
  const res=await api.get('/admin/clube/configuracoes');const c=res.data.data||{}
  setContent(\`<div class="max-w-3xl mx-auto space-y-6">
    <div class="card bg-white rounded-xl p-6">
      <h2 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><i class="fas fa-cog text-green-600"></i>Configurações do Clube</h2>
      
      <div class="space-y-6">
        <!-- Sorteios -->
        <div class="border-b pb-5">
          <h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-random text-purple-500"></i>Sorteios</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            \${formGroup('Periodicidade (dias)',\`<input type="number" id="f-period" class="\${ic()}" value="\${c.periodicidade_sorteio||7}" min="1">\`)}
            \${formGroup('Máx. Jogos Abertos/Jogador',\`<input type="number" id="f-limite" class="\${ic()}" value="\${c.limite_jogos_aberto_por_jogador||3}" min="1">\`)}
            \${formGroup('Limite Quadras',\`<input type="number" id="f-quadras" class="\${ic()}" value="\${c.limite_quadras||4}" min="1">\`)}
          </div>
          <div class="grid grid-cols-2 gap-4 mt-2">
            \${formGroup('Formato de Set',\`<select id="f-fset" class="\${sc()}"><option value="3SETS"\${c.formato_set==='3SETS'?' selected':''}>3 Sets (3° Tie-break)</option><option value="SET_PRO"\${c.formato_set==='SET_PRO'?' selected':''}>Set Pro (com vantagem)</option></select>\`)}
            \${formGroup('Dias para W.O.',\`<input type="number" id="f-wo-dias" class="\${ic()}" value="\${c.dias_para_wo||14}" min="1">\`)}
          </div>
          <div class="flex items-center gap-3 mt-2 p-3 bg-gray-50 rounded-lg">
            <input type="checkbox" id="f-desafio" class="w-4 h-4 text-green-600" \${c.desafio_ativo?'checked':''}>
            <label for="f-desafio" class="text-sm font-medium text-gray-700">Ativar funcionalidade de Desafio entre jogadores</label>
          </div>
        </div>
        
        <!-- Pontuação -->
        <div class="border-b pb-5">
          <h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-star text-yellow-500"></i>Pontuação</h3>
          <div class="grid grid-cols-3 gap-4">
            \${formGroup('Pts Vitória',\`<input type="number" id="f-pts-v" class="\${ic()}" value="\${c.pontos_vitoria||3}" min="0">\`)}
            \${formGroup('Pts Derrota',\`<input type="number" id="f-pts-d" class="\${ic()}" value="\${c.pontos_derrota||1}" min="0">\`)}
            \${formGroup('Pts W.O. (ganho)',\`<input type="number" id="f-pts-wo" class="\${ic()}" value="\${c.pontos_wo||0}" min="0">\`)}
          </div>
        </div>
        
        <!-- Inadimplência -->
        <div class="border-b pb-5">
          <h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-ban text-red-500"></i>Controle de Inadimplência</h3>
          <div class="grid grid-cols-2 gap-4">
            \${formGroup('Dias p/ Bloqueio Ranking',\`<input type="number" id="f-inadimp-bl" class="\${ic()}" value="\${c.dias_inadimplencia_bloqueio||10}" min="1">\`)}
            \${formGroup('Dias p/ Inativar Cadastro',\`<input type="number" id="f-inadimp-in" class="\${ic()}" value="\${c.dias_inadimplencia_inativacao||20}" min="1">\`)}
          </div>
          <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mt-2 text-sm text-yellow-800">
            <i class="fas fa-info-circle mr-1"></i>Com <strong>\${c.dias_inadimplencia_bloqueio||10} dias</strong> de atraso: bloqueado do ranking. Com <strong>\${c.dias_inadimplencia_inativacao||20} dias</strong>: cadastro inativado.
          </div>
        </div>
        
        <!-- Pagamentos -->
        <div class="border-b pb-5">
          <h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-dollar-sign text-green-500"></i>Pagamentos</h3>
          <div class="grid grid-cols-2 gap-4">
            \${formGroup('Valor Mensalidade (R$)',\`<input type="number" id="f-mensalidade" class="\${ic()}" value="\${c.valor_mensalidade||0}" min="0" step="0.01">\`)}
            \${formGroup('Chave Pix',\`<input type="text" id="f-pix" class="\${ic()}" value="\${c.pix_chave||''}" placeholder="CPF, email, telefone, chave aleatória">\`)}
          </div>
          \${formGroup('Nome do Titular Pix',\`<input type="text" id="f-pix-titular" class="\${ic()}" value="\${c.pix_titular||''}">\`)}
        </div>
        
        <!-- Notificações -->
        <div class="border-b pb-5">
          <h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-bell text-blue-500"></i>Notificações</h3>
          <div class="space-y-3">
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input type="checkbox" id="f-whats" class="w-4 h-4 text-green-600" \${c.whatsapp_notificacoes?'checked':''}>
              <i class="fab fa-whatsapp text-green-500"></i>
              <label for="f-whats" class="text-sm font-medium text-gray-700">Notificações por WhatsApp</label>
            </div>
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input type="checkbox" id="f-email-not" class="w-4 h-4 text-green-600" \${c.email_notificacoes?'checked':''}>
              <i class="fas fa-envelope text-blue-500"></i>
              <label for="f-email-not" class="text-sm font-medium text-gray-700">Notificações por Email</label>
            </div>
          </div>
        </div>
        
        <!-- Redes Sociais -->
        <div class="pb-5">
          <h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-share-alt text-pink-500"></i>Redes Sociais</h3>
          <div class="grid grid-cols-2 gap-4">
            \${formGroup('Instagram',\`<div class="flex"><span class="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm"><i class="fab fa-instagram"></i></span><input type="text" id="f-insta" class="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 text-sm" value="\${c.instagram_url||''}" placeholder="@clube"></div>\`)}
            \${formGroup('Facebook',\`<div class="flex"><span class="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm"><i class="fab fa-facebook"></i></span><input type="text" id="f-face" class="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 text-sm" value="\${c.facebook_url||''}" placeholder="pagina-do-clube"></div>\`)}
          </div>
        </div>
        
        <button onclick="salvarConfiguracoes()" class="btn w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
          <i class="fas fa-save"></i> Salvar Todas as Configurações
        </button>
      </div>
    </div>
  </div>\`)
}

async function salvarConfiguracoes(){
  try{
    await api.put('/admin/clube/configuracoes',{
      periodicidade_sorteio:parseInt(document.getElementById('f-period').value),
      limite_jogos_aberto_por_jogador:parseInt(document.getElementById('f-limite').value),
      limite_quadras:parseInt(document.getElementById('f-quadras').value),
      formato_set:document.getElementById('f-fset').value,
      desafio_ativo:document.getElementById('f-desafio').checked,
      dias_para_wo:parseInt(document.getElementById('f-wo-dias').value),
      pontos_vitoria:parseInt(document.getElementById('f-pts-v').value),
      pontos_derrota:parseInt(document.getElementById('f-pts-d').value),
      pontos_wo:parseInt(document.getElementById('f-pts-wo').value),
      dias_inadimplencia_bloqueio:parseInt(document.getElementById('f-inadimp-bl').value),
      dias_inadimplencia_inativacao:parseInt(document.getElementById('f-inadimp-in').value),
      valor_mensalidade:parseFloat(document.getElementById('f-mensalidade').value)||0,
      pix_chave:document.getElementById('f-pix').value,
      pix_titular:document.getElementById('f-pix-titular').value,
      whatsapp_notificacoes:document.getElementById('f-whats').checked,
      email_notificacoes:document.getElementById('f-email-not').checked,
      instagram_url:document.getElementById('f-insta').value,
      facebook_url:document.getElementById('f-face').value
    });toast('Configurações salvas!')
  }catch(e){toast(e.response?.data?.error||'Erro','error')}
}

// ============================================================
// PAGAMENTOS (ADMIN CLUBE)
// ============================================================
async function renderPagamentos(){
  const[pgRes,resRes]=await Promise.all([api.get('/admin/clube/pagamentos?limit=100'),api.get('/admin/clube/pagamentos/resumo')])
  const pagamentos=pgRes.data.data.items||[];const resumo=resRes.data.data||{}
  setContent(\`<div class="space-y-5">
    <!-- Resumo -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      \${statCard('check-circle','Adimplentes',resumo.adimplentes,'green')}
      \${statCard('clock','A Vencer',resumo.a_vencer,'blue')}
      \${statCard('exclamation-circle','Vencidos',resumo.vencidos,'red')}
      \${statCard('dollar-sign','Arrecadado',fmtMoeda(resumo.total_arrecadado),'green')}
    </div>
    \${resumo.vencendo_breve>0?'<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800"><i class="fas fa-clock mr-1"></i><strong>'+resumo.vencendo_breve+' pagamentos</strong> vencem nos próximos 7 dias!</div>':''}
    
    <!-- Ações -->
    <div class="flex flex-wrap gap-3">
      <button onclick="modalGerarLote()" class="btn bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"><i class="fas fa-layer-group"></i> Gerar Cobranças em Lote</button>
      <button onclick="verificarInadimplencia()" class="btn bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 flex items-center gap-2"><i class="fas fa-ban"></i> Verificar Inadimplência</button>
    </div>
    
    <!-- Top inadimplentes -->
    \${resumo.top_inadimplentes&&resumo.top_inadimplentes.length>0?\`<div class="card bg-white rounded-xl p-4">
      <h3 class="font-bold text-gray-800 mb-3 flex items-center gap-2"><i class="fas fa-exclamation-triangle text-red-500"></i>Principais Inadimplentes</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm">
        <thead class="bg-gray-50"><tr><th class="text-left px-3 py-2 text-gray-600">Jogador</th><th class="text-center px-3 py-2 text-gray-600">Ref.</th><th class="text-center px-3 py-2 text-gray-600">Venc.</th><th class="text-center px-3 py-2 text-gray-600">Atraso</th><th class="text-center px-3 py-2 text-gray-600">Valor</th></tr></thead>
        <tbody>\${resumo.top_inadimplentes.map(i=>\`<tr class="border-b border-gray-50 inadimplente-row">
          <td class="px-3 py-2 font-medium text-gray-800">\${i.nome}</td>
          <td class="px-3 py-2 text-center text-gray-600">\${i.referencia}</td>
          <td class="px-3 py-2 text-center text-xs text-gray-500">\${fmtDateOnly(i.data_vencimento)}</td>
          <td class="px-3 py-2 text-center"><span class="badge badge-red">\${i.dias_atraso}d</span></td>
          <td class="px-3 py-2 text-center font-bold text-red-600">\${fmtMoeda(i.valor)}</td>
        </tr>\`).join('')}</tbody>
      </table></div>
    </div>\`:''}
    
    <!-- Tabela completa -->
    <div class="card bg-white rounded-xl overflow-hidden">
      <div class="p-4 border-b flex items-center justify-between">
        <h3 class="font-bold text-gray-800">Cobranças</h3>
        <div class="flex gap-2">
          <select id="f-pg-st" class="\${sc()} w-36" onchange="filtrarPg()">
            <option value="">Todos</option><option value="PENDENTE">Pendente</option><option value="PAGO">Pago</option><option value="VENCIDO">Vencido</option>
          </select>
        </div>
      </div>
      <table class="w-full text-sm" id="tabela-pg">
        <thead class="bg-gray-50"><tr>
          <th class="text-left px-4 py-3 text-gray-600 font-semibold">Jogador</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Referência</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Vencimento</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Valor</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Status</th>
          <th class="text-center px-4 py-3 text-gray-600 font-semibold">Ações</th>
        </tr></thead>
        <tbody>
          \${pagamentos.length===0?'<tr><td colspan="6" class="text-center py-8 text-gray-400">Nenhuma cobrança</td></tr>':
          pagamentos.map(p=>\`<tr class="table-row border-b border-gray-50 \${p.status==='VENCIDO'?'inadimplente-row':''}" data-st="\${p.status}">
            <td class="px-4 py-3"><p class="font-medium text-gray-800">\${p.jogador_nome}</p><p class="text-xs text-gray-400">\${p.classe_nome||''}</p></td>
            <td class="px-4 py-3 text-center text-gray-600">\${p.referencia}</td>
            <td class="px-4 py-3 text-center text-xs text-gray-500">\${fmtDateOnly(p.data_vencimento)}\${p.data_pagamento?'<br><span class="text-green-600">Pago: '+fmtDateOnly(p.data_pagamento)+'</span>':''}</td>
            <td class="px-4 py-3 text-center font-bold text-gray-800">\${fmtMoeda(p.valor)}</td>
            <td class="px-4 py-3 text-center">\${statusBadge(p.status)}</td>
            <td class="px-4 py-3 text-center">
              \${p.status!=='PAGO'?'<button onclick="modalRegistrarPgto(\''+p.id+'\',\''+p.jogador_nome+'\',\''+p.referencia+'\','+p.valor+')" class="btn p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Registrar pagamento"><i class="fas fa-check-circle"></i></button>':'<i class="fas fa-check text-green-500"></i>'}
            </td>
          </tr>\`).join('')}
        </tbody>
      </table>
    </div>
  </div>\`)
}

function filtrarPg(){const s=document.getElementById('f-pg-st')?.value;document.querySelectorAll('#tabela-pg tbody tr[data-st]').forEach(r=>r.style.display=!s||r.dataset.st===s?'':'none')}

function modalGerarLote(){showModal('Gerar Cobranças em Lote',\`
  \${formGroup('Referência (mês/ano)',\`<input type="text" id="f-ref" class="\${ic()}" placeholder="2025-06">\`,true)}
  \${formGroup('Data de Vencimento',\`<input type="date" id="f-venc" class="\${ic()}">\`,true)}
  <p class="text-sm text-gray-500 mt-2">Será gerada uma cobrança para todos os jogadores ativos com o valor de mensalidade configurado.</p>
\`,async()=>{
  try{const r=await api.post('/admin/clube/pagamentos/lote',{referencia:document.getElementById('f-ref').value,data_vencimento:document.getElementById('f-venc').value});closeModal();toast(r.data.message||'Cobranças geradas!');renderPagamentos()}
  catch(e){toast(e.response?.data?.error||'Erro','error')}
})}

function modalRegistrarPgto(id,nome,ref,valor){showModal('Registrar Pagamento',\`
  <p class="text-gray-700 mb-4">Registrar pagamento de <strong>\${nome}</strong> ref: <strong>\${ref}</strong></p>
  <p class="text-2xl font-bold text-green-700 text-center mb-4">\${fmtMoeda(valor)}</p>
  \${formGroup('Método de Pagamento',\`<select id="f-met" class="\${sc()}"><option value="PIX">Pix</option><option value="CARTAO_CREDITO">Cartão de Crédito</option><option value="CARTAO_DEBITO">Cartão de Débito</option><option value="DINHEIRO">Dinheiro</option><option value="ISENTO">Isento</option></select>\`)}
  \${formGroup('Código/Comprovante',\`<input type="text" id="f-cod" class="\${ic()}" placeholder="Opcional">\`)}
\`,async()=>{
  try{await api.patch('/admin/clube/pagamentos/'+id,{status:'PAGO',metodo_pagamento:document.getElementById('f-met').value,codigo_transacao:document.getElementById('f-cod').value});closeModal();toast('Pagamento registrado!');renderPagamentos()}
  catch(e){toast(e.response?.data?.error||'Erro','error')}
},'Confirmar Pagamento')}

async function verificarInadimplencia(){
  confirmAction('Deseja verificar e aplicar regras de inadimplência para todos os jogadores?',async()=>{
    try{const r=await api.post('/admin/clube/pagamentos/verificar-inadimplencia');closeModal();toast('✅ Verificação: '+r.data.data.bloqueados+' bloqueados, '+r.data.data.inativados+' inativados','info',5000);renderPagamentos()}
    catch(e){toast(e.response?.data?.error||'Erro','error')}
  },false)
}

// ============================================================
// NOTIFICAÇÕES
// ============================================================
async function renderNotificacoes(){
  const res=await api.get('/admin/clube/notificacoes');const nots=res.data.data||[]
  setContent(\`<div class="space-y-4">
    <div class="card bg-white rounded-xl p-5">
      <h3 class="font-bold text-gray-800 mb-4"><i class="fas fa-paper-plane text-blue-500 mr-2"></i>Enviar Aviso Geral</h3>
      <div class="space-y-3">
        \${formGroup('Mensagem',\`<textarea id="aviso-msg" class="\${ic()}" rows="3" placeholder="Mensagem para todos os jogadores..."></textarea>\`)}
        <button onclick="enviarAvisoGeral()" class="btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><i class="fas fa-broadcast-tower"></i> Enviar para Todos</button>
      </div>
    </div>
    <div class="card bg-white rounded-xl overflow-hidden">
      <div class="p-4 border-b"><h3 class="font-bold text-gray-800">Histórico de Notificações</h3></div>
      <div class="divide-y divide-gray-50">
        \${nots.length===0?'<p class="text-center text-gray-400 py-8">Nenhuma notificação enviada</p>':
        nots.map(n=>\`<div class="flex items-start gap-3 p-4">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 \${n.canal==='WHATSAPP'?'bg-green-100':'bg-blue-100'}">
            <i class="\${n.canal==='WHATSAPP'?'fab fa-whatsapp text-green-600':'fas fa-envelope text-blue-600'} text-sm"></i>
          </div>
          <div class="flex-1">
            <div class="flex items-start justify-between">
              <p class="text-sm font-medium text-gray-800">\${n.tipo.replace(/_/g,' ')}</p>
              <span class="badge \${n.status==='ENVIADO'?'badge-green':'badge-yellow'} text-xs">\${n.status}</span>
            </div>
            <p class="text-xs text-gray-500">\${n.destinatario} · \${fmtDate(n.created_at)}</p>
            <p class="text-xs text-gray-400 mt-0.5 truncate">\${n.mensagem.substring(0,80)}...</p>
          </div>
        </div>\`).join('')}
      </div>
    </div>
  </div>\`)
}

async function enviarAvisoGeral(){
  const msg=document.getElementById('aviso-msg')?.value
  if(!msg){toast('Digite uma mensagem','warning');return}
  try{const r=await api.post('/admin/clube/notificacoes/aviso-geral',{mensagem:msg});toast('✅ '+r.data.data.enviados+' notificações enviadas!');renderNotificacoes()}
  catch(e){toast(e.response?.data?.error||'Erro','error')}
}

// ============================================================
// PUBLICAÇÕES
// ============================================================
async function renderPublicacoes(isAdmin){
  const res=await api.get('/publicacoes?limit=30');const pubs=res.data.data||[]
  const config=isAdmin?await api.get('/admin/clube/configuracoes').then(r=>r.data.data).catch(()=>({})):{}
  setContent(\`<div class="space-y-4">
    <div class="flex items-center justify-between">
      \${config.instagram_url||config.facebook_url?\`<div class="flex gap-2">
        \${config.instagram_url?'<a href="https://instagram.com/'+config.instagram_url.replace('@','')+'" target="_blank" class="btn px-3 py-2 bg-pink-100 text-pink-700 rounded-lg text-sm hover:bg-pink-200 flex items-center gap-1"><i class="fab fa-instagram"></i> Instagram</a>':''}
        \${config.facebook_url?'<a href="https://facebook.com/'+config.facebook_url+'" target="_blank" class="btn px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 flex items-center gap-1"><i class="fab fa-facebook"></i> Facebook</a>':''}
      </div>\`:'<div></div>'}
      <button onclick="modalNovaPublicacao()" class="btn bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"><i class="fas fa-plus"></i> Nova Publicação</button>
    </div>
    <div class="space-y-4">
      \${pubs.length===0?'<div class="card bg-white rounded-xl p-12 text-center text-gray-400"><i class="fas fa-newspaper text-4xl mb-4 text-gray-300"></i><p>Nenhuma publicação</p></div>':
      pubs.map(p=>\`<div class="card bg-white rounded-xl p-5">
        \${p.fixado?'<div class="flex items-center gap-1 text-xs text-amber-600 mb-2 font-medium"><i class="fas fa-thumbtack"></i> Fixado</div>':''}
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="badge \${p.tipo==='AVISO'?'badge-yellow':p.tipo==='RESULTADO'?'badge-green':p.tipo==='EVENTO'?'badge-blue':'badge-gray'}">\${p.tipo}</span>
              <span class="text-xs text-gray-400">\${p.autor_nome} · \${fmtDate(p.created_at)}</span>
            </div>
            <h3 class="font-bold text-gray-800 mb-1">\${p.titulo}</h3>
            <p class="text-sm text-gray-600">\${p.conteudo}</p>
          </div>
          \${isAdmin?'<button onclick="excluirPublicacao(\''+p.id+'\')" class="btn p-2 text-red-400 hover:bg-red-50 rounded-lg ml-2"><i class="fas fa-trash"></i></button>':''}
        </div>
      </div>\`).join('')}
    </div>
  </div>\`)
}

function modalNovaPublicacao(){
  const isAdmin=State.user.perfil!=='JOGADOR'
  showModal('Nova Publicação',\`
    \${formGroup('Título',\`<input type="text" id="f-titulo" class="\${ic()}" placeholder="Título da publicação">\`,true)}
    \${formGroup('Conteúdo',\`<textarea id="f-conteudo" class="\${ic()}" rows="4" placeholder="Escreva o conteúdo..."></textarea>\`,true)}
    \${formGroup('Tipo',\`<select id="f-tipo" class="\${sc()}"><option value="AVISO">Aviso</option><option value="RESULTADO">Resultado</option><option value="EVENTO">Evento</option><option value="NOVIDADE">Novidade</option><option value="OUTRO">Outro</option></select>\`)}
    \${isAdmin?'<div class="flex items-center gap-2 mt-3"><input type="checkbox" id="f-fixar" class="w-4 h-4"><label for="f-fixar" class="text-sm text-gray-700">Fixar publicação</label></div>':''}
  \`,async()=>{
    try{await api.post('/publicacoes',{titulo:document.getElementById('f-titulo').value,conteudo:document.getElementById('f-conteudo').value,tipo:document.getElementById('f-tipo').value,fixado:document.getElementById('f-fixar')?.checked||false});closeModal();toast('Publicação criada!');renderPublicacoes(isAdmin)}
    catch(e){toast(e.response?.data?.error||'Erro','error')}
  })
}

async function excluirPublicacao(id){
  confirmAction('Deseja remover esta publicação?',async()=>{
    try{await api.delete('/publicacoes/'+id);closeModal();toast('Publicação removida');renderPublicacoes(State.user.perfil!=='JOGADOR')}
    catch(e){toast('Erro','error')}
  })
}

// ============================================================
// DESAFIOS
// ============================================================
async function renderDesafios(isAdmin){
  const[dRes,cfRes]=await Promise.all([api.get('/desafios?meus='+(!isAdmin?'1':'0')),isAdmin?api.get('/admin/clube/configuracoes').catch(()=>({data:{data:{}}})):Promise.resolve({data:{data:{}}})])
  const desafios=dRes.data.data||[];const config=cfRes.data.data||{}
  if(!isAdmin&&!config.desafio_ativo){setContent('<div class="card bg-white rounded-xl p-12 text-center text-gray-400"><i class="fas fa-bolt text-4xl mb-4 text-gray-300"></i><p class="font-medium">Desafios não estão disponíveis</p><p class="text-sm mt-1">Este recurso não está ativado pelo clube.</p></div>');return}
  setContent(\`<div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500">\${desafios.length} desafio(s)</p>
      \${!isAdmin?'<button onclick="modalNovoDesafio()" class="btn bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"><i class="fas fa-bolt"></i> Desafiar</button>':''}
    </div>
    <div class="card bg-white rounded-xl overflow-hidden">
      \${desafios.length===0?'<p class="text-center text-gray-400 py-12"><i class="fas fa-bolt text-3xl mb-3 block text-gray-300"></i>Nenhum desafio</p>':
      '<div class="divide-y divide-gray-50">'+desafios.map(d=>\`<div class="p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="font-semibold text-gray-800">\${d.desafiante_nome}</span>
              <i class="fas fa-bolt text-yellow-500 text-xs"></i>
              <span class="font-semibold text-gray-800">\${d.desafiado_nome}</span>
            </div>
            <p class="text-xs text-gray-500">\${d.classe_nome} · \${fmtDate(d.created_at)}</p>
            \${d.mensagem?'<p class="text-xs text-gray-600 mt-1 italic">"'+d.mensagem+'"</p>':''}
          </div>
          <div class="flex items-center gap-2">
            \${statusBadge(d.status)}
            \${d.status==='PENDENTE'&&!isAdmin?'<button onclick="responderDesafio(\''+d.id+'\',true)" class="btn bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700">Aceitar</button><button onclick="responderDesafio(\''+d.id+'\',false)" class="btn bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs hover:bg-red-200">Recusar</button>':''}
          </div>
        </div>
      </div>\`).join('')+'</div>'}
    </div>
  </div>\`)
}

async function modalNovoDesafio(){
  const jRes=await api.get('/admin/clube/jogadores?status=ATIVO').catch(()=>api.get('/jogador/ranking'))
  const jogadores=(jRes.data.data||[]).filter(j=>j.id)
  showModal('Enviar Desafio',\`
    \${formGroup('Desafiar jogador',\`<select id="f-desafiado" class="\${sc()}"><option value="">Selecione</option>\${jogadores.map(j=>'<option value="'+j.id+'">'+j.nome+' (#'+j.ranking_posicao+')</option>').join('')}</select>\`,true)}
    \${formGroup('Mensagem (opcional)',\`<input type="text" id="f-msg" class="\${ic()}" placeholder="Ex: Pronto para um jogo?">\`)}
  \`,async()=>{
    try{await api.post('/desafios',{desafiado_id:document.getElementById('f-desafiado').value,mensagem:document.getElementById('f-msg').value});closeModal();toast('Desafio enviado!');renderDesafios(false)}
    catch(e){toast(e.response?.data?.error||'Erro','error')}
  })
}

async function responderDesafio(id,aceito){
  try{const r=await api.patch('/desafios/'+id+'/responder',{aceito});toast(r.data.message||'Resposta enviada!');renderDesafios(false)}
  catch(e){toast(e.response?.data?.error||'Erro','error')}
}

// ============================================================
// MEU PAINEL (JOGADOR)
// ============================================================
async function renderMeuPainel(){
  const[pfRes,ptRes,rdRes]=await Promise.all([api.get('/jogador/perfil'),api.get('/jogador/partidas?status=PENDENTE'),api.get('/jogador/ranking')])
  const{usuario,jogador}=pfRes.data.data;const partidas=ptRes.data.data||[];const ranking=rdRes.data.data||[]
  const posRanking=ranking.findIndex(j=>j.id===jogador?.id)+1||'-'
  const ultimos=await api.get('/jogador/partidas').then(r=>(r.data.data||[]).filter(p=>p.status==='FINALIZADA').slice(0,2)).catch(()=>[])
  setContent(\`<div class="space-y-5">
    <!-- Card do jogador -->
    <div class="card bg-gradient-to-r from-green-700 to-green-600 rounded-xl p-5 text-white">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">\${usuario.nome.charAt(0)}</div>
        <div class="flex-1">
          <h2 class="text-xl font-bold">\${usuario.nome}</h2>
          <p class="text-green-200 text-sm">\${jogador?.classe_nome||'Sem classe'}</p>
          \${jogador?.inadimplente?'<span class="badge bg-red-500 text-white mt-1">Pagamento em atraso</span>':''}
        </div>
        <div class="text-center">
          <p class="text-3xl font-bold">#\${posRanking}</p>
          <p class="text-green-200 text-xs">Ranking</p>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-3 mt-4">
        <div class="text-center bg-white/10 rounded-lg p-3"><p class="text-2xl font-bold">\${jogador?.pontos_total||0}</p><p class="text-xs text-green-200">Pontos</p></div>
        <div class="text-center bg-white/10 rounded-lg p-3"><p class="text-2xl font-bold">\${jogador?.jogos_abertos||0}</p><p class="text-xs text-green-200">Em Aberto</p></div>
        <div class="text-center bg-white/10 rounded-lg p-3"><p class="text-2xl font-bold">\${partidas.length}</p><p class="text-xs text-green-200">Próximos</p></div>
      </div>
    </div>
    
    <!-- Próximos jogos -->
    <div class="card bg-white rounded-xl p-5">
      <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-calendar-alt text-blue-500"></i>Próximos Jogos</h3>
      \${partidas.length===0?'<p class="text-gray-400 text-sm text-center py-4">Nenhum jogo pendente 🎉</p>':
      partidas.slice(0,5).map(p=>\`<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2">
        <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><i class="fas fa-table-tennis text-green-600 text-sm"></i></div>
        <div class="flex-1">
          <p class="font-semibold text-gray-800 text-sm">\${p.jogador_a_nome} <span class="text-gray-400">vs</span> \${p.jogador_b_nome}</p>
          <p class="text-xs text-gray-500">\${p.classe_nome} · Limite: \${fmtDateOnly(p.data_limite)}</p>
        </div>
        \${statusBadge(p.status)}
      </div>\`).join('')}
    </div>
    
    <!-- Últimos resultados -->
    <div class="card bg-white rounded-xl p-5">
      <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-history text-purple-500"></i>Últimos Resultados</h3>
      \${ultimos.length===0?'<p class="text-gray-400 text-sm text-center py-4">Nenhum jogo finalizado</p>':
      ultimos.map(p=>\`<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2">
        <div class="w-10 h-10 rounded-full flex items-center justify-center \${p.vencedor_id===jogador?.id?'bg-green-100':'bg-red-100'}">
          <i class="\${p.vencedor_id===jogador?.id?'fas fa-trophy text-green-600':'fas fa-times text-red-500'} text-sm"></i>
        </div>
        <div class="flex-1">
          <p class="font-semibold text-gray-800 text-sm">\${p.jogador_a_nome} <span class="text-gray-400">\${p.placar_a||''}\${p.placar_a&&p.placar_b?' × ':' vs '}\${p.placar_b||''}</span> \${p.jogador_b_nome}</p>
          <p class="text-xs text-gray-500">\${fmtDateOnly(p.data_finalizacao)}</p>
        </div>
        <span class="\${p.vencedor_id===jogador?.id?'text-green-700':'text-red-600'} font-bold text-sm">\${p.vencedor_id===jogador?.id?'Vitória':'Derrota'}</span>
      </div>\`).join('')}
    </div>
    
    <!-- Quick actions -->
    <div class="grid grid-cols-2 gap-3">
      <button onclick="navigateTo('ranking')" class="btn card bg-white rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-green-50">
        <i class="fas fa-trophy text-yellow-500 text-2xl"></i><span class="text-sm font-medium text-gray-700">Ranking</span>
      </button>
      <button onclick="navigateTo('desafios')" class="btn card bg-white rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-green-50">
        <i class="fas fa-bolt text-purple-500 text-2xl"></i><span class="text-sm font-medium text-gray-700">Desafios</span>
      </button>
      <button onclick="navigateTo('publicacoes')" class="btn card bg-white rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-green-50">
        <i class="fas fa-newspaper text-blue-500 text-2xl"></i><span class="text-sm font-medium text-gray-700">Feed</span>
      </button>
      <button onclick="navigateTo('meu-pagamento')" class="btn card bg-white rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-green-50">
        <i class="fas fa-dollar-sign text-green-500 text-2xl"></i><span class="text-sm font-medium text-gray-700">Pagamento</span>
      </button>
    </div>
  </div>\`)
}

// ============================================================
// MINHAS PARTIDAS (JOGADOR)
// ============================================================
async function renderMinhasPartidas(){
  const res=await api.get('/jogador/partidas');const partidas=res.data.data||[]
  setContent(\`<div class="space-y-4">
    <div class="card bg-white rounded-xl overflow-hidden">
      <div class="p-4 border-b"><h3 class="font-bold text-gray-800">Minhas Partidas</h3></div>
      \${partidas.length===0?'<p class="text-center text-gray-400 py-12">Nenhuma partida</p>':
      '<div class="divide-y divide-gray-50">'+partidas.map(p=>\`<div class="p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold text-gray-800">\${p.jogador_a_nome} <span class="text-gray-400">vs</span> \${p.jogador_b_nome}</p>
            <p class="text-xs text-gray-500">\${p.classe_nome} · Rd#\${p.rodada_numero||'?'} · \${fmtDate(p.created_at)}</p>
            \${p.placar_a&&p.placar_b?'<p class="text-sm text-gray-600 mt-0.5">Placar: '+p.placar_a+' × '+p.placar_b+'</p>':''}
            \${p.vencedor_nome?'<p class="text-sm text-green-600 mt-0.5">🏆 '+p.vencedor_nome+'</p>':''}
          </div>
          \${statusBadge(p.status)}
        </div>
      </div>\`).join('')+'</div>'}
    </div>
  </div>\`)
}

// ============================================================
// MEU PAGAMENTO (JOGADOR)
// ============================================================
async function renderMeuPagamento(){
  const pfRes=await api.get('/jogador/perfil').catch(()=>({data:{data:{}}}))
  const jogador=pfRes.data.data?.jogador
  if(!jogador){setContent('<div class="text-center text-gray-400 py-12">Perfil de jogador não encontrado</div>');return}
  const cfRes=await api.get('/admin/clube/configuracoes').catch(()=>({data:{data:{}}}))
  const config=cfRes.data.data||{}
  const statusInadimp=jogador.inadimplente
  setContent(\`<div class="max-w-xl mx-auto space-y-4">
    <div class="card bg-white rounded-xl p-5">
      <h3 class="font-bold text-gray-800 mb-4"><i class="fas fa-dollar-sign text-green-500 mr-2"></i>Situação de Pagamento</h3>
      <div class="flex items-center gap-4 p-4 rounded-xl \${statusInadimp?'bg-red-50 border border-red-200':'bg-green-50 border border-green-200'}">
        <i class="fas fa-\${statusInadimp?'exclamation-circle text-red-500':'check-circle text-green-500'} text-3xl"></i>
        <div>
          <p class="font-bold \${statusInadimp?'text-red-700':'text-green-700'} text-lg">\${statusInadimp?'Pagamento em Atraso':'Em Dia'}</p>
          \${statusInadimp?'<p class="text-sm text-red-600">'+jogador.dias_inadimplente+' dias de atraso</p>':'<p class="text-sm text-green-600">Obrigado por manter seus pagamentos em dia!</p>'}
        </div>
      </div>
      \${config.valor_mensalidade>0?\`<div class="mt-4 p-4 bg-gray-50 rounded-xl">
        <p class="text-sm text-gray-600 mb-1">Mensalidade</p>
        <p class="text-2xl font-bold text-gray-800">\${fmtMoeda(config.valor_mensalidade)}</p>
      </div>\`:''}
      \${config.pix_chave?\`<div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p class="font-semibold text-blue-800 mb-2"><i class="fas fa-qrcode mr-1"></i>Pagar via Pix</p>
        <p class="text-sm text-gray-600">Chave: <strong class="font-mono bg-white px-2 py-1 rounded border">\${config.pix_chave}</strong></p>
        \${config.pix_titular?'<p class="text-xs text-gray-500 mt-1">Titular: '+config.pix_titular+'</p>':''}
        <p class="text-xs text-gray-400 mt-2">Após pagar, apresente o comprovante ao administrador do clube.</p>
      </div>\`:''}
    </div>
  </div>\`)
}

// INIT
if(State.token&&State.user)initApp()
</script>
</body>
</html>`
}
