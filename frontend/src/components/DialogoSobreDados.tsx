import { X } from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import { formatarData } from '../lib/formatacao.ts'

interface DialogoSobreDadosProps {
  ref: Ref<HTMLDialogElement>
  atualizadoEm?: string
}

/** Diálogo nativo (`showModal`): Esc e o botão fecham; clique fora também. */
export function DialogoSobreDados({ ref, atualizadoEm }: DialogoSobreDadosProps) {
  return (
    <dialog
      ref={ref}
      aria-labelledby="sobre-dados-titulo"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) evento.currentTarget.close()
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl bg-white p-0 text-left text-neutral-700 shadow-2xl backdrop:bg-neutral-950/50"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id="sobre-dados-titulo" className="text-lg font-semibold text-neutral-900">
            Sobre os dados
          </h2>
          <form method="dialog">
            <button
              aria-label="Fechar"
              className="grid size-8 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-marca-450"
            >
              <X className="size-5" aria-hidden />
            </button>
          </form>
        </div>

        <dl className="mt-4 space-y-4 text-sm leading-relaxed">
          <Item termo="Fonte">
            Planilha de registro de pesquisas mantida pela Escola, importada periodicamente pelo responsável pelo
            painel.{atualizadoEm && ` Última importação em ${formatarData(atualizadoEm)}.`}
          </Item>
          <Item termo="Situação das pesquisas">
            Quando a coluna “Situação” traz um valor padronizado (Em análise, Em execução, Finalizada ou
            Cancelada), ele é usado. Caso contrário, a situação é inferida das anotações da planilha:
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li><strong className="font-semibold text-neutral-900">Cancelada:</strong> as anotações citam cancelamento, arquivamento ou desistência.</li>
              <li><strong className="font-semibold text-neutral-900">Finalizada:</strong> as anotações registram a entrega do relatório final.</li>
              <li><strong className="font-semibold text-neutral-900">Em execução:</strong> há autorização ou período de coleta de dados registrado.</li>
              <li><strong className="font-semibold text-neutral-900">Em análise:</strong> demais casos (ainda em tramitação).</li>
            </ul>
          </Item>
          <Item termo="Filtros de ano e mês">
            Consideram a data de protocolo. Sem a data, o ano vem do número do protocolo (por exemplo, 21/2022) e a
            pesquisa não entra no filtro de mês.
          </Item>
          <Item termo="Proporções">
            Calculadas sobre as pesquisas consideradas no período (em execução ou todas). Pesquisas realizadas em
            mais de uma unidade de saúde ou distrito contam em cada um deles; por isso, nesses painéis a soma pode
            passar de 100%.
          </Item>
          <Item termo="Padronização">
            Grafias diferentes da mesma instituição (por exemplo, “UFG” e “Universidade Federal de Goiás”) são
            unificadas, e a natureza é agrupada em categorias. Valores únicos que não parecem nome de instituição ou
            de programa são somados em “Outras instituições” ou “Outros programas”.
          </Item>
          <Item termo="Privacidade">
            Nomes, e-mails, títulos e anotações da planilha não são publicados: são descartados no computador de
            quem faz a importação, antes do envio.
          </Item>
        </dl>

        <p className="mt-6 rounded-lg bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-600">
          Critérios em validação com a área responsável: classificação das situações, campo usado nos filtros e
          contagem de pesquisas com mais de uma unidade ou distrito.
        </p>
      </div>
    </dialog>
  )
}

function Item({ termo, children }: { termo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-semibold text-neutral-900">{termo}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  )
}
