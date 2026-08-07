# 🎾 TênisRank — Plataforma de Ranking Multi-Clube v2

## Visão Geral
Plataforma web **multi-tenant** para gestão de ranking de tênis por clube, com administração global centralizada.

## URLs
- **Produção**: https://tennis-rank.pages.dev
- **GitHub**: https://github.com/ldospsilva-png/TopCourtRank
- **Admin Global**: admin@tenis.com / Admin@2025!

## Módulos Implementados (v2)

### Admin Global
- ✅ Dashboard com métricas globais e atividade por clube
- ✅ Gestão de clubes (criar, editar, ativar/inativar)
- ✅ Gestão de usuários (listar, ativar/inativar)
- ✅ **Relatório de jogadores** com filtros: clube, classe, status, inadimplência
- ✅ **Relatório de pagamentos global** por clube com resumo financeiro
- ✅ Auditoria completa de eventos críticos

### Admin Clube
- ✅ Dashboard com estatísticas do clube
- ✅ Gestão de classes (criar, editar, ativar/inativar)
- ✅ Gestão de jogadores (criar, editar, com indicação de inadimplência)
- ✅ **Módulo de Pagamentos** (registrar individualmente, gerar mensalidades em lote, marcar como pago)
- ✅ Sorteio de rodadas com elegibilidade por limite de jogos
- ✅ Gestão de rodadas e partidas com placar e vencedor
- ✅ Ranking por classe com pontuação configurável
- ✅ **Feed de Publicações** (avisos, resultados, eventos, novidades) com destaque para posts fixados
- ✅ **Configurações avançadas**: quadras, formato de set, desafios, PIX, inadimplência, notificações, redes sociais

### Área do Jogador
- ✅ **Dashboard pessoal**: posição no ranking, pontuação, insights (vitórias/derrotas/aproveitamento)
- ✅ **Próximos jogos** em aberto com prazo e quadra
- ✅ **Últimos 2 resultados** com indicação de vitória/derrota
- ✅ **Sistema de Desafios**: enviar, aceitar, recusar com mensagem personalizada
- ✅ **Ranking** por classe com highlight da posição do usuário
- ✅ Histórico de partidas
- ✅ **Feed de publicações** do clube
- ✅ **Alerta de inadimplência** no painel (quando há pagamento em atraso)
- ✅ Perfil com estatísticas

## Parâmetros Configuráveis por Clube (v2)
| Parâmetro | Descrição |
|---|---|
| Periodicidade de sorteio | Dias entre sorteios |
| Limite de jogos em aberto | Max jogos sem resultado por jogador |
| **Limite de quadras** | Impede sorteio se jogos > quadras disponíveis |
| **Formato de set** | 3 Sets (3º Tie-Break) ou Set Pro com Vantagem |
| **Módulo de Desafios** | Ativar/desativar desafios entre jogadores |
| **Dias de inadimplência** | X dias → bloqueio ranking; Y dias → inativação |
| **Valor da mensalidade** | Base para geração de cobranças |
| **Chave PIX** | Para recebimento de pagamentos |
| Pontos vitória/derrota/WO | Sistema de pontuação |
| **Notificações WhatsApp/Email** | Ativar/desativar canais |
| **Redes sociais** | URLs Instagram e Facebook do clube |

## Modelo de Dados
```
Club → Users → Profile (ADMIN_GLOBAL | ADMIN_CLUBE | JOGADOR)
Club → Classes → Players → Rankings
Club → ClubConfig (parâmetros)
Club → Rounds → Matches (confrontos sorteados)
Club → Pagamentos (controle financeiro)
Club → Desafios (entre jogadores)
Club → Publicacoes (feed de notícias)
Club → Notificacoes (histórico de notificações)
Audit (log de todas as operações críticas)
```

## Tecnologias
- **Edge Runtime**: Cloudflare Pages / Workers
- **Backend**: Hono (TypeScript)
- **Banco**: Cloudflare D1 (SQLite, multi-tenant por clube_id)
- **Auth**: JWT HS256 + RBAC por perfil
- **Frontend**: SPA em HTML/JS com Tailwind CSS + Chart.js + Axios

## Fases de Desenvolvimento
- ✅ **Fase 1 (MVP)**: Multi-tenancy, admins, cadastro, sorteios, limite de jogos, auditoria
- ✅ **Fase 2 (v2)**: Pagamentos, desafios, publicações, parâmetros avançados, relatórios/dashboards, dashboard do jogador
- 📋 **Fase 3 (futuro)**: Pontuação avançada, desempate, notificações automáticas (WhatsApp/Email), integração com agenda/quadras

## Critérios de Elegibilidade para Sorteio
1. Jogador deve ter status ATIVO
2. jogos_abertos < limite_jogos_aberto_por_jogador (configurável)
3. Não estar inadimplente com bloqueio ativo (futuro)

## Última atualização
2026-04-28 — Deploy v2 completo
