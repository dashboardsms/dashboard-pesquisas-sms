import { Landmark } from 'lucide-react'

const ANO_ATUAL = new Date().getFullYear()

export function Rodape() {
  return (
    <footer className="mt-12 border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-5 px-4 py-8 text-center sm:px-6">
        {/* Marcas provisórias: substituir pelas logomarcas oficiais do Município e da SMS. */}
        <ul aria-label="Instituições responsáveis" className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          <li className="flex items-center gap-2">
            <span className="rounded bg-marca-600 px-1.5 py-0.5 text-sm font-black tracking-tight text-white">SUS</span>
            <span className="text-left text-xs leading-tight text-neutral-600">
              Sistema Único
              <br />
              de Saúde
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-lg font-bold text-marca-600">SMS</span>
            <span className="text-left text-xs leading-tight text-neutral-600">
              Secretaria Municipal
              <br />
              de Saúde
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Landmark className="size-6 text-marca-600" aria-hidden />
            <span className="text-left text-xs leading-tight text-neutral-600">
              Prefeitura
              <br />
              Municipal
            </span>
          </li>
        </ul>
        <p className="text-xs text-neutral-500">
          © {ANO_ATUAL} Secretaria Municipal de Saúde · Dashboard de Pesquisas ·{' '}
          <a href="/importar" className="underline decoration-neutral-300 underline-offset-2 hover:text-neutral-700">
            Importar planilha (acesso restrito)
          </a>
        </p>
      </div>
    </footer>
  )
}
