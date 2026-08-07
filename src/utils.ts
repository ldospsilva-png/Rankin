// ============================================================
// UTILITÁRIOS GERAIS
// ============================================================

export function generateId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function formatDate(date?: Date): string {
  return (date || new Date()).toISOString()
}

export function paginate(page: number, limit: number) {
  const p = Math.max(1, page)
  const l = Math.min(100, Math.max(1, limit))
  return { offset: (p - 1) * l, limit: l, page: p }
}

export function successResponse(data: unknown, message?: string) {
  return { success: true, data, message }
}

export function errorResponse(error: string, code?: string, details?: unknown) {
  return { success: false, error, code, details }
}

// Embaralhar array (Fisher-Yates)
export function shuffle<T>(arr: T[]): T[] {
  const array = [...arr]
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

// Gerar confrontos round-robin para um array de jogadores
export function gerarConfrontosRoundRobin(jogadores: string[]): Array<[string, string]> {
  const confrontos: Array<[string, string]> = []
  for (let i = 0; i < jogadores.length; i++) {
    for (let j = i + 1; j < jogadores.length; j++) {
      confrontos.push([jogadores[i], jogadores[j]])
    }
  }
  return confrontos
}

// Gerar confrontos por rodada (cada jogador joga 1x por sorteio)
export function gerarConfrontosPorRodada(jogadores: string[]): Array<[string, string]> {
  if (jogadores.length < 2) return []
  
  const shuffled = shuffle(jogadores)
  const confrontos: Array<[string, string]> = []
  
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    confrontos.push([shuffled[i], shuffled[i + 1]])
  }
  
  return confrontos
}
