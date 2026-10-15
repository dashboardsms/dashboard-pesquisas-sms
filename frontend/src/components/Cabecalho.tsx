import { Microscope } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatarData } from '../lib/formatacao.ts'

interface CabecalhoProps {
  atualizadoEm?: string
  /** Controles exibidos ao lado do nome (filtros, links). */
  children?: ReactNode
}

export function Cabecalho({ atualizadoEm, children }: CabecalhoProps) {
  return (
    <header className="z-30 border-b-4 border-destaque bg-marca-600 text-white shadow-md md:sticky md:top-0">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 sm:px-6">
        <a
          href="/"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/15">
            <Microscope className="size-5" aria-hidden />
          </span>
          <span>
            <span className="block text-lg leading-tight font-semibold">Pesquisas da SMS</span>
            <span className="block text-xs text-marca-100">Secretaria Municipal de Saúde</span>
          </span>
        </a>

        {children && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{children}</div>}

        {atualizadoEm && (
          <p className="text-xs text-marca-100 sm:ml-auto">
            Dados atualizados em{' '}
            <time dateTime={atualizadoEm} className="font-semibold text-white">
              {formatarData(atualizadoEm)}
            </time>
          </p>
        )}
      </div>
    </header>
  )
}
