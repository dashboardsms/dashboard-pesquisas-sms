export const SITUACOES = ['em_analise', 'em_execucao', 'finalizada', 'cancelada']

export const ROTULOS_SITUACAO = {
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
]

/**
 * Pesquisa como publicada no painel: só campos agregáveis, sem nomes, e-mails,
 * títulos ou anotações da planilha (RN06).
 * - ano: ano da data de protocolo (ou do número do protocolo, quando falta a data), ou nulo;
 * - mes: mês (1–12) da data de protocolo; nulo quando a data não foi informada;
 * - situacao: um dos valores de SITUACOES;
 * - situacaoInformada: verdadeiro quando a coluna "Situação" trouxe um valor padronizado; falso quando foi inferida;
 * - instituicao, programa: texto ou nulo;
 * - natureza: um dos valores de NATUREZAS, ou nulo;
 * - distritos: lista de nomes;
 * - unidades: lista de { nome, distrito }, com distrito nulo quando não se sabe.
 *
 * A base publicada é { atualizadoEm: 'AAAA-MM-DD', pesquisas: [...] }; o formato é
 * conferido em src/lib/sanitizarPesquisas.js antes de gravar.
 */

/** Categorias que reúnem valores agrupados na importação ou somados nos gráficos. */
export const OUTRAS_INSTITUICOES = 'Outras instituições'
export const OUTROS_PROGRAMAS = 'Outros programas'
export const TODOS_DISTRITOS = 'Todos os distritos'
