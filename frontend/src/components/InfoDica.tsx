import { Info } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

interface InfoDicaProps {
  texto: string
  rotulo: string
}

/**
 * Ícone de informação do cabeçalho de um painel. Abre ao passar o mouse e fica
 * fixo com clique ou toque; fecha com Esc ou clique fora. O texto ocupa a
 * largura do cabeçalho, então não sai da tela em celulares.
 */
export function InfoDica({ texto, rotulo }: InfoDicaProps) {
  const id = useId()
  const raiz = useRef<HTMLSpanElement>(null)
  const [sobMouse, setSobMouse] = useState(false)
  const [fixa, setFixa] = useState(false)
  const aberta = sobMouse || fixa

  useEffect(() => {
    if (!fixa) return
    function fecharAoClicarFora(evento: PointerEvent) {
      if (!raiz.current?.contains(evento.target as Node)) setFixa(false)
    }
    function fecharComEsc(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setFixa(false)
    }
    document.addEventListener('pointerdown', fecharAoClicarFora)
    document.addEventListener('keydown', fecharComEsc)
    return () => {
      document.removeEventListener('pointerdown', fecharAoClicarFora)
      document.removeEventListener('keydown', fecharComEsc)
    }
  }, [fixa])

  return (
    <span
      ref={raiz}
      className="flex"
      onPointerEnter={(evento) => {
        if (evento.pointerType === 'mouse') setSobMouse(true)
      }}
      onPointerLeave={(evento) => {
        if (evento.pointerType === 'mouse') setSobMouse(false)
      }}
    >
      <button
        type="button"
        aria-label={rotulo}
        aria-expanded={aberta}
        aria-controls={id}
        onClick={() => setFixa((atual) => !atual)}
        className="grid size-6 place-items-center rounded-full text-white/80 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
      >
        <Info className="size-4" aria-hidden />
      </button>
      <span
        id={id}
        hidden={!aberta}
        className="absolute inset-x-3 top-full z-20 mt-1.5 max-w-md rounded-md bg-white p-3 text-xs leading-relaxed font-normal text-neutral-700 shadow-lg ring-1 ring-neutral-900/10"
      >
        {texto}
      </span>
    </span>
  )
}
