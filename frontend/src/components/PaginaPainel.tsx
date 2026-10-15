import { Info } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useBaseDePesquisas } from '../hooks/useBaseDePesquisas.ts'
import { formatarPercentual, pluralizar } from '../lib/formatacao.ts'
import {
  MESES,
  anosDisponiveis,
  calcularIndicadores,
  type Escopo,
  type Filtros,
  type Indicadores,
} from '../lib/indicadores.ts'
import { OUTRAS_INSTITUICOES, OUTROS_PROGRAMAS } from '../types/pesquisa.ts'
import { Cabecalho } from './Cabecalho.tsx'
import { CartaoIndicador } from './CartaoIndicador.tsx'
import { DialogoSobreDados } from './DialogoSobreDados.tsx'
import { EstadoCarga } from './EstadoCarga.tsx'
import { Painel } from './Painel.tsx'
import { CAMPO_VAZIO, NotaSemInformacao, PainelDistribuicao } from './PainelDistribuicao.tsx'
import { Rodape } from './Rodape.tsx'
import { SeletorFiltro } from './SeletorFiltro.tsx'
import { TabelaDistribuicao } from './TabelaDistribuicao.tsx'

export function PaginaPainel() {
  const carga = useBaseDePesquisas()
  const [filtros, setFiltros] = useState<Filtros>({ ano: 'todos', mes: 'todos', escopo: 'em_execucao' })
  const dialogo = useRef<HTMLDialogElement>(null)
  const base = carga.status === 'pronta' ? carga.base : undefined

  const anos = useMemo(() => (base ? anosDisponiveis(base.pesquisas) : []), [base])
  const indicadores = useMemo(() => base && calcularIndicadores(base.pesquisas, filtros), [base, filtros])
  const distritoPorUnidade = useMemo(
    () =>
      new Map(
        base?.pesquisas.flatMap((p) => p.unidades.flatMap((u) => (u.distrito ? [[u.nome, u.distrito] as const] : []))),
      ),
    [base],
  )

  function mudarFiltros(parcial: Partial<Filtros>) {
    setFiltros((atuais) => ({ ...atuais, ...parcial }))
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecalho atualizadoEm={base?.atualizadoEm}>
        <SeletorFiltro
          rotulo="Ano"
          valor={filtros.ano}
          opcoes={anos.map((ano) => ({ valor: ano, rotulo: String(ano) }))}
          aoMudar={(ano) => mudarFiltros({ ano })}
          desabilitado={!base}
        />
        <SeletorFiltro
          rotulo="Mês"
          valor={filtros.mes}
          opcoes={MESES.map((mes, indice) => ({ valor: indice + 1, rotulo: mes }))}
          aoMudar={(mes) => mudarFiltros({ mes })}
          desabilitado={!base}
        />
        <button
          type="button"
          onClick={() => dialogo.current?.showModal()}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Info className="size-4" aria-hidden />
          Sobre os dados
        </button>
      </Cabecalho>
      <DialogoSobreDados ref={dialogo} atualizadoEm={base?.atualizadoEm} />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6">
        <h1 className="sr-only">Painel de pesquisas da Secretaria Municipal de Saúde</h1>
        {indicadores ? (
          <Conteudo
            indicadores={indicadores}
            filtros={filtros}
            anos={anos}
            distritoPorUnidade={distritoPorUnidade}
            aoMudarEscopo={(escopo) => mudarFiltros({ escopo })}
          />
        ) : (
          <EstadoCarga status={carga.status === 'pronta' ? 'carregando' : carga.status} />
        )}
      </main>

      <Rodape />
    </div>
  )
}

interface ConteudoProps {
  indicadores: Indicadores
  filtros: Filtros
  anos: number[]
  distritoPorUnidade: Map<string, string>
  aoMudarEscopo: (escopo: Escopo) => void
}

