import { COLUNAS, type RegistroPlanilha, type ValorCelula } from './estrutura.ts'
import { chaveTexto, textoCelula } from './normalizacao.ts'

export interface AbaPlanilha {
  nome: string
  linhas: unknown[][]
}

export interface LeituraPlanilha {
  registros: RegistroPlanilha[]
  abasLidas: { nome: string; registros: number }[]
  abasIgnoradas: { nome: string; motivo: string }[]
  /** Colunas depois da V, que a importação ignora. */
  colunasExtras: string[]
}

const CABECALHOS_ESPERADOS = COLUNAS.map((coluna) => chaveTexto(coluna.cabecalho))
/** O cabeçalho pode vir abaixo de algumas linhas de título. */
const LINHAS_ANTES_DO_CABECALHO = 10

/** Lê o arquivo .xlsx no navegador; nada é enviado ao servidor nesta etapa. */
export async function lerPlanilha(arquivo: File): Promise<LeituraPlanilha> {
  const { default: lerXlsx } = await import('read-excel-file/browser')
  const abas = await lerXlsx(arquivo)
  return extrairRegistros(abas.map(({ sheet, data }) => ({ nome: sheet, linhas: data as unknown[][] })))
}

/**
 * Localiza, em cada aba, o cabeçalho idêntico ao do modelo e devolve as linhas
 * seguintes com as 22 colunas exatamente como estão, sem interpretar valores.
 * Abas com outra estrutura são ignoradas e o motivo é registrado.
 */
export function extrairRegistros(abas: AbaPlanilha[]): LeituraPlanilha {
  const leitura: LeituraPlanilha = { registros: [], abasLidas: [], abasIgnoradas: [], colunasExtras: [] }

  for (const { nome, linhas } of abas) {
    const indiceCabecalho = linhas.slice(0, LINHAS_ANTES_DO_CABECALHO).findIndex(cabecalhoConfere)
    if (indiceCabecalho === -1) {
      leitura.abasIgnoradas.push({ nome, motivo: explicarDiferenca(linhas) })
      continue
    }

    linhas[indiceCabecalho].slice(COLUNAS.length).forEach((valor, deslocamento) => {
      const titulo = textoCelula(celula(valor))
      if (titulo) leitura.colunasExtras.push(`${letraDaColuna(COLUNAS.length + deslocamento)} “${titulo}” (aba ${nome})`)
    })

    let quantidade = 0
    linhas.slice(indiceCabecalho + 1).forEach((linha, deslocamento) => {
      const valores = COLUNAS.map((_, indice) => celula(linha[indice]))
      if (valores.every((valor) => valor === null)) return
      leitura.registros.push({
        ...(Object.fromEntries(COLUNAS.map((coluna, indice) => [coluna.campo, valores[indice]])) as Record<
          (typeof COLUNAS)[number]['campo'],
          ValorCelula
        >),
        aba: nome,
        linha: indiceCabecalho + 2 + deslocamento,
      })
      quantidade += 1
    })
    leitura.abasLidas.push({ nome, registros: quantidade })
  }

  return leitura
}

function cabecalhoConfere(linha: unknown[]) {
  return CABECALHOS_ESPERADOS.every((esperado, indice) => chaveTexto(textoCelula(celula(linha[indice]))) === esperado)
}

/** Aponta a primeira coluna diferente do modelo, para o responsável corrigir a planilha. */
function explicarDiferenca(linhas: unknown[][]) {
  const cabecalho = linhas
    .slice(0, LINHAS_ANTES_DO_CABECALHO)
    .find((linha) => linha.some((valor) => celula(valor) !== null))
  if (!cabecalho) return 'Aba vazia.'

  const diferentes = COLUNAS.filter(
    (_, indice) => chaveTexto(textoCelula(celula(cabecalho[indice]))) !== CABECALHOS_ESPERADOS[indice],
  )
  const primeira = diferentes[0]
  const encontrado = textoCelula(celula(cabecalho[COLUNAS.indexOf(primeira)]))
  const detalhe = `coluna ${primeira.letra} deveria ser “${primeira.cabecalho}”, mas é ${encontrado ? `“${encontrado}”` : 'vazia'}`
  return diferentes.length === 1
    ? `Cabeçalho diferente do modelo: ${detalhe}.`
    : `Cabeçalho diferente do modelo em ${diferentes.length} colunas (a primeira: ${detalhe}).`
}

/** Normaliza o valor bruto da célula; textos vazios viram nulo. */
function celula(valor: unknown): ValorCelula {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor
  if (typeof valor === 'number' || typeof valor === 'boolean') return valor
  if (typeof valor === 'string') return valor.trim() === '' ? null : valor.trim()
  return null
}

function letraDaColuna(indice: number): string {
  const letra = String.fromCharCode(65 + (indice % 26))
  return indice < 26 ? letra : letraDaColuna(Math.floor(indice / 26) - 1) + letra
}
