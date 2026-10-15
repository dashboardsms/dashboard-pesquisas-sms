import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  FileSpreadsheet,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { publicarPesquisas } from '../data/api.ts'
import { useBaseDePesquisas } from '../hooks/useBaseDePesquisas.ts'
import { formatarData, formatarNumero, pluralizar } from '../lib/formatacao.ts'
import { converterPlanilha, type GrupoAvisos, type ResultadoImportacao } from '../planilha/converterPlanilha.ts'
import { COLUNAS, type UsoColuna } from '../planilha/estrutura.ts'
import { lerPlanilha } from '../planilha/lerPlanilha.ts'
import { ROTULOS_SITUACAO, SITUACOES, type Situacao } from '../types/pesquisa.ts'
import { Cabecalho } from './Cabecalho.tsx'
import { Rodape } from './Rodape.tsx'

type Leitura =
  | { status: 'inicial' }
  | { status: 'lendo'; arquivo: string }
  | { status: 'falhou'; arquivo: string }
  | { status: 'lida'; arquivo: string; resultado: ResultadoImportacao }

type Publicacao =
  | { status: 'inicial' }
  | { status: 'enviando' }
  | { status: 'publicada'; atualizadoEm: string; pesquisas: number }
  | { status: 'falhou'; mensagem: string }

/** Singular e plural para frases como "2 canceladas". */
const SITUACAO_NO_TEXTO: Record<Situacao, [string, string]> = {
  em_analise: ['em análise', 'em análise'],
  em_execucao: ['em execução', 'em execução'],
  finalizada: ['finalizada', 'finalizadas'],
  cancelada: ['cancelada', 'canceladas'],
}

const ROTULOS_USO: Record<UsoColuna, { rotulo: string; classe: string }> = {
  painel: { rotulo: 'Painel', classe: 'bg-marca-100 text-marca-700' },
  situacao: { rotulo: 'Situação', classe: 'bg-sky-100 text-sky-900' },
  apoio: { rotulo: 'Apoio', classe: 'bg-slate-200 text-slate-700' },
  descartada: { rotulo: 'Descartada', classe: 'bg-slate-100 text-slate-500 line-through' },
}

