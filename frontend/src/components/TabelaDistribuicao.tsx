import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  compararTexto,
  formatarNumero,
  formatarPercentual,
  normalizarBusca,
} from '../lib/formatacao.ts'
import type { ItemDistribuicao } from '../lib/indicadores.ts'
import { EstadoVazio } from './EstadoVazio.tsx'

type Chave = 'categoria' | 'extra' | 'quantidade' | 'proporcao'
type Ordenacao = { chave: Chave; direcao: 'asc' | 'desc' } | null

interface ColunaExtra {
  titulo: string
  valor: (categoria: string) => string
}

interface TabelaDistribuicaoProps {
  itens: ItemDistribuicao[]
  rotuloCategoria: string
  /** Coluna adicional derivada da categoria (por exemplo, o distrito da unidade). */
  colunaExtra?: ColunaExtra
  /** Texto do campo de busca; sem ele, a tabela não tem busca. */
  rotuloBusca?: string
  itensPorPagina?: number
  /** Mensagem quando não há itens. */
  mensagemVazia?: string
}

/**
 * Tabela ordenável e paginada de uma distribuição. Sem ordenação escolhida,
 * mantém a ordem recebida (maior para menor, ou a ordem natural da categoria).
 */
export function TabelaDistribuicao({
  itens,
  rotuloCategoria,
  colunaExtra,
  rotuloBusca,
  itensPorPagina = 8,
  mensagemVazia,
}: TabelaDistribuicaoProps) {
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<Ordenacao>(null)
  const [pagina, setPagina] = useState(1)

  if (itens.length === 0) return <EstadoVazio mensagem={mensagemVazia} />

  const extra = (item: ItemDistribuicao) => colunaExtra?.valor(item.categoria) ?? ''
  const termo = normalizarBusca(busca.trim())
  const filtradas = termo
    ? itens.filter((item) => normalizarBusca(`${item.categoria} ${extra(item)}`).includes(termo))
    : itens
  const linhas = ordenacao ? [...filtradas].sort(comparador(ordenacao, extra)) : filtradas

  const totalPaginas = Math.max(1, Math.ceil(linhas.length / itensPorPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * itensPorPagina
  const visiveis = linhas.slice(inicio, inicio + itensPorPagina)
  const maiorProporcao = Math.max(...itens.map((item) => item.proporcao)) || 1

  function ordenar(chave: Chave) {
    setOrdenacao((atual) => proximaOrdenacao(atual, chave))
    setPagina(1)
  }

  const propsCabecalho = { ordenacao, aoOrdenar: ordenar }

  return (
    <div className="flex flex-1 flex-col">
      {rotuloBusca && (
        <label className="relative mb-3 block">
          <span className="sr-only">{rotuloBusca}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={busca}
            placeholder={rotuloBusca}
            onChange={(evento) => {
              setBusca(evento.target.value)
              setPagina(1)
            }}
            className="w-full rounded-md border border-slate-300 bg-white py-1.5 pr-3 pl-8 text-sm placeholder:text-slate-400 focus:border-marca-450 focus:ring-2 focus:ring-marca-200 focus:outline-none"
          />
        </label>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-xs text-slate-600">
              <CabecalhoOrdenavel chave="categoria" {...propsCabecalho}>
                {rotuloCategoria}
              </CabecalhoOrdenavel>
              {colunaExtra && (
                <CabecalhoOrdenavel chave="extra" className="hidden sm:table-cell" {...propsCabecalho}>
                  {colunaExtra.titulo}
                </CabecalhoOrdenavel>
              )}
              <CabecalhoOrdenavel chave="quantidade" alinharDireita {...propsCabecalho}>
                Quantidade
              </CabecalhoOrdenavel>
              <CabecalhoOrdenavel chave="proporcao" alinharDireita {...propsCabecalho}>
                Proporção
              </CabecalhoOrdenavel>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((item) => (
              <tr key={item.categoria} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="py-2 pr-3 text-slate-800">
                  {item.categoria}
                  {colunaExtra && <span className="block text-xs text-slate-500 sm:hidden">{extra(item)}</span>}
                </td>
                {colunaExtra && <td className="hidden py-2 pr-3 text-slate-600 sm:table-cell">{extra(item)}</td>}
                <td className="py-2 pl-3 text-right text-slate-800 tabular-nums">
                  {formatarNumero(item.quantidade)}
                </td>
                <td className="py-2 pl-3">
                  <div className="flex items-center justify-end gap-2 text-slate-800 tabular-nums">
                    {formatarPercentual(item.proporcao)}
                    <span aria-hidden className="h-1.5 w-12 shrink-0 rounded-r bg-slate-100">
                      <span
                        className="block h-full rounded-r bg-serie"
                        style={{ width: `${(item.proporcao / maiorProporcao) * 100}%` }}
                      />
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {linhas.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">Nenhum resultado para “{busca.trim()}”.</p>
        )}
      </div>

      {linhas.length > itensPorPagina && (
        <Paginacao
          pagina={paginaAtual}
          totalPaginas={totalPaginas}
          resumo={`${inicio + 1}–${inicio + visiveis.length} de ${linhas.length}`}
          aoMudar={setPagina}
        />
      )}
    </div>
  )
}

interface CabecalhoOrdenavelProps {
  chave: Chave
  ordenacao: Ordenacao
  aoOrdenar: (chave: Chave) => void
  alinharDireita?: boolean
  className?: string
  children: ReactNode
}

function CabecalhoOrdenavel({
  chave,
  ordenacao,
  aoOrdenar,
  alinharDireita = false,
  className = '',
  children,
}: CabecalhoOrdenavelProps) {
  const direcao = ordenacao?.chave === chave ? ordenacao.direcao : null
  const Icone = direcao === 'asc' ? ArrowUp : direcao === 'desc' ? ArrowDown : ArrowUpDown

  return (
    <th
      scope="col"
      aria-sort={direcao === 'asc' ? 'ascending' : direcao === 'desc' ? 'descending' : undefined}
      className={`py-2 font-semibold ${alinharDireita ? 'pl-3 text-right' : 'pr-3 text-left'} ${className}`}
    >
      <button
        type="button"
        onClick={() => aoOrdenar(chave)}
        className="inline-flex items-center gap-1 rounded-sm hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-450"
      >
        {children}
        <Icone className={`size-3.5 ${direcao ? 'text-marca-500' : 'text-slate-400'}`} aria-hidden />
      </button>
    </th>
  )
}

interface PaginacaoProps {
  pagina: number
  totalPaginas: number
  resumo: string
  aoMudar: (pagina: number) => void
}

function Paginacao({ pagina, totalPaginas, resumo, aoMudar }: PaginacaoProps) {
  const estiloBotao =
    'grid h-7 min-w-7 place-items-center rounded px-1.5 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-marca-450'

  return (
    <nav
      aria-label="Paginação da tabela"
      className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-slate-600"
    >
      <p className="tabular-nums">Exibindo {resumo}</p>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="Página anterior"
          disabled={pagina === 1}
          onClick={() => aoMudar(pagina - 1)}
          className={estiloBotao}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        {paginasVisiveis(pagina, totalPaginas).map((numero, posicao) =>
          numero === null ? (
            <span key={`intervalo-${posicao}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={numero}
              type="button"
              aria-label={`Página ${numero}`}
              aria-current={numero === pagina ? 'page' : undefined}
              onClick={() => aoMudar(numero)}
              className={`${estiloBotao} tabular-nums aria-[current=page]:bg-marca-500 aria-[current=page]:font-semibold aria-[current=page]:text-white`}
            >
              {numero}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Próxima página"
          disabled={pagina === totalPaginas}
          onClick={() => aoMudar(pagina + 1)}
          className={estiloBotao}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </nav>
  )
}

/** Números de página a exibir; `null` marca um intervalo omitido. */
function paginasVisiveis(atual: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, posicao) => posicao + 1)
  const paginas = [...new Set([1, atual - 1, atual, atual + 1, total])]
    .filter((numero) => numero >= 1 && numero <= total)
    .sort((a, b) => a - b)
  return paginas.flatMap((numero, posicao) =>
    posicao > 0 && numero - paginas[posicao - 1] > 1 ? [null, numero] : [numero],
  )
}

/** Primeiro clique: ordem mais útil da coluna; segundo: inverte; terceiro: volta à ordem original. */
function proximaOrdenacao(atual: Ordenacao, chave: Chave): Ordenacao {
  const inicial = chave === 'quantidade' || chave === 'proporcao' ? 'desc' : 'asc'
  if (atual?.chave !== chave) return { chave, direcao: inicial }
  if (atual.direcao === inicial) return { chave, direcao: inicial === 'asc' ? 'desc' : 'asc' }
  return null
}

function comparador(ordenacao: NonNullable<Ordenacao>, extra: (item: ItemDistribuicao) => string) {
  const sinal = ordenacao.direcao === 'asc' ? 1 : -1
  return (a: ItemDistribuicao, b: ItemDistribuicao) => {
    switch (ordenacao.chave) {
      case 'categoria':
        return sinal * compararTexto(a.categoria, b.categoria)
      case 'extra':
        return sinal * compararTexto(extra(a), extra(b)) || compararTexto(a.categoria, b.categoria)
      case 'quantidade':
        return sinal * (a.quantidade - b.quantidade)
      case 'proporcao':
        return sinal * (a.proporcao - b.proporcao)
    }
  }
}
