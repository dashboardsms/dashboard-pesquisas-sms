import { TODOS_DISTRITOS } from '../types/pesquisa.js'

/** Texto da célula em uma linha só; datas viram DD/MM/AAAA. */
export function textoCelula(valor) {
  if (valor === null) return ''
  if (valor instanceof Date) {
    const [ano, mes, dia] = valor.toISOString().slice(0, 10).split('-')
    return `${dia}/${mes}/${ano}`
  }
  return String(valor).replace(/\s+/g, ' ').trim()
}

/** Chave de comparação: minúsculas, sem acentos e com pontuação trocada por espaço. */
export function chaveTexto(texto) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Separa células com vários valores (por ponto e vírgula ou quebra de linha). */
export function separarValores(valor) {
  if (typeof valor !== 'string') return valor === null ? [] : [textoCelula(valor)]
  return valor
    .split(/[;\n\r]+/)
    .map((parte) => parte.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Distritos e unidades

/** Distritos sanitários de Goiânia e os demais valores aceitos na coluna, pela chave do texto. */
const DISTRITOS = new Map([
  ['campinas centro', 'Campinas-Centro'],
  ['campinas', 'Campinas-Centro'],
  ['leste', 'Leste'],
  ['noroeste', 'Noroeste'],
  ['norte', 'Norte'],
  ['oeste', 'Oeste'],
  ['sudoeste', 'Sudoeste'],
  ['sul', 'Sul'],
  ['gestao central', 'Gestão Central'],
  ['todos', TODOS_DISTRITOS],
  ['todos os distritos', TODOS_DISTRITOS],
])

function distritoConhecido(texto) {
  return DISTRITOS.get(chaveTexto(texto).replace(/^(distrito sanitario|distrito|ds) /, '')) ?? null
}

/**
 * Distritos de uma célula como "Sul, Noroeste e Oeste" ou "Campinas Centro e
 * Sudoeste", com os nomes padronizados. Quando algum trecho não é um distrito
 * conhecido, a célula é separada só por ponto e vírgula e `reconhecidos` é falso.
 */
export function separarDistritos(valor) {
  const trechos = separarValores(valor)
    .flatMap((parte) => parte.split(/\s*[,/]\s*|\s+e\s+/i))
    .map((parte) => parte.replace(/[.\s]+$/, ''))
    .filter(Boolean)
  const conhecidos = trechos.map(distritoConhecido)
  if (conhecidos.every(Boolean)) return { distritos: [...new Set(conhecidos)], reconhecidos: true }
  return { distritos: separarValores(valor), reconhecidos: false }
}

/** Tipos de serviço que abrem o nome de uma unidade, como em "CAIS Finsocial e CAIS Cândida de Morais". */
const INICIO_DE_UNIDADE =
  /^(CAIS|CAPS\w*|CIAMS|CSF|USF|UBS|UPA|ESF|CEREST|SAMU|Hospita(l|is)|Maternidades?|Centros?|Unidades?|Pronto|Policl[íi]nica|Ambulat[óo]rio|Servi[çc]o|Sistema|Escola|Diretoria|Coordena[çc][ãa]o|Ger[êe]ncia|Laborat[óo]rio)\b/i

/**
 * Unidades de uma célula. Além de ponto e vírgula e quebra de linha, separa por
 * vírgula seguida de maiúscula e por " e " antes de um tipo de serviço, sempre
 * fora de parênteses. "Hospital e Maternidade Dona Iris" e "Hospital Municipal
 * da Mulher e Maternidade Célia Câmara" continuam inteiros.
 */
export function separarUnidades(valor) {
  return separarValores(valor)
    .flatMap(dividirUnidades)
    .map((nome) => nome.replace(/[\s.,;]+$/, ''))
    .filter(Boolean)
    .map((nome) => unidadeConhecida(nome) ?? nome)
}

/** Unidades escritas de várias formas na planilha e o nome padronizado. */
const UNIDADES = [
  [/celia camara/, 'Hospital e Maternidade Municipal Célia Câmara'],
  [/dona iris/, 'Hospital e Maternidade Dona Íris'],
  [/nascer cidadao/, 'Maternidade Nascer Cidadão'],
]

function unidadeConhecida(texto) {
  const chave = chaveTexto(texto)
  return UNIDADES.find(([padrao]) => padrao.test(chave))?.[1] ?? null
}

function dividirUnidades(texto) {
  const partes = []
  let inicio = 0
  let profundidade = 0
  for (let indice = 0; indice < texto.length; indice++) {
    const caractere = texto[indice]
    if (caractere === '(') profundidade += 1
    else if (caractere === ')') profundidade = Math.max(0, profundidade - 1)
    if (profundidade > 0) continue

    const resto = texto.slice(indice)
    const separador = resto.match(/^,\s*(?=\p{Lu})/u) ?? resto.match(/^\s+e\s+/)
    if (!separador) continue
    const seguinte = resto.slice(separador[0].length)
    const atual = texto.slice(inicio, indice).trim()
    if (separador[0].trim() === 'e') {
      if (!INICIO_DE_UNIDADE.test(seguinte)) continue
      if (/^hospita/i.test(atual) && /^maternidade/i.test(seguinte)) continue
    }
    partes.push(atual)
    inicio = indice + separador[0].length
    indice = inicio - 1
  }
  partes.push(texto.slice(inicio).trim())
  return partes
}

// ---------------------------------------------------------------------------
// Datas

const EPOCA_EXCEL = Date.UTC(1899, 11, 30)
const DIA_MS = 86_400_000

/** Ano e mês de uma data de protocolo (célula de data, número serial do Excel ou texto DD/MM/AAAA). */
export function lerAnoMes(valor) {
  let data = null
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

/**
 * Número do protocolo sem as anotações que a planilha costuma acrescentar
 * ("03/2026 Cancelada", "29/2025 EXTENSÃO"), no formato N/AAAA.
 */
export function numeroDoProtocolo(texto) {
  const partes = texto.match(/(\d+)\s*\/\s*(\d{4}|\d{2})(?!\d)/)
  if (!partes) return null
  const ano = partes[2].length === 2 ? 2000 + Number(partes[2]) : Number(partes[2])
  return `${Number(partes[1])}/${ano}`
}

/** Ano no número do protocolo, como em "21/2022" ou "021/22". */
export function anoDoProtocolo(numero) {
  const protocolo = numeroDoProtocolo(numero)
  return protocolo ? Number(protocolo.split('/')[1]) : null
}

// ---------------------------------------------------------------------------
// Instituições

/** Variações conhecidas (comparadas pela chave do texto) e o nome padronizado. */
const INSTITUICOES = [
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

export function instituicaoConhecida(texto) {
  const chave = chaveTexto(texto)
  return INSTITUICOES.find(([padrao]) => padrao.test(chave))?.[1] ?? null
}

export function pareceInstituicao(texto) {
  return PARECE_INSTITUICAO.test(chaveTexto(texto))
}

// ---------------------------------------------------------------------------
// Programa

/** Palavras que indicam curso ou programa, para publicar valores que aparecem uma única vez. */
const PARECE_PROGRAMA =
  /graduacao|mestrado|doutorado|residencia|especializacao|curso|programa|faculdade|escola|instituto|nucleo|departamento|enfermagem|medicina|psicologia|odontologia|nutricao|fisioterapia|farmacia|saude|educacao|letras|musica|arquitetura|logia|\bpet\b|\bppg|licenciatura|bacharelado|ciencias|gestao|servico social|biomedicina|terapia|tropical|coletiva|publica|extensao|pratica|pedagogica|libras|iptsp/

export function parecePrograma(texto) {
  return PARECE_PROGRAMA.test(chaveTexto(texto))
}

/** Siglas que a planilha usa no lugar do nome do programa ou instituto. */
const SIGLAS_PROGRAMA = [[/^instituto patologia tropical e saude publica$/, 'iptsp']]

/**
 * Chave para unificar grafias do mesmo programa: além da chaveTexto, ignora
 * "Curso de" / "Faculdade de" no início, preposições e a sigla da instituição
 * no fim ("Enfermagem", "CURSO DE ENFERMAGEM"; "IPTSP", "Instituto de
 * Patologia Tropical e Saúde Pública - UFG").
 */
export function chavePrograma(texto) {
  const chave = chaveTexto(texto)
    .replace(/^(curso|faculdade) de /, '')
    .replace(/\b(de|da|do|das|dos|em)\b/g, ' ')
    .replace(/ (ufg|puc|fiocruz|iptsp)$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return SIGLAS_PROGRAMA.find(([padrao]) => padrao.test(chave))?.[1] ?? chave
}

// ---------------------------------------------------------------------------
// Natureza

/** Do nível mais alto para o mais baixo: quando o texto cita mais de um, vale o primeiro. */
const NATUREZAS_POR_PRIORIDADE = [
  [/doutorado/, 'Doutorado'],
  [/mestrado/, 'Mestrado'],
  [/residencia/, 'Residência'],
  [/especializacao/, 'Especialização'],
  [/pos graduacao|posgraduacao/, 'Pós-graduação'],
  [/(?<!pos )graduacao|\btcc\b|iniciacao cientifica/, 'Graduação'],
  [/extensao|\bpet\b/, 'Extensão'],
  [/institucional/, 'Institucional'],
]

export function classificarNatureza(texto) {
  const chave = chaveTexto(texto)
  const encontradas = NATUREZAS_POR_PRIORIDADE.filter(([padrao]) => padrao.test(chave))
  return { natureza: encontradas[0]?.[1] ?? 'Outra', varias: encontradas.length > 1 }
}

/** Níveis de pós-graduação que o nome do programa pode especificar ("Mestrado em Gestão"). */
const NIVEIS_NO_PROGRAMA = [
  [/doutorado/, 'Doutorado'],
  [/mestrado/, 'Mestrado'],
  [/residencia/, 'Residência'],
  [/especializacao/, 'Especialização'],
]

/** Nível citado no nome do programa, quando há um só. */
export function nivelNoPrograma(texto) {
  const chave = chaveTexto(texto)
  const encontrados = NIVEIS_NO_PROGRAMA.filter(([padrao]) => padrao.test(chave))
  return encontrados.length === 1 ? encontrados[0][1] : null
}

// ---------------------------------------------------------------------------
// Situação

/** Valores padronizados aceitos na coluna "Situação" (célula inteira). */
const SITUACOES_PADRONIZADAS = [
  [/^(em )?(analise|tramitacao)$/, 'em_analise'],
  [/^(em )?(execucao|andamento)$/, 'em_execucao'],
  [/^(finalizada|concluida|encerrada)$/, 'finalizada'],
  [/^(cancelada|arquivada|desistencia|indeferida)$/, 'cancelada'],
]

export function situacaoPadronizada(texto) {
  const chave = chaveTexto(texto)
  return SITUACOES_PADRONIZADAS.find(([padrao]) => padrao.test(chave))?.[1] ?? null
}

/**
 * Situação inferida das anotações quando a coluna "Situação" não traz um valor
 * padronizado. Regras provisórias (pendência 1 em docs/pendencias-validacao.md).
 */
export function inferirSituacao(textos) {
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
 * `chaveDe` define quando duas grafias são o mesmo valor.
 */
export function criarCanonizador(chaveDe = chaveTexto) {
  const variantes = new Map()

  return {
    registrar(texto) {
      const chave = chaveDe(texto)
      if (!chave) return
      const grafias = variantes.get(chave) ?? new Map()
      grafias.set(texto, (grafias.get(texto) ?? 0) + 1)
      variantes.set(chave, grafias)
    },
    canonico(texto) {
      const grafias = variantes.get(chaveDe(texto))
      if (!grafias) return texto
      // Empate: prefere a grafia que não está toda em maiúsculas e, depois, a mais curta.
      const caixaAlta = (grafia) => Number(grafia === grafia.toUpperCase())
      return [...grafias].sort(
        (a, b) => b[1] - a[1] || caixaAlta(a[0]) - caixaAlta(b[0]) || a[0].length - b[0].length,
      )[0][0]
    },
    ocorrencias(texto) {
      const grafias = variantes.get(chaveDe(texto))
      return grafias ? [...grafias.values()].reduce((soma, n) => soma + n, 0) : 0
    },
  }
}
