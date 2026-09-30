import { useEffect, useState } from 'react'
import { supabase, isConfigured } from './lib/supabase'
import { AppProvider, useApp } from './lib/store'
import Login, { SetPassword } from './components/Login'
import ItemModal from './components/ItemModal'
import Board from './views/Board'
import ListView from './views/ListView'
import Hierarchy from './views/Hierarchy'
import MyTasks from './views/MyTasks'
import Sprints from './views/Sprints'
import History from './views/History'
import Team from './views/Team'

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
          <h2>Falta configuración</h2>
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
  const { me, session, canEdit, onSignOut, loading, openItem, setOpenItem, toasts } = useApp()
  const [view, setView] = useState(() => location.hash.slice(1) || 'tablero')

  useEffect(() => {
    const onHash = () => setView(location.hash.slice(1) || 'tablero')
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  const Current = (VIEWS.find(v => v.key === view) ?? VIEWS[0]).comp

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">TeamTrack</div>
        <nav>
          {VIEWS.map(v => (
            <a key={v.key} href={'#' + v.key} className={view === v.key ? 'active' : ''}>{v.label}</a>
          ))}
        </nav>
        <div className="user">
          {canEdit && (
            <button className="btn primary sm" onClick={() => setOpenItem({ new: true })}>+ Nuevo</button>
          )}
          <span className="who">
            {session ? (me ? me.full_name : 'Sin acceso de edición') : 'Visitante (solo lectura)'}
          </span>
          <button className="btn ghost sm" onClick={onSignOut}>{session ? 'Salir' : 'Iniciar sesión'}</button>
        </div>
      </header>

      <main className="content">
        {loading ? <p className="muted">Cargando datos…</p> : <Current />}
      </main>

      {openItem && <ItemModal key={openItem.id ?? 'new'} target={openItem} onClose={() => setOpenItem(null)} />}

      <div className="toasts">
        {toasts.map(t => <div key={t.id} className={'toast ' + t.kind}>{t.text}</div>)}
      </div>
    </div>
  )
}
