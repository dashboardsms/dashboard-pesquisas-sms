import { useMarcaAtiva } from '../../hooks/useMarcaAtiva.ts'
import { formatarPercentual, hifenizar, pluralizar } from '../../lib/formatacao.ts'
import type { ItemDistribuicao } from '../../lib/indicadores.ts'
import { DicaGrafico } from './DicaGrafico.tsx'

interface GraficoColunasProps {
  itens: ItemDistribuicao[]
  titulo: string
}

/**
 * Colunas verticais com o percentual sobre cada coluna. O subgrid alinha a base
 * de todas as colunas mesmo quando os nomes quebram em mais de uma linha.
 */
export function GraficoColunas({ itens, titulo }: GraficoColunasProps) {
  const maximo = Math.max(...itens.map((item) => item.quantidade), 1)
  const { indice, refDica, propsGrafico, propsMarca } = useMarcaAtiva(itens.length, 'centro', itens)

  return (
    <div
      {...propsGrafico}
      role="group"
      aria-label={`${titulo}: gráfico de colunas`}
      className="relative flex min-h-64 flex-1 flex-col rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-marca-450"
    >
      <ul className="grid flex-1 auto-cols-[minmax(0,1fr)] grid-flow-col grid-rows-[1fr_auto]">
        {itens.map((item, indiceItem) => {
          const ativa = indiceItem === indice
          const altura = `${(item.quantidade / maximo) * 100}%`

          return (
            <li key={item.categoria} {...propsMarca(indiceItem)} className="row-span-2 grid grid-rows-subgrid">
              <span className="sr-only">
                {item.categoria}: {formatarPercentual(item.proporcao)},{' '}
                {pluralizar(item.quantidade, 'pesquisa', 'pesquisas')}
              </span>
              <div aria-hidden className="flex justify-center border-b border-neutral-300 px-1 pt-6">
                <div className={`relative w-full max-w-6 rounded-t ${ativa ? 'bg-neutral-200' : 'bg-neutral-100'}`}>
                  <div
                    data-marca={indiceItem}
                    className={`absolute inset-x-0 bottom-0 rounded-t transition-[height,background-color] duration-500 motion-reduce:transition-none ${ativa ? 'bg-serie-ativa' : 'bg-serie'}`}
                    style={{ height: altura }}
                  />
                  <span
                    className="absolute left-1/2 mb-1 -translate-x-1/2 text-xs font-semibold whitespace-nowrap text-neutral-900 tabular-nums transition-[bottom] duration-500 motion-reduce:transition-none"
                    style={{ bottom: altura }}
                  >
                    {formatarPercentual(item.proporcao)}
                  </span>
                </div>
              </div>
              <span
                aria-hidden
                className={`px-0.5 pt-2 text-center text-xs leading-tight [overflow-wrap:anywhere] ${ativa ? 'text-neutral-900' : 'text-neutral-600'}`}
              >
                {hifenizar(item.categoria)}
              </span>
            </li>
          )
        })}
      </ul>
      {indice !== null && <DicaGrafico ref={refDica} item={itens[indice]} />}
    </div>
  )
}
