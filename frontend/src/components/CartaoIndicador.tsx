import { formatarNumero } from '../lib/formatacao.ts'

interface CartaoIndicadorProps {
  titulo: string
  valor: number
  detalhe?: string
}

export function CartaoIndicador({ titulo, valor, detalhe }: CartaoIndicadorProps) {
  return (
    <article className="min-w-0 rounded-lg bg-white shadow-sm ring-1 ring-neutral-900/5">
      <h3 className="rounded-t-lg bg-marca-500 px-4 py-2.5 text-sm font-medium text-white">{titulo}</h3>
      <div className="px-4 py-4">
        <p className="text-4xl font-semibold tracking-tight text-neutral-900">{formatarNumero(valor)}</p>
        {detalhe && <p className="mt-1 text-sm text-neutral-500">{detalhe}</p>}
      </div>
    </article>
  )
}
