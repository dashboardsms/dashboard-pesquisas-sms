import { PaginaImportacao } from './components/PaginaImportacao.jsx'
import { PaginaPainel } from './components/PaginaPainel.jsx'
import { estaNaImportacao } from './lib/rotas.js'

/** Duas páginas apenas: o painel público (/) e a importação da planilha (/importar). */
export default function App() {
  return estaNaImportacao() ? <PaginaImportacao /> : <PaginaPainel />
}
