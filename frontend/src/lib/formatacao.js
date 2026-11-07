const numero = new Intl.NumberFormat('pt-BR')
const percentual = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export const compararTexto = new Intl.Collator('pt-BR', { numeric: true }).compare

export function formatarNumero(valor) {
  return numero.format(valor)
}

/** Recebe uma fração (0,293) e devolve o percentual formatado ("29,3%"). */
export function formatarPercentual(fracao) {
  return percentual.format(fracao)
}

/** AAAA-MM-DD → DD/MM/AAAA, sem passar por Date (evita deslocamento de fuso). */
function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

const dataHoraBrasilia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Instante da publicação (ISO 8601) → "07/11/2026 às 15:32", no horário de Brasília.
 * Bases gravadas antes de a API registrar a hora trazem só AAAA-MM-DD e saem sem ela.
 */
export function formatarDataHora(iso) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return formatarData(iso)
  const partes = Object.fromEntries(dataHoraBrasilia.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]))
  return `${partes.day}/${partes.month}/${partes.year} às ${partes.hour}:${partes.minute}`
}

export function pluralizar(quantidade, singular, plural) {
  return `${formatarNumero(quantidade)} ${quantidade === 1 ? singular : plural}`
}

/** Minúsculas e sem acentos, para buscas que ignoram a grafia. */
export function normalizarBusca(texto) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

const VOGAIS = 'aeiouáéíóúâêôãõàü'
/** Encontros que ficam na mesma sílaba: "pr", "bl", "ch", "lh", "nh"... */
const ENCONTROS = /^(?:[bcdfgkptv][lr]|[cln]h)$/

/**
 * Insere hifens opcionais (soft hyphen) entre as sílabas das palavras longas,
 * para que rótulos estreitos quebrem com hífen mesmo quando o navegador não tem
 * dicionário de hifenização. Regra simplificada do português: separa antes de
 * consoante seguida de vogal, sem separar encontros como "tr" e "lh".
 */
export function hifenizar(texto, tamanhoMinimo = 8) {
  return texto.replace(/\p{L}+/gu, (palavra) =>
    palavra.length < tamanhoMinimo ? palavra : separarSilabas(palavra),
  )
}

function separarSilabas(palavra) {
  const letras = palavra.toLowerCase()
  const vogal = (posicao) => VOGAIS.includes(letras[posicao])
  const quebras = []
  for (let posicao = 1; posicao < letras.length - 1; posicao++) {
    if (vogal(posicao) || !vogal(posicao + 1)) continue
    const encontro = !vogal(posicao - 1) && ENCONTROS.test(letras.slice(posicao - 1, posicao + 1))
    const inicio = encontro ? posicao - 1 : posicao
    if (inicio >= 2 && letras.length - inicio >= 2) quebras.push(inicio)
  }
  return quebras.reduceRight(
    (resultado, posicao) => `${resultado.slice(0, posicao)}­${resultado.slice(posicao)}`,
    palavra,
  )
}
