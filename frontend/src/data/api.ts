import type { BaseDePesquisas, Pesquisa } from '../types/pesquisa.ts'

const URL_DADOS = '/api/dados'

/** Base publicada, ou `null` se nenhuma planilha foi importada ainda. */
export async function carregarBase(): Promise<BaseDePesquisas | null> {
  const resposta = await fetch(URL_DADOS, { cache: 'no-store' })
  if (resposta.status === 404) return null
  if (!resposta.ok) throw new Error(`Falha ao carregar os dados (HTTP ${resposta.status}).`)
  return resposta.json()
}

/** Envia as pesquisas já convertidas da planilha. Nenhum dado pessoal vai no corpo. */
export async function publicarPesquisas(pesquisas: Pesquisa[], senha: string) {
  const resposta = await fetch(URL_DADOS, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // Codificada para aceitar acentos (cabeçalhos HTTP só levam ASCII).
      Authorization: `Bearer ${encodeURIComponent(senha)}`,
    },
    body: JSON.stringify({ pesquisas }),
  })
  const corpo: { erro?: string; atualizadoEm?: string; pesquisas?: number } = await resposta.json().catch(() => ({}))
  if (!resposta.ok) throw new Error(corpo.erro ?? `Falha ao publicar (HTTP ${resposta.status}).`)
  return { atualizadoEm: corpo.atualizadoEm ?? '', pesquisas: corpo.pesquisas ?? 0 }
}
