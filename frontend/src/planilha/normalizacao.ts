import type { Natureza, Situacao } from '../types/pesquisa.ts'
import type { ValorCelula } from './estrutura.ts'

/** Texto da célula em uma linha só; datas viram DD/MM/AAAA. */
export function textoCelula(valor: ValorCelula): string {
  if (valor === null) return ''
  if (valor instanceof Date) {
    const [ano, mes, dia] = valor.toISOString().slice(0, 10).split('-')
    return `${dia}/${mes}/${ano}`
  }
  return String(valor).replace(/\s+/g, ' ').trim()
}

/** Chave de comparação: minúsculas, sem acentos e com pontuação trocada por espaço. */
export function chaveTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Separa células com vários valores (por ponto e vírgula ou quebra de linha). */
export function separarValores(valor: ValorCelula): string[] {
  if (typeof valor !== 'string') return valor === null ? [] : [textoCelula(valor)]
  return valor
    .split(/[;\n\r]+/)
    .map((parte) => parte.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Datas

const EPOCA_EXCEL = Date.UTC(1899, 11, 30)
const DIA_MS = 86_400_000

/** Ano e mês de uma data de protocolo (célula de data, número serial do Excel ou texto DD/MM/AAAA). */
export function lerAnoMes(valor: ValorCelula): { ano: number; mes: number } | null {
  let data: Date | null = null
  if (valor instanceof Date) data = valor
  else if (typeof valor === 'number' && valor > 0 && valor < 100_000) data = new Date(EPOCA_EXCEL + Math.round(valor) * DIA_MS)
  else if (typeof valor === 'string') {
    const partes = valor.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})$/)
    if (partes) {
      const ano = partes[3].length === 2 ? 2000 + Number(partes[3]) : Number(partes[3])
      data = new Date(Date.UTC(ano, Number(partes[2]) - 1, Number(partes[1])))
    }
  }
  if (!data || Number.isNaN(data.getTime())) return null
  return { ano: data.getUTCFullYear(), mes: data.getUTCMonth() + 1 }
}

/** Ano no número do protocolo, como em "21/2022" ou "021/22". */
export function anoDoProtocolo(numero: string): number | null {
  const partes = numero.match(/\/\s*(\d{4}|\d{2})\s*$/)
  if (!partes) return null
  return partes[1].length === 2 ? 2000 + Number(partes[1]) : Number(partes[1])
}

// ---------------------------------------------------------------------------
// Instituições

/** Variações conhecidas (comparadas pela chave do texto) e o nome padronizado. */
const INSTITUICOES: [RegExp, string][] = [
  [/\bufg\b|federal de goias/, 'Universidade Federal de Goiás (UFG)'],
  [/\bpuc\b|pontificia/, 'Pontifícia Universidade Católica de Goiás (PUC Goiás)'],
  [/\bunb\b|universidade de brasilia/, 'Universidade de Brasília (UnB)'],
  [/fiocruz|oswaldo cruz/, 'Fundação Oswaldo Cruz (Fiocruz)'],
  [/\bufcat\b|federal de catalao/, 'Universidade Federal de Catalão (UFCAT)'],
  [/\bunirv\b|universidade de rio verde/, 'Universidade de Rio Verde (UniRV)'],
  [/\bueg\b|estadual de goias/, 'Universidade Estadual de Goiás (UEG)'],
  [/unievangelica|evangelica de goias/, 'Universidade Evangélica de Goiás (UniEVANGÉLICA)'],
  [/\bufba\b|federal da bahia/, 'Universidade Federal da Bahia (UFBA)'],
  [/\bufpb\b|federal da paraiba/, 'Universidade Federal da Paraíba (UFPB)'],
  [/unicamps/, 'Centro Universitário FacUnicamps'],
  [/\bisics\b|interamericano de ciencias sociais/, 'Instituto Superior Interamericano de Ciências Sociais (ISICS)'],
  [/europea del atlantico|uneatlantico/, 'Universidad Europea del Atlántico'],
  [/\bhmdi\b|dona iris/, 'Hospital e Maternidade Dona Iris (HMDI)'],
]

/** Palavras que indicam nome de instituição, para publicar valores fora da lista acima. */
const PARECE_INSTITUICAO =
  /universidade|universidad|university|faculdade|centro universitario|instituto|fundacao|hospital|maternidade|secretaria|escola|vigilancia/

export function instituicaoConhecida(texto: string): string | null {
  const chave = chaveTexto(texto)
  return INSTITUICOES.find(([padrao]) => padrao.test(chave))?.[1] ?? null
}

export function pareceInstituicao(texto: string) {
  return PARECE_INSTITUICAO.test(chaveTexto(texto))
}

// ---------------------------------------------------------------------------
// Programa

