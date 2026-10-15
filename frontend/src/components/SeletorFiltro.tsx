import { ChevronDown } from 'lucide-react'
import { useId } from 'react'

interface SeletorFiltroProps {
  rotulo: string
  valor: number | 'todos'
  opcoes: { valor: number; rotulo: string }[]
  aoMudar: (valor: number | 'todos') => void
  desabilitado?: boolean
}

export function SeletorFiltro({ rotulo, valor, opcoes, aoMudar, desabilitado = false }: SeletorFiltroProps) {
  const id = useId()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <span className="relative">
        <select
          id={id}
          value={valor}
          disabled={desabilitado}
          onChange={(evento) => aoMudar(evento.target.value === 'todos' ? 'todos' : Number(evento.target.value))}
          className="appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-sm font-medium text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
        >
          <option value="todos">Todos</option>
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
      </span>
    </div>
  )
}
