import { NATUREZAS, ROTULOS_SITUACAO, SITUACOES } from '../types/pesquisa.js'
import { compararTexto } from './formatacao.js'

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MESES_ABREVIADOS = MESES.map((mes) => mes.slice(0, 3).toLowerCase())

const distritos = (p) => p.distritos

export function anosDisponiveis(pesquisas) {
  return [...new Set(pesquisas.flatMap((p) => (p.ano === null ? [] : [p.ano])))].sort((a, b) => b - a)
}

export function calcularIndicadores(todas, { ano, mes, escopo }) {
  const doPeriodo = todas.filter(
    (p) => (ano === 'todos' || p.ano === ano) && (mes === 'todos' || p.mes === mes),
  )
  const consideradas = escopo === 'todas' ? doPeriodo : doPeriodo.filter((p) => p.situacao === 'em_execucao')

  const porSituacao = Object.fromEntries(SITUACOES.map((s) => [s, 0]))
  for (const pesquisa of doPeriodo) porSituacao[pesquisa.situacao] += 1

  return {
    cadastradas: doPeriodo.length,
    porSituacao,
    situacoesInferidas: doPeriodo.filter((p) => !p.situacaoInformada).length,
    consideradas: consideradas.length,
    porInstituicao: distribuir(consideradas, (p) => p.instituicao),
    porUnidade: distribuir(consideradas, (p) => p.unidades.map((u) => u.nome)),
    porNatureza: distribuir(consideradas, (p) => p.natureza, NATUREZAS),
    porPrograma: distribuir(consideradas, (p) => p.programa),
    // Categorias da base inteira: as colunas não mudam ao trocar o filtro.
    porDistrito: distribuir(consideradas, distritos, categorias(todas, distritos)),
    situacoes: distribuir(
      doPeriodo,
      (p) => ROTULOS_SITUACAO[p.situacao],
      SITUACOES.map((s) => ROTULOS_SITUACAO[s]),
    ),
    porPeriodo:
      ano === 'todos'
        ? distribuir(doPeriodo, (p) => (p.ano === null ? null : String(p.ano)), sequenciaDeAnos(todas))
        : distribuir(doPeriodo, (p) => (p.mes === null ? null : MESES_ABREVIADOS[p.mes - 1]), MESES_ABREVIADOS),
  }
}

/**
 * Conta as pesquisas por categoria. Uma pesquisa com várias categorias (por
 * exemplo, mais de uma unidade) conta uma vez em cada, e a proporção é sempre
 * sobre o total de pesquisas. Sem `ordem`, os itens saem do maior para o menor.
 */
export function distribuir(pesquisas, extrair, ordem) {
  const contagem = new Map(ordem?.map((categoria) => [categoria, 0]))
  let semInformacao = 0
  for (const pesquisa of pesquisas) {
    const valores = new Set([extrair(pesquisa)].flat().filter((valor) => Boolean(valor)))
    if (valores.size === 0) semInformacao += 1
    for (const categoria of valores) contagem.set(categoria, (contagem.get(categoria) ?? 0) + 1)
  }

  const total = pesquisas.length
  const itens = Array.from(contagem, ([categoria, quantidade]) => ({
    categoria,
    quantidade,
    proporcao: total > 0 ? quantidade / total : 0,
  }))
  if (!ordem) itens.sort((a, b) => b.quantidade - a.quantidade || compararTexto(a.categoria, b.categoria))
  return { itens, semInformacao, total }
}

/**
 * Mantém as `limite` categorias mais frequentes e soma as demais em `rotulo`,
 * junto com o que já veio agrupado com esse nome da importação. Só para campos
 * de valor único, em que as proporções podem ser somadas.
 */
export function agruparExcedentes(itens, limite, rotulo) {
  const ranqueados = itens.filter((item) => item.categoria !== rotulo)
  const excedentes = ranqueados.length > limite + 1 ? ranqueados.slice(limite) : []
  const somados = [...itens.filter((item) => item.categoria === rotulo), ...excedentes]
  const principais = ranqueados.slice(0, ranqueados.length - excedentes.length)
  if (somados.length === 0) return principais

  return [
    ...principais,
    {
      categoria: rotulo,
      quantidade: somados.reduce((soma, item) => soma + item.quantidade, 0),
      proporcao: somados.reduce((soma, item) => soma + item.proporcao, 0),
      outros: true,
    },
  ]
}

function categorias(pesquisas, extrair) {
  return [...new Set(pesquisas.flatMap((p) => [extrair(p)].flat().filter((v) => Boolean(v))))].sort(
    compararTexto,
  )
}

/** Todos os anos entre o primeiro e o último protocolo, inclusive os sem registros. */
function sequenciaDeAnos(pesquisas) {
  const anos = anosDisponiveis(pesquisas)
  if (anos.length === 0) return []
  const [ultimo, primeiro] = [anos[0], anos[anos.length - 1]]
  return Array.from({ length: ultimo - primeiro + 1 }, (_, indice) => String(primeiro + indice))
}
