import { useLayoutEffect, useRef, useState } from 'react'

const PASSOS = new Map([
  ['ArrowRight', 1],
  ['ArrowDown', 1],
  ['ArrowLeft', -1],
  ['ArrowUp', -1],
])

/**
 * Destaca uma marca (barra ou coluna) por ponteiro ou teclado e posiciona a dica
 * acima dela, sem sair da largura do gráfico. Cada marca indica seu ponto de
 * ancoragem com `data-marca={índice}`; `conteudo` reposiciona a dica quando os
 * dados mudam.
 */
export function useMarcaAtiva(total, ancorar, conteudo) {
  const [ativa, setAtiva] = useState(null)
  const refGrafico = useRef(null)
  const refDica = useRef(null)
  const indice = ativa !== null && ativa < total ? ativa : null

  useLayoutEffect(() => {
    const grafico = refGrafico.current
    const dica = refDica.current
    const marca = grafico?.querySelector(`[data-marca="${indice}"]`)
    if (!grafico || !dica || !marca) return

    const g = grafico.getBoundingClientRect()
    const m = marca.getBoundingClientRect()
    const x = (ancorar === 'fim' ? m.right : m.left + m.width / 2) - g.left
    const esquerda = Math.min(x - dica.offsetWidth / 2, g.width - dica.offsetWidth)
    dica.style.left = `${Math.max(0, esquerda)}px`
    dica.style.top = `${m.top - g.top}px`
  }, [indice, ancorar, conteudo])

  function aoTeclar(evento) {
    let destino
    const passo = PASSOS.get(evento.key)
    if (passo !== undefined) {
      destino = indice === null ? 0 : Math.min(Math.max(indice + passo, 0), total - 1)
    } else if (evento.key === 'Home') {
      destino = 0
    } else if (evento.key === 'End') {
      destino = total - 1
    } else if (evento.key === 'Escape') {
      destino = null
    } else {
      return
    }
    evento.preventDefault()
    setAtiva(destino)
  }

  function aoFocar(evento) {
    // Só o foco por teclado destaca a primeira marca; no clique, vale a marca sob o ponteiro.
    if (evento.currentTarget.matches(':focus-visible')) setAtiva((atual) => atual ?? 0)
  }

  function aoSairPonteiro(evento) {
    // No toque, a dica fica aberta até o foco sair do gráfico.
    if (evento.pointerType !== 'touch') setAtiva(null)
  }

  return {
    indice,
    refDica,
    propsGrafico: {
      ref: refGrafico,
      tabIndex: total > 0 ? 0 : -1,
      onKeyDown: aoTeclar,
      onFocus: aoFocar,
      onBlur: () => setAtiva(null),
      onPointerLeave: aoSairPonteiro,
    },
    propsMarca: (indiceMarca) => ({
      onPointerEnter: () => setAtiva(indiceMarca),
    }),
  }
}
