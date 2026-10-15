import { ChartBar, ChartColumn, Table2, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { formatarPercentual, pluralizar } from '../lib/formatacao.ts'
import { agruparExcedentes, type Distribuicao } from '../lib/indicadores.ts'
import { EstadoVazio } from './EstadoVazio.tsx'
import { GraficoBarrasHorizontais } from './graficos/GraficoBarrasHorizontais.tsx'
import { GraficoColunas } from './graficos/GraficoColunas.tsx'
import { Painel } from './Painel.tsx'
import { TabelaDistribuicao } from './TabelaDistribuicao.tsx'

type Visao = 'grafico' | 'tabela'

export const CAMPO_VAZIO = 'Campo não preenchido na planilha para as pesquisas selecionadas.'

interface PainelDistribuicaoProps {
  titulo: string
  descricao: string
  distribuicao: Distribuicao
  grafico: 'barras' | 'colunas'
  /** Cabeçalho da coluna de categorias na visão em tabela. */
  rotuloCategoria: string
  /** Mensagem quando não há nenhuma pesquisa no período. */
  mensagemSemPesquisas: string
  /** No gráfico, soma as categorias além das `limite` primeiras; a tabela mostra todas. */
  agrupar?: { limite: number; rotulo: string }
  className?: string
}

/** Painel de uma distribuição, com alternância entre gráfico e tabela equivalente. */
export function PainelDistribuicao({
  titulo,
  descricao,
  distribuicao,
  grafico,
  rotuloCategoria,
  mensagemSemPesquisas,
  agrupar,
  className,
}: PainelDistribuicaoProps) {
  const [visao, setVisao] = useState<Visao>('grafico')
  const { itens, semInformacao, total } = distribuicao
  const vazio = itens.every((item) => item.quantidade === 0)
  const Grafico = grafico === 'barras' ? GraficoBarrasHorizontais : GraficoColunas
  const itensGrafico = agrupar ? agruparExcedentes(itens, agrupar.limite, agrupar.rotulo) : itens

  return (
    <Painel
      titulo={titulo}
      descricao={descricao}
      className={className}
      acoes={
        !vazio && (
          <AlternarVisao
            visao={visao}
            aoMudar={setVisao}
            IconeGrafico={grafico === 'barras' ? ChartBar : ChartColumn}
          />
        )
      }
    >
      {vazio ? (
        <EstadoVazio mensagem={total === 0 ? mensagemSemPesquisas : CAMPO_VAZIO} />
      ) : (
        <>
          {visao === 'grafico' ? (
            <Grafico itens={itensGrafico} titulo={titulo} />
          ) : (
            <TabelaDistribuicao itens={itens} rotuloCategoria={rotuloCategoria} />
          )}
          <NotaSemInformacao quantidade={semInformacao} total={total} />
        </>
      )}
    </Painel>
  )
}

/** Quantas pesquisas não têm este campo preenchido; elas ficam fora das barras, mas dentro da base. */
export function NotaSemInformacao({ quantidade, total }: { quantidade: number; total: number }) {
  if (quantidade === 0 || total === 0) return null
  return (
    <p className="mt-3 border-t border-neutral-100 pt-2 text-xs text-neutral-500">
      Sem informação na planilha: {pluralizar(quantidade, 'pesquisa', 'pesquisas')} (
      {formatarPercentual(quantidade / total)}).
    </p>
  )
}

interface AlternarVisaoProps {
  visao: Visao
  aoMudar: (visao: Visao) => void
  IconeGrafico: LucideIcon
}

function AlternarVisao({ visao, aoMudar, IconeGrafico }: AlternarVisaoProps) {
  const opcoes = [
    { valor: 'grafico', rotulo: 'Ver gráfico', Icone: IconeGrafico },
    { valor: 'tabela', rotulo: 'Ver tabela', Icone: Table2 },
  ] as const

  return (
    <div role="group" aria-label="Forma de visualização" className="flex gap-0.5 rounded-md bg-marca-650/50 p-0.5">
      {opcoes.map(({ valor, rotulo, Icone }) => (
        <button
          key={valor}
          type="button"
          title={rotulo}
          aria-label={rotulo}
          aria-pressed={visao === valor}
          onClick={() => aoMudar(valor)}
          className="grid size-7 place-items-center rounded text-white/85 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white aria-pressed:bg-white aria-pressed:text-marca-600"
        >
          <Icone className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  )
}
