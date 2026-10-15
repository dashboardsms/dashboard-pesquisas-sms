import {
  OUTRAS_INSTITUICOES,
  OUTROS_PROGRAMAS,
  SITUACOES,
  type Pesquisa,
  type Situacao,
  type UnidadeSaude,
} from '../types/pesquisa.ts'
import type { RegistroPlanilha } from './estrutura.ts'
import type { LeituraPlanilha } from './lerPlanilha.ts'
import {
  anoDoProtocolo,
  chaveTexto,
  classificarNatureza,
  criarCanonizador,
  inferirSituacao,
  instituicaoConhecida,
  lerAnoMes,
  pareceInstituicao,
  parecePrograma,
  separarValores,
  situacaoPadronizada,
  textoCelula,
} from './normalizacao.ts'

export interface GrupoAvisos {
  titulo: string
  explicacao: string
  /** Onde ocorreu, por exemplo "PESQUISA 2026, linha 12 — “Mestrado”". */
  ocorrencias: string[]
}

export interface ResultadoImportacao {
  pesquisas: Pesquisa[]
  leitura: LeituraPlanilha
  /** Problemas que impedem a publicação. */
  erros: string[]
  avisos: GrupoAvisos[]
  situacoes: Record<Situacao, { informada: number; inferida: number }>
  /** Por que cada situação inferida foi atribuída. */
  motivos: { situacao: Situacao; motivo: string; quantidade: number }[]
}

/**
 * Converte as linhas lidas da planilha em pesquisas publicáveis. Só os campos
 * agregáveis são mantidos; nomes, e-mails, títulos e anotações são descartados
 * aqui, antes de qualquer envio.
 */
export function converterPlanilha(leitura: LeituraPlanilha, anoAtual = new Date().getFullYear()): ResultadoImportacao {
  const avisos = criarAvisos()
  const erros: string[] = []

  if (leitura.abasLidas.length === 0) {
    erros.push('Nenhuma aba segue a estrutura do modelo (colunas A a V).')
  } else if (leitura.registros.length === 0) {
    erros.push('A planilha não tem nenhum registro de pesquisa abaixo do cabeçalho.')
  }
  if (leitura.colunasExtras.length > 0) {
    avisos.adicionar(
      'Colunas além da V foram ignoradas',
      'A importação lê apenas as colunas do modelo.',
      leitura.colunasExtras,
    )
  }

  const registros = removerDuplicados(leitura.registros, avisos)

  // Primeira passada: conhece todas as grafias antes de escolher os nomes publicados.
  const instituicoes = criarCanonizador()
  const programas = criarCanonizador()
  const unidades = criarCanonizador()
  const distritos = criarCanonizador()
  for (const registro of registros) {
    const instituicao = textoCelula(registro.instituicao)
    if (instituicao && !instituicaoConhecida(instituicao)) instituicoes.registrar(instituicao)
    const programa = textoCelula(registro.programa)
    if (programa) programas.registrar(programa)
    new Set(separarValores(registro.unidadeSaude)).forEach(unidades.registrar)
    new Set(separarValores(registro.distritoSanitario)).forEach(distritos.registrar)
  }

  const situacoes = Object.fromEntries(SITUACOES.map((s) => [s, { informada: 0, inferida: 0 }])) as ResultadoImportacao['situacoes']
  const motivos = new Map<string, { situacao: Situacao; motivo: string; quantidade: number }>()

  const pesquisas = registros.map((registro): Pesquisa => {
    const onde = `${registro.aba}, linha ${registro.linha}`

    // Ano e mês
    let periodo: { ano: number | null; mes: number | null } | null = lerAnoMes(registro.dataProtocolo)
    if (!periodo) {
      const ano = anoDoProtocolo(textoCelula(registro.numeroProtocolo))
      periodo = { ano, mes: null }
      if (ano) {
        avisos.adicionar('Sem data de protocolo', 'O ano foi obtido do número do protocolo; o mês fica sem informação.', [onde])
      } else {
        avisos.adicionar('Sem data nem ano de protocolo', 'A pesquisa conta no total, mas não aparece nos filtros de ano e mês.', [onde])
      }
    }
    if (periodo.ano !== null && (periodo.ano < 2000 || periodo.ano > anoAtual + 1)) {
      avisos.adicionar('Ano de protocolo fora do esperado', `Anos aceitos: de 2000 a ${anoAtual + 1}. O ano foi descartado.`, [
        `${onde} — ${periodo.ano}`,
      ])
      periodo = { ano: null, mes: null }
    }

    // Situação
    const padronizada = situacaoPadronizada(textoCelula(registro.situacao))
    let situacao: Situacao
    if (padronizada) {
      situacao = padronizada
      situacoes[situacao].informada += 1
    } else {
      const inferida = inferirSituacao({
        acompanhamento: textoCelula(registro.acompanhamento),
        situacao: textoCelula(registro.situacao),
        declaracaoAnuencia: textoCelula(registro.declaracaoAnuencia),
        parecerCep: textoCelula(registro.parecerCep),
        autorizacaoColeta: textoCelula(registro.autorizacaoColeta),
        periodoColeta: textoCelula(registro.periodoColeta),
        previsaoRelatorio: textoCelula(registro.previsaoRelatorio),
      })
      situacao = inferida.situacao
      situacoes[situacao].inferida += 1
      const chave = `${situacao}|${inferida.motivo}`
      const contagem = motivos.get(chave) ?? { situacao, motivo: inferida.motivo, quantidade: 0 }
      contagem.quantidade += 1
      motivos.set(chave, contagem)
    }

    // Instituição
    const textoInstituicao = textoCelula(registro.instituicao)
    let instituicao: string | null = null
    if (!textoInstituicao) {
      avisos.adicionar('Sem IES / Instituição', 'Aparece como “sem informação” no painel de instituições.', [onde])
    } else {
      instituicao = instituicaoConhecida(textoInstituicao)
      if (!instituicao && (pareceInstituicao(textoInstituicao) || instituicoes.ocorrencias(textoInstituicao) > 1)) {
        instituicao = instituicoes.canonico(textoInstituicao)
        avisos.adicionar('Instituição fora da lista de padronização', 'Publicada como escrita na planilha.', [
          `${onde} — “${textoInstituicao}”`,
        ])
      } else if (!instituicao) {
        instituicao = OUTRAS_INSTITUICOES
        avisos.adicionar(
          'Instituição não reconhecida, agrupada em “Outras instituições”',
          'Valor único que não parece nome de instituição; não é publicado para evitar expor dados digitados por engano.',
          [`${onde} — “${textoInstituicao}”`],
        )
      }
    }

    // Programa
    const textoPrograma = textoCelula(registro.programa)
    let programa: string | null = null
    if (textoPrograma) {
      if (parecePrograma(textoPrograma) || programas.ocorrencias(textoPrograma) > 1) {
        programa = programas.canonico(textoPrograma)
      } else {
        programa = OUTROS_PROGRAMAS
        avisos.adicionar(
          'Programa agrupado em “Outros programas”',
          'Valor único que não parece nome de curso ou programa; não é publicado para evitar expor dados digitados por engano.',
          [`${onde} — “${textoPrograma}”`],
        )
      }
    }

    // Natureza
    const textoNatureza = textoCelula(registro.natureza)
    let natureza: Pesquisa['natureza'] = null
    if (!textoNatureza) {
      avisos.adicionar('Sem natureza da pesquisa', 'Aparece como “sem informação” no painel de natureza.', [onde])
    } else {
      const classificacao = classificarNatureza(textoNatureza)
      natureza = classificacao.natureza
      if (natureza === 'Outra') {
        avisos.adicionar('Natureza classificada como “Outra”', 'O texto não corresponde a nenhuma categoria padrão.', [
          `${onde} — “${textoNatureza}”`,
        ])
      } else if (classificacao.varias) {
        avisos.adicionar('Mais de uma natureza na mesma célula', 'Foi considerado o nível acadêmico mais alto.', [
          `${onde} — “${textoNatureza}” → ${natureza}`,
        ])
      }
    }

    // Distritos e unidades (podem ser vários, separados por ponto e vírgula)
    const distritosDaPesquisa = [...new Set(separarValores(registro.distritoSanitario).map(distritos.canonico))]
    const nomesUnidades = [...new Set(separarValores(registro.unidadeSaude).map(unidades.canonico))]
    const unidadesDaPesquisa: UnidadeSaude[] = nomesUnidades.map((nome, indice) => ({
      nome,
      distrito:
        distritosDaPesquisa.length === 1
          ? distritosDaPesquisa[0]
          : distritosDaPesquisa.length === nomesUnidades.length
            ? distritosDaPesquisa[indice]
            : null,
    }))

    return {
      ano: periodo.ano,
      mes: periodo.mes,
      situacao,
      situacaoInformada: padronizada !== null,
      instituicao,
      programa,
      natureza,
      distritos: distritosDaPesquisa,
      unidades: unidadesDaPesquisa,
    }
  })

  if (registros.length > 0 && registros.every((r) => !textoCelula(r.unidadeSaude))) {
    avisos.adicionar('Coluna “Unidade de Saúde” vazia', 'O painel de unidades ficará sem dados.', ['Todas as linhas'])
  }
  if (registros.length > 0 && registros.every((r) => !textoCelula(r.distritoSanitario))) {
    avisos.adicionar('Coluna “Distrito Sanitário” vazia', 'O painel de distritos ficará sem dados.', ['Todas as linhas'])
  }

  return {
    pesquisas,
    leitura,
    erros,
    avisos: avisos.listar(),
    situacoes,
    motivos: [...motivos.values()].sort((a, b) => b.quantidade - a.quantidade),
  }
}

