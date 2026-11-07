import { useEffect, useState } from 'react'
import { supabase, isConfigured } from './lib/supabase'
import { AppProvider, useApp } from './lib/store'
import Login, { SetPassword } from './components/Login'
import ItemModal, { ItemPage } from './components/ItemModal'
import { useRoute, Link } from './lib/router'
import Board from './views/Board'
import ListView from './views/ListView'
import Hierarchy from './views/Hierarchy'
import MyTasks from './views/MyTasks'
import Sprints from './views/Sprints'
import Reports from './views/Reports'
import History from './views/History'
import Team from './views/Team'
import { ThemeToggle } from './components/ui'
import NotificationBell from './components/Notifications'
import { PlusIcon, MenuIcon, CloseIcon, BoardIcon, ListIcon, TreeIcon, CheckIcon, SprintIcon, ChartIcon, HistoryIcon, TeamIcon } from './components/icons'

const VIEWS = [
  { key: 'tablero',    label: 'Tablero',    comp: Board,     Icon: BoardIcon },
  { key: 'lista',      label: 'Backlog',    comp: ListView,  Icon: ListIcon },
  { key: 'jerarquia',  label: 'Jerarquía',  comp: Hierarchy, Icon: TreeIcon },
  { key: 'mis-tareas', label: 'Mis tareas', comp: MyTasks,   Icon: CheckIcon },
  { key: 'sprints',    label: 'Sprints',    comp: Sprints,   Icon: SprintIcon },
  { key: 'reportes',   label: 'Reportes',   comp: Reports,   Icon: ChartIcon },
  { key: 'historial',  label: 'Historial',  comp: History,   Icon: HistoryIcon },
  { key: 'equipo',     label: 'Equipo',     comp: Team,      Icon: TeamIcon },
]

export default function App() {
  const [session, setSession] = useState(undefined)
  const [visitor, setVisitor] = useState(false)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!isConfigured) {
    return (
      <div className="center-screen">
        <div className="card narrow">
          <h1 className="card-title-lg">Falta configuración</h1>
          <p>Crea el archivo <code>.env</code> con <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (ver README).</p>
        </div>
      </div>
    )
  }
  if (session === undefined) return <div className="center-screen muted">Cargando…</div>
  if (recovery && session) return <SetPassword onDone={() => setRecovery(false)} />
  if (!session && !visitor) return <Login onVisitor={() => setVisitor(true)} />

  const signOut = async () => {
    if (session) await supabase.auth.signOut()
    setVisitor(false)
  }

  return (
    <AppProvider key={session?.user.id ?? 'visitor'} session={session} visitor={!session} onSignOut={signOut}>
      <Shell />
    </AppProvider>
  )
}

function Shell() {
  const { me, session, canEdit, onSignOut, loading, openItem, setOpenItem, toasts, dismissToast, activeSprint } = useApp()
  const route = useRoute()   // { itemId } en /browse/TT-12, o { view } en /#tablero
  const view = route.itemId ? null : route.view

  const Current = (VIEWS.find(v => v.key === view) ?? VIEWS[0]).comp
  const [navOpen, setNavOpen] = useState(false)   // menú lateral desplegable en pantallas chicas

  // Al cambiar de vista o de ítem se cierra el menú desplegable
  useEffect(() => { setNavOpen(false) }, [view, route.itemId])
  useEffect(() => {
    if (!navOpen) return
    const onKey = e => { if (e.key === 'Escape') setNavOpen(false) }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [navOpen])

  return (
    <div className={'app' + (navOpen ? ' nav-open' : '')}>
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to="/#tablero"><span className="brand-mark" aria-hidden="true" />TeamTrack</Link>
          <div className="user">
            {canEdit && (
              <button className="btn primary sm" onClick={() => setOpenItem({
                new: true,
                // Desde el tablero, lo nuevo entra al sprint activo para que se vea de inmediato
                defaults: activeSprint && ['tablero', 'mis-tareas'].includes(view) ? { sprint_id: activeSprint.id } : undefined,
              })}>
                <PlusIcon /><span>Nuevo</span>
              </button>
            )}
            {canEdit && <NotificationBell />}
            <span className="who">
              {session ? (me ? me.full_name : 'Sin acceso de edición') : 'Visitante (solo lectura)'}
            </span>
            <ThemeToggle />
            <button className="btn ghost sm" onClick={onSignOut}>{session ? 'Salir' : 'Iniciar sesión'}</button>
            <button type="button" className="btn ghost sm nav-toggle" aria-label={navOpen ? 'Cerrar menú' : 'Abrir menú'}
                    aria-expanded={navOpen} aria-controls="side-nav" onClick={() => setNavOpen(o => !o)}>
              {navOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      <div className="layout">
        <main className="content">
          {loading ? <p className="muted">Cargando datos…</p> : route.itemId ? <ItemPage id={route.itemId} /> : <Current />}
        </main>

        {/* Menú de secciones: columna fija a la derecha; en pantallas chicas, panel desplegable */}
        <nav id="side-nav" className="sidenav" aria-label="Secciones">
          {VIEWS.map(({ key, label, Icon }) => (
            <Link key={key} to={'/#' + key} className={view === key ? 'active' : ''}
                  aria-current={view === key ? 'page' : undefined}>
              <Icon /><span>{label}</span>
            </Link>
          ))}
        </nav>
        {navOpen && <div className="sidenav-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      </div>

      {openItem && <ItemModal key={openItem.id ?? 'new'} target={openItem} onClose={() => setOpenItem(null)} />}

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={'toast ' + t.kind}>
            <span>{t.text}</span>
            {t.action && (
              <button className="toast-action" onClick={() => { t.action.onClick(); dismissToast(t.id) }}>{t.action.label}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