function Conteudo({ indicadores: i, filtros, anos, distritoPorUnidade, aoMudarEscopo }: ConteudoProps) {
  const emExecucao = filtros.escopo === 'em_execucao'
  const periodo = descreverPeriodo(filtros, anos)
  const semPesquisas = emExecucao
    ? 'Nenhuma pesquisa em execução no período selecionado.'
    : 'Nenhuma pesquisa cadastrada no período selecionado.'
  const semCadastradas = 'Nenhuma pesquisa cadastrada no período selecionado.'

  return (
    <>
      <section aria-label="Indicadores gerais">
        <div className="grid gap-4 md:grid-cols-3">
          <CartaoIndicador
            titulo="Total de pesquisas cadastradas"
            valor={i.cadastradas}
            detalhe={descreverDemaisSituacoes(i.porSituacao.em_analise, i.porSituacao.cancelada)}
          />
          <CartaoIndicador
            titulo="Total de pesquisas em execução"
            valor={i.porSituacao.em_execucao}
            detalhe={`${parcela(i.porSituacao.em_execucao, i.cadastradas)} das cadastradas`}
          />
          <CartaoIndicador
            titulo="Total de pesquisas finalizadas"
            valor={i.porSituacao.finalizada}
            detalhe={`${parcela(i.porSituacao.finalizada, i.cadastradas)} das cadastradas`}
          />
        </div>
        {i.situacoesInferidas > 0 && (
          <p className="mt-2 text-xs text-neutral-600">
            {i.situacoesInferidas === i.cadastradas
              ? `A situação de todas as ${pluralizar(i.cadastradas, 'pesquisa', 'pesquisas')}`
              : `A situação de ${i.situacoesInferidas} das ${pluralizar(i.cadastradas, 'pesquisa', 'pesquisas')}`}{' '}
            foi inferida das anotações da planilha, porque a coluna “Situação” não traz valores padronizados. Veja os
            critérios em “Sobre os dados”.
          </p>
        )}
      </section>

      <section aria-labelledby="titulo-distribuicao" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="titulo-distribuicao" className="text-lg font-semibold">
              {emExecucao ? 'Pesquisas em execução' : 'Todas as pesquisas cadastradas'}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-600">
              Base: {pluralizar(i.consideradas, 'pesquisa', 'pesquisas')}
              {emExecucao ? ' em execução' : ''}, {periodo}. As proporções são calculadas sobre esse total.
            </p>
          </div>
          <AlternarEscopo escopo={filtros.escopo} aoMudar={aoMudarEscopo} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <PainelDistribuicao
            className="xl:col-span-3"
            titulo="Instituição proponente (IES)"
            descricao="Coluna “IES / Instituição”. Grafias diferentes da mesma instituição são unificadas; as instituições com menos pesquisas aparecem somadas em “Outras instituições”, e a visão em tabela lista todas."
            rotuloCategoria="Instituição"
            grafico="barras"
            distribuicao={i.porInstituicao}
            agrupar={{ limite: 8, rotulo: OUTRAS_INSTITUICOES }}
            mensagemSemPesquisas={semPesquisas}
          />
          <Painel
            className="xl:col-span-3"
            titulo="Unidade de saúde"
            descricao="Coluna “Unidade de Saúde”. Para registrar mais de uma unidade na mesma pesquisa, separe os nomes por ponto e vírgula; a pesquisa conta em cada unidade, por isso a soma das proporções pode passar de 100%."
          >
            <TabelaDistribuicao
              itens={i.porUnidade.itens}
              rotuloCategoria="Unidade de saúde"
              colunaExtra={{
                titulo: 'Distrito sanitário',
                valor: (unidade) => distritoPorUnidade.get(unidade) ?? '—',
              }}
              rotuloBusca="Buscar unidade ou distrito"
              mensagemVazia={i.porUnidade.total === 0 ? semPesquisas : CAMPO_VAZIO}
            />
            {i.porUnidade.itens.length > 0 && (
              <NotaSemInformacao quantidade={i.porUnidade.semInformacao} total={i.porUnidade.total} />
            )}
          </Painel>

          <PainelDistribuicao
            className="xl:col-span-2"
            titulo="Natureza da pesquisa"
            descricao="Coluna “Natureza da pesquisa”, agrupada em categorias. Quando a célula cita mais de um nível (por exemplo, “Graduação e Mestrado”), vale o mais alto."
            rotuloCategoria="Natureza"
            grafico="colunas"
            distribuicao={i.porNatureza}
            mensagemSemPesquisas={semPesquisas}
          />
          <PainelDistribuicao
            className="xl:col-span-2"
            titulo="Programa"
            descricao="Coluna “Programa”. Grafias que diferem só em maiúsculas e acentos são unificadas; os programas menos frequentes aparecem somados em “Outros programas”, e a visão em tabela lista todos."
            rotuloCategoria="Programa"
            grafico="barras"
            distribuicao={i.porPrograma}
            agrupar={{ limite: 8, rotulo: OUTROS_PROGRAMAS }}
            mensagemSemPesquisas={semPesquisas}
          />
          <PainelDistribuicao
            className="xl:col-span-2"
            titulo="Distrito sanitário"
            descricao="Coluna “Distrito Sanitário”. Uma pesquisa com unidades em mais de um distrito conta em cada um deles; por isso, a soma pode passar de 100%."
            rotuloCategoria="Distrito sanitário"
            grafico="colunas"
            distribuicao={i.porDistrito}
            mensagemSemPesquisas={semPesquisas}
          />
        </div>
      </section>

      <section aria-labelledby="titulo-panorama" className="mt-8">
        <h2 id="titulo-panorama" className="text-lg font-semibold">
          Panorama das pesquisas cadastradas
        </h2>
        <p className="mt-0.5 text-sm text-neutral-600">
          Todas as {pluralizar(i.cadastradas, 'pesquisa', 'pesquisas')} {periodo}, em qualquer situação.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <PainelDistribuicao
            className="xl:col-span-3"
            titulo="Situação"
            descricao="Situação de cada pesquisa: a informada na coluna “Situação”, quando padronizada, ou a inferida das anotações (critérios em “Sobre os dados”)."
            rotuloCategoria="Situação"
            grafico="barras"
            distribuicao={i.situacoes}
            mensagemSemPesquisas={semCadastradas}
          />
          <PainelDistribuicao
            className="xl:col-span-3"
            titulo={filtros.ano === 'todos' ? 'Cadastradas por ano' : `Cadastradas por mês (${filtros.ano})`}
            descricao="Pesquisas pela data de protocolo. Sem a data, o ano vem do número do protocolo e a pesquisa fica fora da contagem por mês."
            rotuloCategoria={filtros.ano === 'todos' ? 'Ano' : 'Mês'}
            grafico="colunas"
            distribuicao={i.porPeriodo}
            mensagemSemPesquisas={semCadastradas}
          />
        </div>
      </section>
    </>
  )
}

