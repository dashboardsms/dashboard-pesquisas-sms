import { OUTRAS_INSTITUICOES, OUTROS_PROGRAMAS, SITUACOES } from '../types/pesquisa.js'
import {
  anoDoProtocolo,
  chavePrograma,
  chaveTexto,
  classificarNatureza,
  criarCanonizador,
  inferirSituacao,
  instituicaoConhecida,
  lerAnoMes,
  nivelNoPrograma,
  numeroDoProtocolo,
  pareceInstituicao,
  parecePrograma,
  separarValores,
  situacaoPadronizada,
  textoCelula,
} from './normalizacao.js'

/**
 * Converte as linhas lidas da planilha em pesquisas publicáveis. Só os campos
 * agregáveis são mantidos; nomes, e-mails, títulos e anotações são descartados
 * aqui, antes de qualquer envio.
 */
export function converterPlanilha(leitura, anoAtual = new Date().getFullYear()) {
  const avisos = criarAvisos()
  const erros = []

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

  const registros = removerDuplicados(removerReservados(leitura.registros, avisos), avisos)

  // Primeira passada: conhece todas as grafias antes de escolher os nomes publicados.
  const instituicoes = criarCanonizador()
  const programas = criarCanonizador(chavePrograma)
  const unidades = criarCanonizador()
  const distritos = criarCanonizador()
  for (const registro of registros) {
    const instituicao = textoCelula(registro.instituicao)
    if (instituicao && !instituicaoConhecida(instituicao) && !naturezaNaColunaInstituicao(instituicao)) {
      instituicoes.registrar(instituicao)
    }
    const programa = textoCelula(registro.programa)
    if (programa) programas.registrar(programa)
    new Set(separarValores(registro.unidadeSaude)).forEach(unidades.registrar)
    new Set(separarValores(registro.distritoSanitario)).forEach(distritos.registrar)
  }

  const situacoes = Object.fromEntries(SITUACOES.map((s) => [s, { informada: 0, inferida: 0 }]))
  const motivos = new Map()

  const pesquisas = registros.map((registro) => {
    const onde = `${registro.aba}, linha ${registro.linha}`

    // Ano e mês
    let periodo = lerAnoMes(registro.dataProtocolo)
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
    let situacao
    if (padronizada) {
      situacao = padronizada
      situacoes[situacao].informada += 1
    } else {
      const inferida = inferirSituacao({
        numeroProtocolo: textoCelula(registro.numeroProtocolo),
        acompanhamento: textoCelula(registro.acompanhamento),
        situacao: textoCelula(registro.situacao),
        cobrarAt: textoCelula(registro.cobrarAt),
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
    let textoInstituicao = textoCelula(registro.instituicao)
    let textoNatureza = textoCelula(registro.natureza)
    if (textoInstituicao && !textoNatureza && naturezaNaColunaInstituicao(textoInstituicao)) {
      avisos.adicionar(
        'Natureza digitada na coluna “IES / Instituição”',
        'O valor foi usado como natureza da pesquisa, e a instituição fica sem informação.',
        [`${onde} — “${textoInstituicao}”`],
      )
      textoNatureza = textoInstituicao
      textoInstituicao = ''
    }
    let instituicao = null
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
    let programa = null
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
    let natureza = null
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
      // "Pós-graduação" é genérico: o nome do programa pode dizer o nível ("Mestrado em Gestão").
      const nivel = natureza === 'Pós-graduação' && textoPrograma ? nivelNoPrograma(textoPrograma) : null
      if (nivel) {
        natureza = nivel
        avisos.adicionar('Natureza detalhada pelo programa', '“Pós-graduação” foi trocada pelo nível citado no programa.', [
          `${onde} — “${textoPrograma}” → ${nivel}`,
        ])
      }
    }

    // Distritos e unidades (podem ser vários, separados por ponto e vírgula)
    const distritosDaPesquisa = [...new Set(separarValores(registro.distritoSanitario).map(distritos.canonico))]
    const nomesUnidades = [...new Set(separarValores(registro.unidadeSaude).map(unidades.canonico))]
    const unidadesDaPesquisa = nomesUnidades.map((nome, indice) => ({
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

/**
 * Natureza digitada por engano na coluna da instituição (por exemplo, "Mestrado"):
 * o texto é um nível acadêmico e não parece nome de instituição.
 */
function naturezaNaColunaInstituicao(texto) {
  return (
    !instituicaoConhecida(texto) && !pareceInstituicao(texto) && classificarNatureza(texto).natureza !== 'Outra'
  )
}

/** Campos que só existem quando a pesquisa foi de fato protocolada. */
const CAMPOS_DA_PESQUISA = ['dataProtocolo', 'titulo', 'instituicao', 'programa', 'natureza']

/**
 * Linhas com o número de protocolo reservado e nenhum dado da pesquisa
 * ("40/2026", "PROT 40 -") ainda não são pesquisas e ficam fora do painel.
 */
function removerReservados(registros, avisos) {
  return registros.filter((registro) => {
    const reservado = CAMPOS_DA_PESQUISA.every((campo) => !textoCelula(registro[campo]))
    if (reservado) {
      avisos.adicionar(
        'Protocolo reservado sem dados da pesquisa',
        'A linha só tem o número de protocolo (sem data, título, instituição, programa e natureza) e não foi importada.',
        [`${registro.aba}, linha ${registro.linha}${textoCelula(registro.numeroProtocolo) ? ` — ${textoCelula(registro.numeroProtocolo)}` : ''}`],
      )
    }
    return !reservado
  })
}

/** Um mesmo número de protocolo em mais de uma linha: vale a última (a mais abaixo ou na última aba). */
function removerDuplicados(registros, avisos) {
  const ultimoPorProtocolo = new Map()

  for (const registro of registros) {
    const protocolo = chaveProtocolo(registro)
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
    const protocolo = chaveProtocolo(registro)
    return !protocolo || ultimoPorProtocolo.get(protocolo) === registro
  })
}

/** "03/2026 Cancelada" e "3/2026" são o mesmo protocolo. */
function chaveProtocolo(registro) {
  const texto = textoCelula(registro.numeroProtocolo)
  return numeroDoProtocolo(texto) ?? chaveTexto(texto)
}

function criarAvisos() {
  const grupos = new Map()
  return {
    adicionar(titulo, explicacao, ocorrencias) {
      const grupo = grupos.get(titulo) ?? { titulo, explicacao, ocorrencias: [] }
      grupo.ocorrencias.push(...ocorrencias)
      grupos.set(titulo, grupo)
    },
    listar: () => [...grupos.values()],
  }
}
