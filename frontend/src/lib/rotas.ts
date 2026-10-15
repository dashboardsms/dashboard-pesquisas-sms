/** Endereços das páginas. No GitHub Pages o app fica numa subpasta, então tudo parte da base do build. */
export const ROTA_PAINEL = import.meta.env.BASE_URL
export const ROTA_IMPORTACAO = `${import.meta.env.BASE_URL}importar`

export function estaNaImportacao() {
  return window.location.pathname.replace(/\/+$/, '') === ROTA_IMPORTACAO
}
