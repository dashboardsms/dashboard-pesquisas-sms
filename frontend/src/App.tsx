import { PaginaImportacao } from './components/PaginaImportacao.tsx'
import { PaginaPainel } from './components/PaginaPainel.tsx'
import { estaNaImportacao } from './lib/rotas.ts'

/** Duas páginas apenas: o painel público (/) e a importação da planilha (/importar). */
export default function App() {
  return estaNaImportacao() ? <PaginaImportacao /> : <PaginaPainel />
}
