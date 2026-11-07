import { sanitizarPesquisas } from '../frontend/src/lib/sanitizarPesquisas.js'
import { converterPlanilha } from '../frontend/src/planilha/converterPlanilha.js'
import { extrairRegistros } from '../frontend/src/planilha/lerPlanilha.js'

// Leitura da planilha do Google Sheets para a sincronização (src/sincronizar.js). A leitura,
// a conversão e a remoção de dados pessoais são as mesmas da importação manual em /importar:
// aqui só muda a origem, o CSV exportado pelo Google.

const NOME_DA_ABA = 'Google Sheets'

/** Endereço do CSV a partir do link de compartilhamento (…/spreadsheets/d/ID/edit#gid=ABA). */
export function urlDeExportacao(link) {
  const id = link.match(/\/spreadsheets\/d\/([\w-]{20,})/)?.[1]
  if (!id) return null
  const aba = link.match(/[#?&]gid=(\d+)/)?.[1]
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${aba ? `&gid=${aba}` : ''}`
}

/**
 * Baixa a planilha e devolve `{ pesquisas, avisos }` prontas para gravar, ou `{ erro }`.
 * Com erro nada deve ser publicado, como na importação manual.
 */
export async function lerPlanilhaGoogle(link) {
  const url = urlDeExportacao(link)
  if (!url) return { erro: 'URL_PLANILHA não é um link de planilha do Google Sheets.' }

  let resposta
  try {
    resposta = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  } catch (falha) {
    return { erro: `Não foi possível acessar o Google Sheets (${falha.message}).` }
  }
  if (resposta.status === 404) return { erro: 'Planilha não encontrada. Confira URL_PLANILHA.' }
  // Sem compartilhamento por link, o Google responde com a página de login em vez do CSV.
  if (!resposta.ok || !resposta.headers.get('Content-Type')?.startsWith('text/csv')) {
    return {
      erro: `A planilha não está acessível (HTTP ${resposta.status}). Compartilhe como "Qualquer pessoa com o link" (Leitor).`,
    }
  }

  const leitura = extrairRegistros([{ nome: NOME_DA_ABA, linhas: lerCsv(await resposta.text()) }])
  const resultado = converterPlanilha(leitura)
  if (resultado.erros.length > 0) return { erro: resultado.erros.join(' ') }

  const sanitizadas = sanitizarPesquisas({ pesquisas: resultado.pesquisas })
  if ('erro' in sanitizadas) return { erro: sanitizadas.erro }
  return { pesquisas: sanitizadas.pesquisas, avisos: resultado.avisos }
}

/** Linhas de um CSV (RFC 4180): campos entre aspas podem ter vírgulas, quebras de linha e aspas dobradas (""). */
export function lerCsv(texto) {
  const linhas = []
  let linha = []
  let campo = ''
  let entreAspas = false

  for (let indice = texto.charCodeAt(0) === 0xfeff ? 1 : 0; indice < texto.length; indice++) {
    const caractere = texto[indice]
    if (entreAspas) {
      if (caractere !== '"') campo += caractere
      else if (texto[indice + 1] === '"') campo += texto[++indice]
      else entreAspas = false
    } else if (caractere === '"') {
      entreAspas = true
    } else if (caractere === ',') {
      linha.push(campo)
      campo = ''
    } else if (caractere === '\n' || caractere === '\r') {
      if (caractere === '\r' && texto[indice + 1] === '\n') indice++
      linhas.push([...linha, campo])
      linha = []
      campo = ''
    } else {
      campo += caractere
    }
  }
  if (campo || linha.length > 0) linhas.push([...linha, campo])
  return linhas
}
