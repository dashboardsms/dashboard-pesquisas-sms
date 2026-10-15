import { useMarcaAtiva } from '../../hooks/useMarcaAtiva.ts'
import { formatarNumero, formatarPercentual, pluralizar } from '../../lib/formatacao.ts'
import type { ItemDistribuicao } from '../../lib/indicadores.ts'
import { DicaGrafico } from './DicaGrafico.tsx'

interface GraficoBarrasHorizontaisProps {
  itens: ItemDistribuicao[]
  titulo: string
}

/** Barras horizontais com rótulo acima de cada barra; boas para nomes longos. */
export function GraficoBarrasHorizontais({ itens, titulo }: GraficoBarrasHorizontaisProps) {
  const maximo = Math.max(...itens.map((item) => item.quantidade), 1)
  const { indice, refDica, propsGrafico, propsMarca } = useMarcaAtiva(itens.length, 'fim', itens)

  return (
    <div
      {...propsGrafico}
      role="group"
      aria-label={`${titulo}: gráfico de barras`}
      className="relative rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-marca-450"
    >
      <ul className="space-y-2.5">
        {itens.map((item, indiceItem) => {
          const ativa = indiceItem === indice
          const outros = item.outros === true
          const cor = outros
            ? ativa ? 'bg-neutral-500' : 'bg-neutral-400'
            : ativa ? 'bg-serie-ativa' : 'bg-serie'

          return (
            <li key={item.categoria} {...propsMarca(indiceItem)}>
              <span className="sr-only">
                {item.categoria}: {formatarPercentual(item.proporcao)},{' '}
                {pluralizar(item.quantidade, 'pesquisa', 'pesquisas')}
              </span>
              <div aria-hidden className="flex items-baseline justify-between gap-3 text-[13px] leading-5">
                <span className={ativa ? 'text-neutral-900' : 'text-neutral-700'}>{item.categoria}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold text-neutral-900">{formatarPercentual(item.proporcao)}</span>
                  <span className="text-neutral-500"> ({formatarNumero(item.quantidade)})</span>
                </span>
              </div>
              <div aria-hidden className="mt-1 h-2.5 rounded-r bg-neutral-100">
                <div
                  data-marca={indiceItem}
                  className={`h-full rounded-r transition-[width,background-color] duration-500 motion-reduce:transition-none ${cor}`}
                  style={{ width: `${(item.quantidade / maximo) * 100}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      {indice !== null && <DicaGrafico ref={refDica} item={itens[indice]} />}
    </div>
  )
}
