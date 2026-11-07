import { useEffect, useState } from 'react'
import { carregarBase } from '../data/api.js'

/** A base pode mudar com o painel aberto (sincronização com o Google Sheets ou nova importação). */
const INTERVALO_ATUALIZACAO_MS = 60_000

export function useBaseDePesquisas() {
  const [carga, setCarga] = useState({ status: 'carregando' })

  useEffect(() => {
    let ativo = true
    // Texto da última base exibida: só redesenha o painel quando os dados mudam.
    let exibida

    const atualizar = () =>
      carregarBase()
        .then((base) => {
          const texto = JSON.stringify(base)
          if (!ativo || texto === exibida) return
          exibida = texto
          setCarga(base ? { status: 'pronta', base } : { status: 'vazia' })
        })
        .catch(() => {
          // Uma falha ao atualizar mantém na tela os dados já carregados.
          if (ativo && exibida === undefined) setCarga({ status: 'erro' })
        })

    // Só consulta a API com a aba visível e, ao voltar para ela, atualiza na hora.
    const seVisivel = () => {
      if (document.visibilityState === 'visible') atualizar()
    }
    atualizar()
    const intervalo = setInterval(seVisivel, INTERVALO_ATUALIZACAO_MS)
    document.addEventListener('visibilitychange', seVisivel)
    return () => {
      ativo = false
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', seVisivel)
    }
  }, [])

  return carga
}
