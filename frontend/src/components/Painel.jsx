import { useId } from 'react'
import { InfoDica } from './InfoDica.jsx'

export function Painel({ titulo, descricao, acoes, className = '', children }) {
  const idTitulo = useId()

  return (
    <section
      aria-labelledby={idTitulo}
      className={`flex min-w-0 flex-col rounded-lg bg-white shadow-sm ring-1 ring-neutral-900/5 ${className}`}
    >
      <header className="relative flex min-h-11 items-center gap-1.5 rounded-t-lg bg-marca-500 py-1.5 pr-2 pl-4 text-white">
        <h3 id={idTitulo} className="text-sm font-medium">
          {titulo}
        </h3>
        <InfoDica texto={descricao} rotulo={`Sobre o painel ${titulo}`} />
        {acoes && <div className="ml-auto">{acoes}</div>}
      </header>
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </section>
  )
}
