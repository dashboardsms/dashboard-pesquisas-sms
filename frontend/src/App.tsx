import { PaginaImportacao } from './components/PaginaImportacao.tsx'
import { PaginaPainel } from './components/PaginaPainel.tsx'

/** Duas páginas apenas: o painel público (/) e a importação da planilha (/importar). */
export default function App() {
  const caminho = window.location.pathname.replace(/\/+$/, '')
  return caminho === '/importar' ? <PaginaImportacao /> : <PaginaPainel />
}
