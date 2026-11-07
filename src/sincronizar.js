import net from 'node:net'
import { lerPlanilhaGoogle } from './planilhaGoogle.js'

// Sincroniza o painel com a planilha do Google Sheets: lê a planilha, compara com a base
// publicada e, se algo mudou, publica pela mesma API da importação manual (PUT /api/dados,
// com a senha). Roda no GitHub Actions a cada 5 minutos
// (.github/workflows/sincronizar-planilha.yml) ou à mão:
//
//   node --env-file=frontend/.dev.vars src/sincronizar.js
//
// Variáveis: URL_PLANILHA, SENHA_IMPORTACAO e API_URL (veja .env.example).

// Em redes com IPv6 quebrado, o Node desiste do IPv4 após 250 ms por tentativa de conexão.
net.setDefaultAutoSelectFamilyAttemptTimeout(2_000)

const { URL_PLANILHA, SENHA_IMPORTACAO, API_URL } = process.env

try {
  await sincronizar()
} catch (falha) {
  console.error(`Sincronização falhou: ${falha.message}`)
  process.exitCode = 1
}

async function sincronizar() {
  if (!URL_PLANILHA) {
    console.log('Sincronização desligada: URL_PLANILHA não foi configurada.')
    return
  }
  if (!SENHA_IMPORTACAO || !API_URL) throw new Error('Configure também SENHA_IMPORTACAO e API_URL (veja .env.example).')

  const planilha = await lerPlanilhaGoogle(URL_PLANILHA)
  if ('erro' in planilha) throw new Error(planilha.erro)
  // Só título e quantidade: as ocorrências citam o texto das células, e o log do Actions é público.
  for (const aviso of planilha.avisos) console.log(`Aviso da planilha: ${aviso.titulo} (${aviso.ocorrencias.length})`)

  const urlDados = `${API_URL.replace(/\/+$/, '')}/api/dados`
  const publicada = await obterBase(urlDados)
  if (publicada && JSON.stringify(publicada.pesquisas) === JSON.stringify(planilha.pesquisas)) {
    console.log(`Sem mudanças: o painel já mostra as ${planilha.pesquisas.length} pesquisas da planilha.`)
    return
  }

  const publicacao = await publicar(urlDados, planilha.pesquisas)
  console.log(`Painel atualizado: ${publicacao.pesquisas} pesquisas publicadas (base de ${publicacao.atualizadoEm}).`)
}

/** Base publicada hoje, ou `null` se nenhuma planilha foi importada ainda. */
async function obterBase(urlDados) {
  const resposta = await fetch(urlDados, { cache: 'no-store' })
  if (resposta.status === 404) return null
  if (!resposta.ok) throw new Error(`Falha ao ler a base publicada (HTTP ${resposta.status}).`)
  return resposta.json()
}

/** Mesmo envio da página /importar (frontend/src/data/api.js). */
async function publicar(urlDados, pesquisas) {
  const resposta = await fetch(urlDados, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // Codificada para aceitar acentos (cabeçalhos HTTP só levam ASCII).
      Authorization: `Bearer ${encodeURIComponent(SENHA_IMPORTACAO)}`,
    },
    body: JSON.stringify({ pesquisas }),
  })
  const corpo = await resposta.json().catch(() => ({}))
  if (!resposta.ok) throw new Error(corpo.erro ?? `Falha ao publicar (HTTP ${resposta.status}).`)
  return corpo
}