export function PaginaImportacao() {
  const carga = useBaseDePesquisas()
  const [leitura, setLeitura] = useState<Leitura>({ status: 'inicial' })
  const [publicacao, setPublicacao] = useState<Publicacao>({ status: 'inicial' })
  const [senha, setSenha] = useState('')
  const atual = carga.status === 'pronta' ? carga.base : undefined
  const resultado = leitura.status === 'lida' ? leitura.resultado : undefined
  const podePublicar = resultado !== undefined && resultado.erros.length === 0 && senha.length > 0

  async function lerArquivo(arquivo: File) {
    setPublicacao({ status: 'inicial' })
    setLeitura({ status: 'lendo', arquivo: arquivo.name })
    try {
      const resultado = converterPlanilha(await lerPlanilha(arquivo))
      setLeitura({ status: 'lida', arquivo: arquivo.name, resultado })
    } catch {
      setLeitura({ status: 'falhou', arquivo: arquivo.name })
    }
  }

  async function publicar(evento: FormEvent) {
    evento.preventDefault()
    if (!resultado || !podePublicar) return
    setPublicacao({ status: 'enviando' })
    try {
      const resposta = await publicarPesquisas(resultado.pesquisas, senha)
      setPublicacao({ status: 'publicada', ...resposta })
      setSenha('')
    } catch (erro) {
      setPublicacao({ status: 'falhou', mensagem: erro instanceof Error ? erro.message : 'Falha ao publicar.' })
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecalho atualizadoEm={atual?.atualizadoEm}>
        <a
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar ao painel
        </a>
      </Cabecalho>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">Importar planilha</h1>
        <p className="mt-2 text-sm text-slate-600">
          {atual
            ? `Base publicada hoje no painel: ${pluralizar(atual.pesquisas.length, 'pesquisa', 'pesquisas')}, importada em ${formatarData(atual.atualizadoEm)}. A nova importação substitui todos esses dados.`
            : 'Ainda não há dados publicados no painel.'}
        </p>
        <p className="mt-3 flex gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            A planilha é lida neste navegador. Só os campos agregados são enviados ao servidor; nomes, e-mails, títulos e
            anotações não saem deste computador.
          </span>
        </p>

        <Etapa numero={1} titulo="Escolha a planilha">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-marca-500 px-4 py-2 text-sm font-medium text-white hover:bg-marca-550 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-marca-450">
            <Upload className="size-4" aria-hidden />
            Selecionar arquivo .xlsx
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(evento) => {
                const arquivo = evento.target.files?.[0]
                // Limpa a seleção para permitir reenviar o mesmo arquivo depois de corrigi-lo.
                evento.target.value = ''
                if (arquivo) void lerArquivo(arquivo)
              }}
            />
          </label>
          {leitura.status !== 'inicial' && (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              {leitura.status === 'lendo' ? (
                <LoaderCircle className="size-4 animate-spin text-marca-500 motion-reduce:animate-none" aria-hidden />
              ) : (
                <FileSpreadsheet className="size-4 text-slate-500" aria-hidden />
              )}
              {leitura.arquivo}
              {leitura.status === 'lendo' && ' — lendo…'}
            </p>
          )}
          {leitura.status === 'falhou' && (
            <Alerta tipo="erro">
              Não foi possível ler o arquivo. Confira se é uma planilha do Excel no formato .xlsx (o formato antigo .xls
              não é aceito).
            </Alerta>
          )}
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-medium text-marca-600 hover:text-marca-700">
              Estrutura esperada: colunas A a V do modelo
            </summary>
            <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {COLUNAS.map((coluna) => (
                <li key={coluna.letra} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 font-mono text-xs font-semibold text-slate-500">{coluna.letra}</span>
                  <span className="min-w-0 flex-1 text-slate-700">{coluna.cabecalho}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${ROTULOS_USO[coluna.uso].classe}`}>
                    {ROTULOS_USO[coluna.uso].rotulo}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Painel: alimenta os gráficos. Situação: lida só para classificar a situação. Apoio: usada na leitura, não
              publicada. Descartada: nunca sai do navegador.
            </p>
          </details>
        </Etapa>

        {resultado && (
          <Etapa numero={2} titulo="Confira o resultado">
            <Relatorio resultado={resultado} />
          </Etapa>
        )}

        {resultado && (
          <Etapa numero={3} titulo="Publique no painel">
            {resultado.erros.length > 0 ? (
              <Alerta tipo="erro">Corrija os erros acima na planilha e selecione o arquivo novamente.</Alerta>
            ) : (
              <form onSubmit={publicar} className="flex flex-wrap items-end gap-3">
                <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
                  Senha de importação
                  <span className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400"
                      aria-hidden
                    />
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={senha}
                      onChange={(evento) => setSenha(evento.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white py-2 pr-3 pl-8 text-sm font-normal focus:border-marca-450 focus:ring-2 focus:ring-marca-200 focus:outline-none"
                    />
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={!podePublicar || publicacao.status === 'enviando'}
                  className="inline-flex items-center gap-2 rounded-md bg-marca-500 px-4 py-2 text-sm font-medium text-white hover:bg-marca-550 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-450 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {publicacao.status === 'enviando' && (
                    <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                  )}
                  Publicar {pluralizar(resultado.pesquisas.length, 'pesquisa', 'pesquisas')}
                </button>
              </form>
            )}
            <div aria-live="polite">
              {publicacao.status === 'publicada' && (
                <Alerta tipo="sucesso">
                  Dados publicados em {formatarData(publicacao.atualizadoEm)}:{' '}
                  {pluralizar(publicacao.pesquisas, 'pesquisa', 'pesquisas')}.{' '}
                  <a href="/" className="font-semibold underline underline-offset-2">
                    Ver o painel atualizado
                  </a>
                </Alerta>
              )}
              {publicacao.status === 'falhou' && <Alerta tipo="erro">{publicacao.mensagem}</Alerta>}
            </div>
          </Etapa>
        )}
      </main>

      <Rodape />
    </div>
  )
}

function Relatorio({ resultado }: { resultado: ResultadoImportacao }) {
  const { leitura, erros, avisos, situacoes, motivos, pesquisas } = resultado
  const duplicadas = leitura.registros.length - pesquisas.length

  return (
    <div className="space-y-5">
      {erros.length > 0 && (
        <Alerta tipo="erro">
          <ul className="list-disc space-y-1 pl-5">
            {erros.map((erro) => (
              <li key={erro}>{erro}</li>
            ))}
            {leitura.abasIgnoradas.map((aba) => (
              <li key={aba.nome}>
                Aba “{aba.nome}”: {aba.motivo}
              </li>
            ))}
          </ul>
        </Alerta>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Numero rotulo="Pesquisas importadas" valor={pesquisas.length} destaque />
        {SITUACOES.map((situacao) => (
          <Numero
            key={situacao}
            rotulo={ROTULOS_SITUACAO[situacao]}
            valor={situacoes[situacao].informada + situacoes[situacao].inferida}
          />
        ))}
      </dl>

      <div className="text-sm text-slate-700">
        <p>
          {leitura.abasLidas.map((aba) => `Aba “${aba.nome}”: ${pluralizar(aba.registros, 'linha', 'linhas')}`).join(' · ')}
          {duplicadas > 0 && ` · ${pluralizar(duplicadas, 'linha repetida removida', 'linhas repetidas removidas')}`}
          {erros.length === 0 &&
            leitura.abasIgnoradas.map((aba) => ` · Aba “${aba.nome}” ignorada (${aba.motivo.replace(/\.$/, '')})`)}
        </p>
        {motivos.length > 0 && (
          <div className="mt-3">
            <p className="font-medium text-slate-900">Como as situações foram inferidas</p>
            <ul className="mt-1 space-y-0.5">
              {motivos.map((motivo) => (
                <li key={`${motivo.situacao}-${motivo.motivo}`}>
                  <span className="font-semibold">
                    {pluralizar(motivo.quantidade, ...SITUACAO_NO_TEXTO[motivo.situacao])}
                  </span>
                  : {motivo.motivo.toLowerCase()}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {avisos.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-900">
            Avisos ({avisos.length}) — não impedem a publicação, mas indicam pontos a revisar na planilha
          </p>
          <ul className="mt-2 space-y-2">
            {avisos.map((grupo) => (
              <ItemAviso key={grupo.titulo} grupo={grupo} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const LIMITE_OCORRENCIAS = 30

function ItemAviso({ grupo }: { grupo: GrupoAvisos }) {
  const exibidas = grupo.ocorrencias.slice(0, LIMITE_OCORRENCIAS)
  return (
    <li className="rounded-md bg-amber-50 ring-1 ring-amber-200">
      <details>
        <summary className="flex cursor-pointer items-start gap-2 p-3 text-sm text-amber-950">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <span className="flex-1">
            <span className="font-medium">{grupo.titulo}</span>
            <span className="text-amber-800"> — {pluralizar(grupo.ocorrencias.length, 'ocorrência', 'ocorrências')}</span>
          </span>
        </summary>
        <div className="border-t border-amber-200 px-3 pt-2 pb-3 pl-9 text-sm text-amber-950">
          <p className="text-amber-800">{grupo.explicacao}</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4">
            {exibidas.map((ocorrencia, indice) => (
              <li key={`${indice}-${ocorrencia}`}>{ocorrencia}</li>
            ))}
          </ul>
          {grupo.ocorrencias.length > exibidas.length && (
            <p className="mt-1 text-amber-800">e mais {grupo.ocorrencias.length - exibidas.length}…</p>
          )}
        </div>
      </details>
    </li>
  )
}

function Etapa({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-lg bg-white shadow-sm ring-1 ring-slate-900/5" aria-labelledby={`etapa-${numero}`}>
      <h2 id={`etapa-${numero}`} className="flex items-center gap-2 rounded-t-lg bg-marca-500 px-4 py-2.5 text-sm font-medium text-white">
        <span className="grid size-5 place-items-center rounded-full bg-white text-xs font-semibold text-marca-600">
          {numero}
        </span>
        {titulo}
      </h2>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

function Numero({ rotulo, valor, destaque = false }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div className={`rounded-md p-3 ${destaque ? 'bg-marca-100' : 'bg-slate-50'}`}>
      <dt className="text-xs text-slate-600">{rotulo}</dt>
      <dd className="mt-0.5 text-2xl font-semibold text-slate-900">{formatarNumero(valor)}</dd>
    </div>
  )
}

function Alerta({ tipo, children }: { tipo: 'erro' | 'sucesso'; children: ReactNode }) {
  const erro = tipo === 'erro'
  const Icone = erro ? CircleAlert : CircleCheck
  return (
    <div
      role={erro ? 'alert' : 'status'}
      className={`mt-3 flex gap-2 rounded-md p-3 text-sm ring-1 ${erro ? 'bg-red-50 text-red-900 ring-red-200' : 'bg-emerald-50 text-emerald-900 ring-emerald-200'}`}
    >
      <Icone className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}
