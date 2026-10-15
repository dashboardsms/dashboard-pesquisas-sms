import { sanitizarPesquisas } from '../src/lib/sanitizarPesquisas.ts'
import type { BaseDePesquisas } from '../src/types/pesquisa.ts'

interface Env {
  DADOS: KVNamespace
  /** Senha exigida para publicar uma nova base (secret configurado no painel da Cloudflare). */
  SENHA_IMPORTACAO?: string
  /** Sites de outro domínio que podem usar a API (ex.: o painel no GitHub Pages), separados por vírgula. */
  ORIGENS_PERMITIDAS?: string
}

const CHAVE_BASE = 'base'
const LIMITE_BYTES = 5_000_000

export default {
  async fetch(request, env) {
    return liberarOrigem(request, env, await responder(request, env))
  },
} satisfies ExportedHandler<Env>

async function responder(request: Request, env: Env) {
  const { pathname } = new URL(request.url)
  if (pathname !== '/api/dados') return json({ erro: 'Rota não encontrada.' }, 404)

  if (request.method === 'GET') return obterBase(env)
  if (request.method === 'PUT') return publicarBase(request, env)
  // Pré-verificação do navegador antes de um PUT vindo de outro domínio.
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  return json({ erro: 'Método não permitido.' }, 405, { Allow: 'GET, PUT, OPTIONS' })
}

/** Cabeçalhos CORS para as origens de ORIGENS_PERMITIDAS; as demais seguem bloqueadas pelo navegador. */
function liberarOrigem(request: Request, env: Env, resposta: Response) {
  const origem = request.headers.get('Origin')
  const permitidas = (env.ORIGENS_PERMITIDAS ?? '').split(',').map((item) => item.trim())
  if (!origem || !permitidas.includes(origem)) return resposta

  const cabecalhos = new Headers(resposta.headers)
  cabecalhos.set('Access-Control-Allow-Origin', origem)
  cabecalhos.set('Access-Control-Allow-Methods', 'GET, PUT')
  cabecalhos.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  cabecalhos.set('Access-Control-Max-Age', '86400')
  cabecalhos.append('Vary', 'Origin')
  return new Response(resposta.body, { status: resposta.status, headers: cabecalhos })
}

async function obterBase(env: Env) {
  const base = await env.DADOS.get(CHAVE_BASE)
  if (!base) return json({ erro: 'Nenhuma planilha foi importada ainda.' }, 404)
  return new Response(base, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

async function publicarBase(request: Request, env: Env) {
  if (!env.SENHA_IMPORTACAO) {
    return json({ erro: 'A senha de importação não foi configurada no servidor.' }, 503)
  }

  const senha = lerSenha(request.headers.get('Authorization'))
  if (!(await senhasIguais(senha, env.SENHA_IMPORTACAO))) {
    // Pequena espera para encarecer tentativas de adivinhar a senha.
    await new Promise((resolver) => setTimeout(resolver, 500))
    return json({ erro: 'Senha incorreta.' }, 401)
  }

  const corpo = await request.text()
  if (corpo.length > LIMITE_BYTES) return json({ erro: 'Arquivo de dados grande demais.' }, 413)

  let dado: unknown
  try {
    dado = JSON.parse(corpo)
  } catch {
    return json({ erro: 'Corpo da requisição não é um JSON válido.' }, 400)
  }

  const resultado = sanitizarPesquisas(dado)
  if ('erro' in resultado) return json({ erro: resultado.erro }, 422)

  const base: BaseDePesquisas = { atualizadoEm: hojeEmBrasilia(), pesquisas: resultado.pesquisas }
  await env.DADOS.put(CHAVE_BASE, JSON.stringify(base))
  return json({ atualizadoEm: base.atualizadoEm, pesquisas: base.pesquisas.length })
}

/** O cliente envia a senha codificada (encodeURIComponent) para aceitar acentos. */
function lerSenha(cabecalho: string | null) {
  const codificada = cabecalho?.replace(/^Bearer\s+/i, '') ?? ''
  try {
    return decodeURIComponent(codificada)
  } catch {
    return codificada
  }
}

/** Compara as senhas em tempo constante (via hash), sem vazar o tamanho ou o prefixo correto. */
async function senhasIguais(informada: string, esperada: string) {
  const codificador = new TextEncoder()
  const [a, b] = await Promise.all(
    [informada, esperada].map((texto) => crypto.subtle.digest('SHA-256', codificador.encode(texto))),
  )
  return crypto.subtle.timingSafeEqual(a, b)
}

function hojeEmBrasilia() {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

function json(corpo: unknown, status = 200, cabecalhos: Record<string, string> = {}) {
  return Response.json(corpo, { status, headers: { 'Cache-Control': 'no-store', ...cabecalhos } })
}
