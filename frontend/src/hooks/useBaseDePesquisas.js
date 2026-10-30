import { useEffect, useState } from 'react'
import { carregarBase } from '../data/api.js'

export function useBaseDePesquisas() {
  const [carga, setCarga] = useState({ status: 'carregando' })

  useEffect(() => {
    let ativo = true
    carregarBase()
      .then((base) => {
        if (ativo) setCarga(base ? { status: 'pronta', base } : { status: 'vazia' })
      })
      .catch(() => {
        if (ativo) setCarga({ status: 'erro' })
      })
    return () => {
      ativo = false
    }
  }, [])

  return carga
}
