import { COLUNAS } from './estrutura.js'
import { chaveTexto, textoCelula } from './normalizacao.js'

const CHAVES_CABECALHO = new Map(COLUNAS.map((coluna) => [chaveTexto(coluna.cabecalho), coluna.campo]))
/** Colunas que alimentam o painel ou a situação; as descartadas podem faltar na planilha. */
const OBRIGATORIAS = COLUNAS.filter((coluna) => coluna.uso !== 'descartada')
/** O cabeçalho pode vir abaixo de algumas linhas de título. */
const LINHAS_ANTES_DO_CABECALHO = 10

/** Lê o arquivo .xlsx no navegador; nada é enviado ao servidor nesta etapa. */
export async function lerPlanilha(arquivo) {
  const { default: lerXlsx } = await import('read-excel-file/browser')
  const abas = await lerXlsx(arquivo)
  return extrairRegistros(abas.map(({ sheet, data }) => ({ nome: sheet, linhas: data })))
}

/**
 * Localiza, em cada aba, a linha de cabeçalho com as colunas do modelo (pelo
 * nome, em qualquer ordem) e devolve as linhas seguintes com essas colunas
 * exatamente como estão, sem interpretar valores. Abas sem as colunas
 * obrigatórias são ignoradas e o motivo é registrado.
 */
export function extrairRegistros(abas) {
  const leitura = { registros: [], abasLidas: [], abasIgnoradas: [], colunasExtras: [], colunasAusentes: [] }

  for (const { nome, linhas } of abas) {
    const candidatas = linhas.slice(0, LINHAS_ANTES_DO_CABECALHO).map(localizarColunas)
    const indiceCabecalho = candidatas.findIndex((posicoes) => OBRIGATORIAS.every((coluna) => posicoes.has(coluna.campo)))
    if (indiceCabecalho === -1) {
      leitura.abasIgnoradas.push({ nome, motivo: explicarDiferenca(linhas, candidatas) })
      continue
    }

    const posicoes = candidatas[indiceCabecalho]
    const usadas = new Set(posicoes.values())
    linhas[indiceCabecalho].forEach((valor, indice) => {
      const titulo = textoCelula(celula(valor))
      if (titulo && !usadas.has(indice)) leitura.colunasExtras.push(`${letraDaColuna(indice)} “${titulo}” (aba ${nome})`)
    })
    for (const coluna of COLUNAS) {
      if (!posicoes.has(coluna.campo)) leitura.colunasAusentes.push(`“${coluna.cabecalho}” (aba ${nome})`)
    }

    let quantidade = 0
    linhas.slice(indiceCabecalho + 1).forEach((linha, deslocamento) => {
      const valores = COLUNAS.map((coluna) => (posicoes.has(coluna.campo) ? celula(linha[posicoes.get(coluna.campo)]) : null))
      if (valores.every((valor) => valor === null)) return
      leitura.registros.push({
        ...Object.fromEntries(COLUNAS.map((coluna, indice) => [coluna.campo, valores[indice]])),
        aba: nome,
        linha: indiceCabecalho + 2 + deslocamento,
      })
      quantidade += 1
    })
    leitura.abasLidas.push({ nome, registros: quantidade })
  }

  return leitura
}

/** Posição de cada coluna do modelo nesta linha; um cabeçalho repetido vale na primeira vez. */
function localizarColunas(linha) {
  const posicoes = new Map()
  linha.forEach((valor, indice) => {
    const campo = CHAVES_CABECALHO.get(chaveTexto(textoCelula(celula(valor))))
    if (campo && !posicoes.has(campo)) posicoes.set(campo, indice)
  })
  return posicoes
}

/** Lista as colunas obrigatórias que faltam, para o responsável corrigir a planilha. */
function explicarDiferenca(linhas, candidatas) {
  if (!linhas.slice(0, LINHAS_ANTES_DO_CABECALHO).some((linha) => linha.some((valor) => celula(valor) !== null))) {
    return 'Aba vazia.'
  }
  const melhor = candidatas.reduce((a, b) => (b.size > a.size ? b : a))
  if (melhor.size === 0) return 'Nenhum cabeçalho do modelo encontrado nas primeiras linhas.'

  const faltando = OBRIGATORIAS.filter((coluna) => !melhor.has(coluna.campo)).map((coluna) => `“${coluna.cabecalho}”`)
  return faltando.length === 1
    ? `Falta a coluna ${faltando[0]}.`
    : `Faltam ${faltando.length} colunas: ${faltando.join(', ')}.`
}

/** Normaliza o valor bruto da célula; textos vazios viram nulo. */
function celula(valor) {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor
  if (typeof valor === 'number' || typeof valor === 'boolean') return valor
  if (typeof valor === 'string') return valor.trim() === '' ? null : valor.trim()
  return null
}

function letraDaColuna(indice) {
  const letra = String.fromCharCode(65 + (indice % 26))
  return indice < 26 ? letra : letraDaColuna(Math.floor(indice / 26) - 1) + letra
}