function AlternarEscopo({ escopo, aoMudar }: { escopo: Escopo; aoMudar: (escopo: Escopo) => void }) {
  const opcoes: { valor: Escopo; rotulo: string }[] = [
    { valor: 'em_execucao', rotulo: 'Em execução' },
    { valor: 'todas', rotulo: 'Todas' },
  ]
  return (
    <div role="group" aria-label="Pesquisas consideradas nos painéis" className="flex rounded-md bg-white p-0.5 shadow-sm ring-1 ring-neutral-900/10">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          aria-pressed={escopo === opcao.valor}
          onClick={() => aoMudar(opcao.valor)}
          className="rounded px-3 py-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-marca-450 aria-pressed:bg-marca-500 aria-pressed:text-white"
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  )
}

function descreverPeriodo({ ano, mes }: Filtros, anos: number[]) {
  const nomeMes = mes === 'todos' ? null : MESES[mes - 1].toLowerCase()
  if (ano !== 'todos') return nomeMes ? `com protocolo em ${nomeMes} de ${ano}` : `com protocolo em ${ano}`
  if (nomeMes) return `com protocolo em ${nomeMes} de qualquer ano`
  if (anos.length === 0) return 'sem ano de protocolo informado'
  return anos.length === 1 ? `com protocolo em ${anos[0]}` : `com protocolo de ${anos[anos.length - 1]} a ${anos[0]}`
}

function parcela(parte: number, total: number) {
  return total > 0 ? formatarPercentual(parte / total) : '—'
}

/** Explica a diferença entre as cadastradas e a soma de em execução + finalizadas. */
function descreverDemaisSituacoes(emAnalise: number, canceladas: number) {
  const partes = [
    emAnalise > 0 && pluralizar(emAnalise, 'em análise', 'em análise'),
    canceladas > 0 && pluralizar(canceladas, 'cancelada', 'canceladas'),
  ].filter(Boolean)
  return partes.length > 0 ? `Inclui ${partes.join(' e ')}` : undefined
}
