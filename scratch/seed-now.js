import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import crypto from 'crypto'

const dbPath = path.resolve('local.db')
const db = new DatabaseSync(dbPath)

async function hashPassword(password) {
  const salt = 'tenis_ranking_salt_2025'
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex')
  return hash
}

function generateId() {
  return crypto.randomBytes(16).toString('hex')
}

async function runSeed() {
  console.log('🌱 Populando local.db diretamente...')

  const senhaAdmin = await hashPassword('Admin@2025!')
  const senhaJogador = await hashPassword('Jogador@2025!')

  // 1. Admin Global
  let admin = db.prepare(`SELECT id FROM usuarios WHERE email = 'admin@tenis.com'`).get()
  let adminGlobalId = admin?.id
  if (!adminGlobalId) {
    adminGlobalId = generateId()
    db.prepare(`
      INSERT INTO usuarios (id, nome, email, senha_hash, status, perfil)
      VALUES (?, 'Administrador Global', 'admin@tenis.com', ?, 'ATIVO', 'ADMIN_GLOBAL')
    `).run(adminGlobalId, senhaAdmin)
  }

  // 2. Clube 1 - Paulistano
  let clube1 = db.prepare(`SELECT id FROM clubes WHERE nome = 'Clube Paulistano de Tênis'`).get()
  let clube1Id = clube1?.id
  if (!clube1Id) {
    clube1Id = generateId()
    db.prepare(`
      INSERT INTO clubes (id, nome, cidade, estado, telefone, email_contato, status)
      VALUES (?, 'Clube Paulistano de Tênis', 'São Paulo', 'SP', '(11) 98888-7777', 'contato@paulistanotenis.com.br', 'ATIVO')
    `).run(clube1Id)
  }

  // Admin do Clube 1
  let adminClube1 = db.prepare(`SELECT id FROM usuarios WHERE email = 'admin.sp@tenis.com'`).get()
  let adminClube1Id = adminClube1?.id
  if (!adminClube1Id) {
    adminClube1Id = generateId()
    db.prepare(`
      INSERT INTO usuarios (id, nome, email, senha_hash, status, perfil, clube_id)
      VALUES (?, 'Admin Paulistano', 'admin.sp@tenis.com', ?, 'ATIVO', 'ADMIN_CLUBE', ?)
    `).run(adminClube1Id, senhaAdmin, clube1Id)
  }

  // Configurações do Clube 1
  db.prepare(`
    INSERT OR REPLACE INTO configuracoes_clube 
    (id, clube_id, periodicidade_sorteio, limite_jogos_aberto_por_jogador, permitir_wo, dias_para_wo, pontos_vitoria, pontos_derrota, pontos_wo, valor_mensalidade, pix_chave, pix_titular)
    VALUES (?, ?, 7, 3, 1, 14, 3, 1, 0, 150.00, 'contato@paulistanotenis.com.br', 'Clube Paulistano de Tênis')
  `).run(generateId(), clube1Id)

  // 3. Classes
  const classesNomes = ['1ª Classe Masculina', '2ª Classe Masculina', 'Feminino Open']
  const classesIds = {}

  for (let i = 0; i < classesNomes.length; i++) {
    const cNome = classesNomes[i]
    let cl = db.prepare(`SELECT id FROM classes WHERE clube_id = ? AND nome = ?`).get(clube1Id, cNome)
    let clId = cl?.id
    if (!clId) {
      clId = generateId()
      db.prepare(`
        INSERT INTO classes (id, clube_id, nome, descricao, ordem, status)
        VALUES (?, ?, ?, ?, ?, 'ATIVA')
      `).run(clId, clube1Id, cNome, `Categoria ${cNome} do Ranking`, i + 1)
    }
    classesIds[cNome] = clId
  }

  // 4. Jogadores
  const listaJogadores = [
    { nome: 'Carlos Silva', email: 'carlos.silva@email.com', fone: '(11) 91111-1001', classe: '1ª Classe Masculina', pts: 12, pos: 1 },
    { nome: 'Marcelo Oliveira', email: 'marcelo.oliveira@email.com', fone: '(11) 91111-1002', classe: '1ª Classe Masculina', pts: 9, pos: 2 },
    { nome: 'Rodrigo Santos', email: 'rodrigo.santos@email.com', fone: '(11) 91111-1003', classe: '1ª Classe Masculina', pts: 6, pos: 3 },
    { nome: 'Bruno Lima', email: 'bruno.lima@email.com', fone: '(11) 91111-1004', classe: '1ª Classe Masculina', pts: 3, pos: 4 },
    { nome: 'Lucas Costa', email: 'lucas.costa@email.com', fone: '(11) 91111-1005', classe: '2ª Classe Masculina', pts: 15, pos: 1 },
    { nome: 'Marcos Pereira', email: 'marcos.pereira@email.com', fone: '(11) 91111-1006', classe: '2ª Classe Masculina', pts: 10, pos: 2 },
    { nome: 'Rafael Ferreira', email: 'rafael.ferreira@email.com', fone: '(11) 91111-1007', classe: '2ª Classe Masculina', pts: 7, pos: 3 },
    { nome: 'Fernanda Almeida', email: 'fernanda.almeida@email.com', fone: '(11) 91111-1008', classe: 'Feminino Open', pts: 18, pos: 1 },
    { nome: 'Patricia Gomes', email: 'patricia.gomes@email.com', fone: '(11) 91111-1009', classe: 'Feminino Open', pts: 12, pos: 2 },
    { nome: 'Juliana Moraes', email: 'juliana.moraes@email.com', fone: '(11) 91111-1010', classe: 'Feminino Open', pts: 8, pos: 3 }
  ]

  const jogadoresCriados = []

  for (const jData of listaJogadores) {
    let u = db.prepare(`SELECT id FROM usuarios WHERE email = ?`).get(jData.email)
    let uId = u?.id
    if (!uId) {
      uId = generateId()
      db.prepare(`
        INSERT INTO usuarios (id, nome, email, senha_hash, status, perfil, clube_id)
        VALUES (?, ?, ?, ?, 'ATIVO', 'JOGADOR', ?)
      `).run(uId, jData.nome, jData.email, senhaJogador, clube1Id)
    }

    const classeId = classesIds[jData.classe]
    let j = db.prepare(`SELECT id FROM jogadores WHERE clube_id = ? AND email = ?`).get(clube1Id, jData.email)
    let jId = j?.id
    if (!jId) {
      jId = generateId()
      db.prepare(`
        INSERT INTO jogadores (id, clube_id, classe_id, usuario_id, nome, email, telefone, pontos_total, ranking_posicao, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ATIVO')
      `).run(jId, clube1Id, classeId, uId, jData.nome, jData.email, jData.fone, jData.pts, jData.pos)
    }
    jogadoresCriados.push({ id: jId, nome: jData.nome, classeId })
  }

  // 5. Rodada #1 e #2
  const c1Id = classesIds['1ª Classe Masculina']
  let rodada1 = db.prepare(`SELECT id FROM rodadas WHERE clube_id = ? AND numero = 1`).get(clube1Id)
  let rodada1Id = rodada1?.id
  if (!rodada1Id) {
    rodada1Id = generateId()
    db.prepare(`
      INSERT INTO rodadas (id, clube_id, classe_id, numero, executado_por_usuario_id, status, total_partidas, total_jogadores_elegiveis)
      VALUES (?, ?, ?, 1, ?, 'ENCERRADA', 2, 4)
    `).run(rodada1Id, clube1Id, c1Id, adminClube1Id)

    db.prepare(`
      INSERT INTO partidas (id, clube_id, classe_id, rodada_id, jogador_a_id, jogador_b_id, status, vencedor_id, placar_a, placar_b, data_finalizacao)
      VALUES (?, ?, ?, ?, ?, ?, 'FINALIZADA', ?, '6/4 6/3', '4/6 3/6', datetime('now', '-2 days'))
    `).run(generateId(), clube1Id, c1Id, rodada1Id, jogadoresCriados[0].id, jogadoresCriados[1].id, jogadoresCriados[0].id)

    db.prepare(`
      INSERT INTO partidas (id, clube_id, classe_id, rodada_id, jogador_a_id, jogador_b_id, status, vencedor_id, placar_a, placar_b, data_finalizacao)
      VALUES (?, ?, ?, ?, ?, ?, 'FINALIZADA', ?, '6/2 7/5', '2/6 5/7', datetime('now', '-1 days'))
    `).run(generateId(), clube1Id, c1Id, rodada1Id, jogadoresCriados[2].id, jogadoresCriados[3].id, jogadoresCriados[2].id)
  }

  let rodada2 = db.prepare(`SELECT id FROM rodadas WHERE clube_id = ? AND numero = 2`).get(clube1Id)
  let rodada2Id = rodada2?.id
  if (!rodada2Id) {
    rodada2Id = generateId()
    db.prepare(`
      INSERT INTO rodadas (id, clube_id, classe_id, numero, executado_por_usuario_id, status, total_partidas, total_jogadores_elegiveis)
      VALUES (?, ?, ?, 2, ?, 'ATIVA', 2, 4)
    `).run(rodada2Id, clube1Id, c1Id, adminClube1Id)

    db.prepare(`
      INSERT INTO partidas (id, clube_id, classe_id, rodada_id, jogador_a_id, jogador_b_id, status, data_limite)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDENTE', date('now', '+7 days'))
    `).run(generateId(), clube1Id, c1Id, rodada2Id, jogadoresCriados[0].id, jogadoresCriados[2].id)

    db.prepare(`
      INSERT INTO partidas (id, clube_id, classe_id, rodada_id, jogador_a_id, jogador_b_id, status, data_limite)
      VALUES (?, ?, ?, ?, ?, ?, 'EM_ANDAMENTO', date('now', '+7 days'))
    `).run(generateId(), clube1Id, c1Id, rodada2Id, jogadoresCriados[1].id, jogadoresCriados[3].id)
  }

  // 6. Pagamentos
  const mesAtual = new Date().toISOString().slice(0, 7)
  for (let idx = 0; idx < jogadoresCriados.length; idx++) {
    const j = jogadoresCriados[idx]
    const statusPg = idx % 3 === 0 ? 'PAGO' : idx % 3 === 1 ? 'PENDENTE' : 'VENCIDO'
    let pg = db.prepare(`SELECT id FROM pagamentos WHERE clube_id = ? AND jogador_id = ? AND referencia = ?`).get(clube1Id, j.id, mesAtual)
    if (!pg) {
      db.prepare(`
        INSERT INTO pagamentos (id, clube_id, jogador_id, valor, referencia, status, metodo_pagamento, data_vencimento, data_pagamento)
        VALUES (?, ?, ?, 150.00, ?, ?, ?, date('now', '-5 days'), ?)
      `).run(generateId(), clube1Id, j.id, mesAtual, statusPg, statusPg === 'PAGO' ? 'PIX' : null, statusPg === 'PAGO' ? new Date().toISOString() : null)
    }
  }

  // 7. Publicações
  let pubCount = db.prepare(`SELECT COUNT(*) as c FROM publicacoes WHERE clube_id = ?`).get(clube1Id)
  if (!pubCount || pubCount.c === 0) {
    db.prepare(`
      INSERT INTO publicacoes (id, clube_id, autor_id, titulo, conteudo, tipo, fixado)
      VALUES (?, ?, ?, 'Bem-vindos à nova Temporada 2025!', 'O ranking do Clube Paulistano está aberto com sorteios semanais.', 'AVISO', 1)
    `).run(generateId(), clube1Id, adminClube1Id)

    db.prepare(`
      INSERT INTO publicacoes (id, clube_id, autor_id, titulo, conteudo, tipo, fixado)
      VALUES (?, ?, ?, 'Resultado da Rodada #1 - 1ª Classe', 'Carlos Silva venceu Marcelo Oliveira por 6/4 6/3.', 'RESULTADO', 0)
    `).run(generateId(), clube1Id, adminClube1Id)
  }

  console.log('✅ Banco de dados local (local.db) populado com sucesso!')
}

runSeed().catch(console.error)
