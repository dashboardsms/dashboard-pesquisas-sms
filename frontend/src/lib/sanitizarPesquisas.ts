import { NATUREZAS, SITUACOES, type Natureza, type Pesquisa, type Situacao, type UnidadeSaude } from '../types/pesquisa.ts'

// Usado pelo Worker antes de gravar: recria cada pesquisa só com os campos
// conhecidos, para que nada além deles chegue à base pública.

const LIMITE_PESQUISAS = 20_000
const LIMITE_TEXTO = 200
const LIMITE_LISTA = 50

export type ResultadoSanitizacao = { pesquisas: Pesquisa[] } | { erro: string }

export function sanitizarPesquisas(dado: unknown): ResultadoSanitizacao {
  const lista = ehObjeto(dado) ? dado.pesquisas : undefined
  if (!Array.isArray(lista)) return { erro: 'O corpo deve ter a lista "pesquisas".' }
  if (lista.length > LIMITE_PESQUISAS) return { erro: `Limite de ${LIMITE_PESQUISAS} pesquisas excedido.` }

  const pesquisas: Pesquisa[] = []
  for (const [indice, item] of lista.entries()) {
    const pesquisa = sanitizarPesquisa(item)
    if (!pesquisa) return { erro: `Pesquisa ${indice + 1} em formato inválido.` }
    pesquisas.push(pesquisa)
  }
  return { pesquisas }
}

function sanitizarPesquisa(item: unknown): Pesquisa | null {
  if (!ehObjeto(item)) return null
  const { ano, mes, situacao, situacaoInformada, instituicao, programa, natureza, distritos, unidades } = item

  if (!inteiroOuNulo(ano, 1900, 2100) || !inteiroOuNulo(mes, 1, 12)) return null
  if (!SITUACOES.includes(situacao as Situacao) || typeof situacaoInformada !== 'boolean') return null
  if (!textoOuNulo(instituicao) || !textoOuNulo(programa)) return null
  if (natureza !== null && !NATUREZAS.includes(natureza as Natureza)) return null
  if (!Array.isArray(distritos) || distritos.length > LIMITE_LISTA || !distritos.every(ehTexto)) return null
  if (!Array.isArray(unidades) || unidades.length > LIMITE_LISTA) return null

  const unidadesValidas: UnidadeSaude[] = []
  for (const unidade of unidades) {
    if (!ehObjeto(unidade) || !ehTexto(unidade.nome) || !textoOuNulo(unidade.distrito)) return null
    unidadesValidas.push({ nome: unidade.nome, distrito: unidade.distrito })
  }

  return {
    ano,
    mes,
    situacao: situacao as Situacao,
    situacaoInformada,
    instituicao,
    programa,
    natureza: natureza as Natureza | null,
    distritos: [...distritos],
    unidades: unidadesValidas,
  }
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function ehTexto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0 && valor.length <= LIMITE_TEXTO
}

function textoOuNulo(valor: unknown): valor is string | null {
  return valor === null || ehTexto(valor)
}

function inteiroOuNulo(valor: unknown, minimo: number, maximo: number): valor is number | null {
  return valor === null || (Number.isInteger(valor) && (valor as number) >= minimo && (valor as number) <= maximo)
}
