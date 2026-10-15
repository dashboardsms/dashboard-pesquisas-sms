/**
 * Uso de cada coluna:
 * - painel: alimenta os indicadores e gráficos;
 * - situacao: lida só para classificar a situação da pesquisa;
 * - apoio: usada na leitura (ano de reserva, duplicidades), mas não publicada;
 * - descartada: nunca sai do navegador (dados pessoais ou anotações internas).
 */
export type UsoColuna = 'painel' | 'situacao' | 'apoio' | 'descartada'

/**
 * Colunas da planilha "Registro pesquisas", na ordem exata do modelo
 * (dados/Registro pesquisas 2026 template.xlsx). A importação só aceita abas
 * com estes cabeçalhos nesta ordem; maiúsculas, acentos e espaços extras não importam.
 */
export const COLUNAS = [
  { letra: 'A', cabecalho: 'Data de protocolo', campo: 'dataProtocolo', uso: 'painel' },
  { letra: 'B', cabecalho: 'Número de protocolo', campo: 'numeroProtocolo', uso: 'apoio' },
  { letra: 'C', cabecalho: 'Título da pesquisa', campo: 'titulo', uso: 'descartada' },
  { letra: 'D', cabecalho: 'Pesquisador responsável', campo: 'pesquisadorResponsavel', uso: 'descartada' },
  { letra: 'E', cabecalho: 'Orientador', campo: 'orientador', uso: 'descartada' },
  { letra: 'F', cabecalho: 'E-mail do pesquisador', campo: 'emailPesquisador', uso: 'descartada' },
  { letra: 'G', cabecalho: 'IES / Instituição', campo: 'instituicao', uso: 'painel' },
  { letra: 'H', cabecalho: 'Programa', campo: 'programa', uso: 'painel' },
  { letra: 'I', cabecalho: 'Natureza da pesquisa', campo: 'natureza', uso: 'painel' },
  { letra: 'J', cabecalho: 'Membro da CAPPE responsável por emitir parecer', campo: 'membroCappe', uso: 'descartada' },
  { letra: 'K', cabecalho: 'Acompanhamento do processo', campo: 'acompanhamento', uso: 'situacao' },
  { letra: 'L', cabecalho: 'Prazo parecer AT e CAPPE', campo: 'prazoParecer', uso: 'descartada' },
  { letra: 'M', cabecalho: 'Situação', campo: 'situacao', uso: 'situacao' },
  { letra: 'N', cabecalho: 'Cobrar da AT', campo: 'cobrarAt', uso: 'descartada' },
  { letra: 'O', cabecalho: 'Declaração de anuência', campo: 'declaracaoAnuencia', uso: 'situacao' },
  { letra: 'P', cabecalho: 'Parecer CEP', campo: 'parecerCep', uso: 'situacao' },
  { letra: 'Q', cabecalho: 'Autorização de coleta de dados', campo: 'autorizacaoColeta', uso: 'situacao' },
  { letra: 'R', cabecalho: 'Período de coleta de dados', campo: 'periodoColeta', uso: 'situacao' },
  { letra: 'S', cabecalho: 'Previsão entrega relatório parcial/final', campo: 'previsaoRelatorio', uso: 'situacao' },
  { letra: 'T', cabecalho: 'EMSP', campo: 'emsp', uso: 'descartada' },
  { letra: 'U', cabecalho: 'Distrito Sanitário', campo: 'distritoSanitario', uso: 'painel' },
  { letra: 'V', cabecalho: 'Unidade de Saúde', campo: 'unidadeSaude', uso: 'painel' },
] as const satisfies readonly { letra: string; cabecalho: string; campo: string; uso: UsoColuna }[]

export type CampoPlanilha = (typeof COLUNAS)[number]['campo']

export type ValorCelula = string | number | boolean | Date | null

/** Uma linha da planilha com as 22 colunas, exatamente como lidas. */
export type RegistroPlanilha = Record<CampoPlanilha, ValorCelula> & {
  aba: string
  /** Número da linha no Excel (a linha 1 é a do cabeçalho). */
  linha: number
}
