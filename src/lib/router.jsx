import { useEffect, useState } from 'react'

// Prefijo de la clave de cada ítem (como BNCS-912 en Jira). Cámbialo aquí si el proyecto usa otro.
export const ITEM_PREFIX = 'TT'

export const itemKey = (id) => `${ITEM_PREFIX}-${id}`
export const itemPath = (id) => `/browse/${itemKey(id)}`

// Etiquetas guardadas por la base como "#12 Título" -> "TT-12 Título"
export const keyLabel = (label = '') => label.replace(/^#(\d+)/, (_, n) => itemKey(n))

const BROWSE = new RegExp(`^/browse/${ITEM_PREFIX}-(\\d+)/?$`, 'i')

function readRoute() {
  const m = location.pathname.match(BROWSE)
  if (m) return { itemId: Number(m[1]) }
  return { view: location.hash.slice(1) || 'tablero' }
}

// Cambia la URL sin recargar la página
export function navigate(to) {
  if (to === location.pathname + location.hash) return
  history.pushState(null, '', to)
  dispatchEvent(new PopStateEvent('popstate'))
  scrollTo(0, 0)
}

export function useRoute() {
  const [route, setRoute] = useState(readRoute)
  useEffect(() => {
    const update = () => setRoute(readRoute())
    addEventListener('popstate', update)
    addEventListener('hashchange', update)
    return () => { removeEventListener('popstate', update); removeEventListener('hashchange', update) }
  }, [])
  return route
}

// Enlace interno: navega sin recargar, pero respeta Ctrl/Cmd+clic y clic central (nueva pestaña)
export function Link({ to, onClick, ...rest }) {
  return (
    <a href={to} {...rest} onClick={e => {
      onClick?.(e)
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault(); navigate(to)
    }} />
  )
}
