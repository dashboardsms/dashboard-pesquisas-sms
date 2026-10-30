import { ChartBar, ChartColumn, Table2 } from 'lucide-react'
import { useState } from 'react'
import { formatarPercentual, pluralizar } from '../lib/formatacao.js'
import { agruparExcedentes } from '../lib/indicadores.js'
import { EstadoVazio } from './EstadoVazio.jsx'
import { GraficoBarrasHorizontais } from './graficos/GraficoBarrasHorizontais.jsx'
import { GraficoColunas } from './graficos/GraficoColunas.jsx'
import { Painel } from './Painel.jsx'
import { TabelaDistribuicao } from './TabelaDistribuicao.jsx'

export const CAMPO_VAZIO = 'Campo não preenchido na planilha para as pesquisas selecionadas.'

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
}) {
  const [visao, setVisao] = useState('grafico')
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
export function NotaSemInformacao({ quantidade, total }) {
  if (quantidade === 0 || total === 0) return null
  return (
    <p className="mt-3 border-t border-neutral-100 pt-2 text-xs text-neutral-500">
      Sem informação na planilha: {pluralizar(quantidade, 'pesquisa', 'pesquisas')} (
      {formatarPercentual(quantidade / total)}).
    </p>
  )
}

function AlternarVisao({ visao, aoMudar, IconeGrafico }) {
  const opcoes = [
    { valor: 'grafico', rotulo: 'Ver gráfico', Icone: IconeGrafico },
    { valor: 'tabela', rotulo: 'Ver tabela', Icone: Table2 },
  ]

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
