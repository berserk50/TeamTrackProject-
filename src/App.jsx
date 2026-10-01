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
import History from './views/History'
import Team from './views/Team'
import { ThemeToggle } from './components/ui'
import NotificationBell from './components/Notifications'
import { PlusIcon } from './components/icons'

const VIEWS = [
  { key: 'tablero',    label: 'Tablero',    comp: Board },
  { key: 'lista',      label: 'Backlog',    comp: ListView },
  { key: 'jerarquia',  label: 'Jerarquía',  comp: Hierarchy },
  { key: 'mis-tareas', label: 'Mis tareas', comp: MyTasks },
  { key: 'sprints',    label: 'Sprints',    comp: Sprints },
  { key: 'historial',  label: 'Historial',  comp: History },
  { key: 'equipo',     label: 'Equipo',     comp: Team },
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

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to="/#tablero"><span className="brand-mark" aria-hidden="true" />TeamTrack</Link>
          <nav aria-label="Secciones">
            {VIEWS.map(v => (
              <Link key={v.key} to={'/#' + v.key} className={view === v.key ? 'active' : ''}
                    aria-current={view === v.key ? 'page' : undefined}>{v.label}</Link>
            ))}
          </nav>
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
          </div>
        </div>
      </header>

      <main className="content">
        {loading ? <p className="muted">Cargando datos…</p> : route.itemId ? <ItemPage id={route.itemId} /> : <Current />}
      </main>

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
