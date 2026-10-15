import { FileSpreadsheet, LoaderCircle, TriangleAlert } from 'lucide-react'

interface EstadoCargaProps {
  status: 'carregando' | 'erro' | 'vazia'
}

export function EstadoCarga({ status }: EstadoCargaProps) {
  return (
    <div
      role={status === 'erro' ? 'alert' : 'status'}
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center text-neutral-600"
    >
      {status === 'carregando' && (
        <>
          <LoaderCircle className="size-8 animate-spin text-marca-500 motion-reduce:animate-none" aria-hidden />
          <p>Carregando dados…</p>
        </>
      )}
      {status === 'erro' && (
        <>
          <TriangleAlert className="size-8 text-amber-600" aria-hidden />
          <p>Não foi possível carregar os dados do painel. Tente novamente mais tarde.</p>
        </>
      )}
      {status === 'vazia' && (
        <>
          <FileSpreadsheet className="size-8 text-neutral-400" aria-hidden />
          <p>Nenhuma planilha foi importada ainda.</p>
          <a
            href="/importar"
            className="rounded-md bg-marca-500 px-4 py-2 text-sm font-medium text-white hover:bg-marca-550 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-450"
          >
            Importar planilha
          </a>
        </>
      )}
    </div>
  )
}
