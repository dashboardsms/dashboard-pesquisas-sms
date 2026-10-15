import { useEffect, useState } from 'react'
import { carregarBase } from '../data/api.ts'
import type { BaseDePesquisas } from '../types/pesquisa.ts'

export type CargaDaBase =
  | { status: 'carregando' }
  | { status: 'erro' }
  | { status: 'vazia' }
  | { status: 'pronta'; base: BaseDePesquisas }

export function useBaseDePesquisas(): CargaDaBase {
  const [carga, setCarga] = useState<CargaDaBase>({ status: 'carregando' })

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
