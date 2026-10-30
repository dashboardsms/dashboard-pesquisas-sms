import { NATUREZAS, SITUACOES } from '../types/pesquisa.js'

// Usado pelo Worker antes de gravar: recria cada pesquisa só com os campos
// conhecidos, para que nada além deles chegue à base pública.

const LIMITE_PESQUISAS = 20_000
export const LIMITE_TEXTO = 200
const LIMITE_LISTA = 50

export function sanitizarPesquisas(dado) {
  const lista = ehObjeto(dado) ? dado.pesquisas : undefined
  if (!Array.isArray(lista)) return { erro: 'O corpo deve ter a lista "pesquisas".' }
  if (lista.length > LIMITE_PESQUISAS) return { erro: `Limite de ${LIMITE_PESQUISAS} pesquisas excedido.` }

  const pesquisas = []
  for (const [indice, item] of lista.entries()) {
    const pesquisa = sanitizarPesquisa(item)
    if (!pesquisa) return { erro: `Pesquisa ${indice + 1} em formato inválido.` }
    pesquisas.push(pesquisa)
  }
  return { pesquisas }
}

function sanitizarPesquisa(item) {
  if (!ehObjeto(item)) return null
  const { ano, mes, situacao, situacaoInformada, instituicao, programa, natureza, distritos, unidades } = item

  if (!inteiroOuNulo(ano, 1900, 2100) || !inteiroOuNulo(mes, 1, 12)) return null
  if (!SITUACOES.includes(situacao) || typeof situacaoInformada !== 'boolean') return null
  if (!textoOuNulo(instituicao) || !textoOuNulo(programa)) return null
  if (natureza !== null && !NATUREZAS.includes(natureza)) return null
  if (!Array.isArray(distritos) || distritos.length > LIMITE_LISTA || !distritos.every(ehTexto)) return null
  if (!Array.isArray(unidades) || unidades.length > LIMITE_LISTA) return null

  const unidadesValidas = []
  for (const unidade of unidades) {
    if (!ehObjeto(unidade) || !ehTexto(unidade.nome) || !textoOuNulo(unidade.distrito)) return null
    unidadesValidas.push({ nome: unidade.nome, distrito: unidade.distrito })
  }

  return {
    ano,
    mes,
    situacao: situacao,
    situacaoInformada,
    instituicao,
    programa,
    natureza: natureza,
    distritos: [...distritos],
    unidades: unidadesValidas,
  }
}

function ehObjeto(valor) {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function ehTexto(valor) {
  return typeof valor === 'string' && valor.length > 0 && valor.length <= LIMITE_TEXTO
}

function textoOuNulo(valor) {
  return valor === null || ehTexto(valor)
}

function inteiroOuNulo(valor, minimo, maximo) {
  return valor === null || (Number.isInteger(valor) && valor >= minimo && valor <= maximo)
}
