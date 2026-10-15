import type { Ref } from 'react'
import { formatarPercentual, pluralizar } from '../../lib/formatacao.ts'
import type { ItemDistribuicao } from '../../lib/indicadores.ts'

interface DicaGraficoProps {
  ref: Ref<HTMLDivElement>
  item: ItemDistribuicao
}

/** Dica de uma marca. Posição definida por `useMarcaAtiva`; os valores também estão nos rótulos e na tabela. */
export function DicaGrafico({ ref, item }: DicaGraficoProps) {
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 z-10 w-max max-w-64 -translate-y-full pb-2"
    >
      <div className="rounded-md bg-white px-3 py-2 shadow-lg ring-1 ring-neutral-900/10">
        <p className="text-sm font-semibold text-neutral-900">
          {pluralizar(item.quantidade, 'pesquisa', 'pesquisas')}
          <span className="font-normal text-neutral-500"> · {formatarPercentual(item.proporcao)}</span>
        </p>
        <p className="mt-0.5 text-xs text-neutral-600">{item.categoria}</p>
        {item.outros && (
          <p className="mt-0.5 text-xs text-neutral-500">Soma das categorias menos frequentes ou não padronizadas</p>
        )}
      </div>
    </div>
  )
}
