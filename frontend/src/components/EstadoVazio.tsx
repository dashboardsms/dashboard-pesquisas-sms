import { Inbox } from 'lucide-react'

interface EstadoVazioProps {
  mensagem?: string
}

export function EstadoVazio({
  mensagem = 'Nenhuma pesquisa em execução no período selecionado.',
}: EstadoVazioProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-sm text-neutral-500">
      <Inbox className="size-6 text-neutral-400" aria-hidden />
      <p>{mensagem}</p>
    </div>
  )
}