/** Um mesmo número de protocolo em mais de uma linha: vale a última (a mais abaixo ou na última aba). */
function removerDuplicados(registros: RegistroPlanilha[], avisos: ReturnType<typeof criarAvisos>) {
  const ultimoPorProtocolo = new Map<string, RegistroPlanilha>()

  for (const registro of registros) {
    const protocolo = chaveTexto(textoCelula(registro.numeroProtocolo))
    if (!protocolo) {
      avisos.adicionar('Sem número de protocolo', 'A linha foi importada, mas não pode ser conferida contra duplicidades.', [
        `${registro.aba}, linha ${registro.linha}`,
      ])
      continue
    }
    const anterior = ultimoPorProtocolo.get(protocolo)
    if (anterior) {
      avisos.adicionar('Número de protocolo repetido', 'Foi mantida apenas a última linha com o mesmo protocolo.', [
        `${textoCelula(registro.numeroProtocolo)}: ${anterior.aba}, linha ${anterior.linha} e ${registro.aba}, linha ${registro.linha}`,
      ])
    }
    ultimoPorProtocolo.set(protocolo, registro)
  }

  return registros.filter((registro) => {
    const protocolo = chaveTexto(textoCelula(registro.numeroProtocolo))
    return !protocolo || ultimoPorProtocolo.get(protocolo) === registro
  })
}

function criarAvisos() {
  const grupos = new Map<string, GrupoAvisos>()
  return {
    adicionar(titulo: string, explicacao: string, ocorrencias: string[]) {
      const grupo = grupos.get(titulo) ?? { titulo, explicacao, ocorrencias: [] }
      grupo.ocorrencias.push(...ocorrencias)
      grupos.set(titulo, grupo)
    },
    listar: () => [...grupos.values()],
  }
}
