export const SITUACOES = ['em_analise', 'em_execucao', 'finalizada', 'cancelada'] as const

export type Situacao = (typeof SITUACOES)[number]

export const ROTULOS_SITUACAO: Record<Situacao, string> = {
  em_analise: 'Em análise',
  em_execucao: 'Em execução',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

/** Ordem de exibição: níveis acadêmicos primeiro, depois os demais vínculos. */
export const NATUREZAS = [
  'Graduação',
  'Especialização',
  'Residência',
  'Pós-graduação',
  'Mestrado',
  'Doutorado',
  'Extensão',
  'Institucional',
  'Outra',
] as const

export type Natureza = (typeof NATUREZAS)[number]

export interface UnidadeSaude {
  nome: string
  distrito: string | null
}

/**
 * Pesquisa como publicada no painel: só campos agregáveis, sem nomes, e-mails,
 * títulos ou anotações da planilha (RN06).
 */
export interface Pesquisa {
  /** Ano da data de protocolo (ou do número do protocolo, quando falta a data). */
  ano: number | null
  /** Mês (1–12) da data de protocolo; nulo quando a data não foi informada. */
  mes: number | null
  situacao: Situacao
  /** Verdadeiro quando a coluna "Situação" trouxe um valor padronizado; falso quando foi inferida. */
  situacaoInformada: boolean
  instituicao: string | null
  programa: string | null
  natureza: Natureza | null
  distritos: string[]
  unidades: UnidadeSaude[]
}

export interface BaseDePesquisas {
  /** Data da última importação, no formato AAAA-MM-DD. */
  atualizadoEm: string
  pesquisas: Pesquisa[]
}

/** Categorias que reúnem valores agrupados na importação ou somados nos gráficos. */
export const OUTRAS_INSTITUICOES = 'Outras instituições'
export const OUTROS_PROGRAMAS = 'Outros programas'