/** Palavras que indicam curso ou programa, para publicar valores que aparecem uma única vez. */
const PARECE_PROGRAMA =
  /graduacao|mestrado|doutorado|residencia|especializacao|curso|programa|faculdade|escola|instituto|nucleo|departamento|enfermagem|medicina|psicologia|odontologia|nutricao|fisioterapia|farmacia|saude|educacao|letras|musica|arquitetura|logia|\bpet\b|\bppg|licenciatura|bacharelado|ciencias|gestao|servico social|biomedicina|terapia|tropical|coletiva|publica|extensao|pratica|pedagogica|libras|iptsp/

export function parecePrograma(texto: string) {
  return PARECE_PROGRAMA.test(chaveTexto(texto))
}

// ---------------------------------------------------------------------------
// Natureza

/** Do nível mais alto para o mais baixo: quando o texto cita mais de um, vale o primeiro. */
const NATUREZAS_POR_PRIORIDADE: [RegExp, Natureza][] = [
  [/doutorado/, 'Doutorado'],
  [/mestrado/, 'Mestrado'],
  [/residencia/, 'Residência'],
  [/especializacao/, 'Especialização'],
  [/pos graduacao|posgraduacao/, 'Pós-graduação'],
  [/(?<!pos )graduacao|\btcc\b|iniciacao cientifica/, 'Graduação'],
  [/extensao|\bpet\b/, 'Extensão'],
  [/institucional/, 'Institucional'],
]

export function classificarNatureza(texto: string): { natureza: Natureza; varias: boolean } {
  const chave = chaveTexto(texto)
  const encontradas = NATUREZAS_POR_PRIORIDADE.filter(([padrao]) => padrao.test(chave))
  return { natureza: encontradas[0]?.[1] ?? 'Outra', varias: encontradas.length > 1 }
}

// ---------------------------------------------------------------------------
// Situação

/** Valores padronizados aceitos na coluna "Situação" (célula inteira). */
const SITUACOES_PADRONIZADAS: [RegExp, Situacao][] = [
  [/^(em )?(analise|tramitacao)$/, 'em_analise'],
  [/^(em )?(execucao|andamento)$/, 'em_execucao'],
  [/^(finalizada|concluida|encerrada)$/, 'finalizada'],
  [/^(cancelada|arquivada|desistencia|indeferida)$/, 'cancelada'],
]

export function situacaoPadronizada(texto: string): Situacao | null {
  const chave = chaveTexto(texto)
  return SITUACOES_PADRONIZADAS.find(([padrao]) => padrao.test(chave))?.[1] ?? null
}

export interface TextosDoProcesso {
  acompanhamento: string
  situacao: string
  declaracaoAnuencia: string
  parecerCep: string
  autorizacaoColeta: string
  periodoColeta: string
  previsaoRelatorio: string
}

/**
 * Situação inferida das anotações quando a coluna "Situação" não traz um valor
 * padronizado. Regras provisórias (pendência 1 em docs/pendencias-validacao.md).
 */
export function inferirSituacao(textos: TextosDoProcesso): { situacao: Situacao; motivo: string } {
  // Separador que não sobrevive à chaveTexto: as buscas não atravessam colunas.
  const tudo = Object.values(textos).map(chaveTexto).join(' | ')

  if (/cancelad|desistencia|desistiu|arquivad|indeferid/.test(tudo)) {
    return { situacao: 'cancelada', motivo: 'Anotações citam cancelamento, arquivamento ou desistência' }
  }
  if (
    /relatorio final[^|]*\b(entregue|recebido|apresentado)|\b(entregue|recebido|apresentado)[^|]*relatorio final|pesquisa (finalizada|concluida|encerrada)/.test(
      tudo,
    )
  ) {
    return { situacao: 'finalizada', motivo: 'Anotações registram a entrega do relatório final' }
  }
  if (textos.autorizacaoColeta || textos.periodoColeta) {
    return { situacao: 'em_execucao', motivo: 'Tem autorização ou período de coleta de dados registrado' }
  }
  return { situacao: 'em_analise', motivo: 'Ainda sem autorização de coleta registrada' }
}

// ---------------------------------------------------------------------------

/**
 * Agrupa grafias diferentes do mesmo valor ("ENFERMAGEM", "Enfermagem") e
 * escolhe como nome a grafia mais usada. `ocorrencias` conta registros.
 */
export function criarCanonizador() {
  const variantes = new Map<string, Map<string, number>>()

  return {
    registrar(texto: string) {
      const chave = chaveTexto(texto)
      if (!chave) return
      const grafias = variantes.get(chave) ?? new Map<string, number>()
      grafias.set(texto, (grafias.get(texto) ?? 0) + 1)
      variantes.set(chave, grafias)
    },
    canonico(texto: string) {
      const grafias = variantes.get(chaveTexto(texto))
      if (!grafias) return texto
      return [...grafias].sort((a, b) => b[1] - a[1])[0][0]
    },
    ocorrencias(texto: string) {
      const grafias = variantes.get(chaveTexto(texto))
      return grafias ? [...grafias.values()].reduce((soma, n) => soma + n, 0) : 0
    },
  }
}
