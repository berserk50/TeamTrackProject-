import { useState } from 'react'
import { useApp } from '../lib/store'
import HistoryList from '../components/HistoryList'

const ACTIONS = ['creado', 'modificado', 'cancelado', 'reabierto', 'comentario', 'adjunto', 'adjunto eliminado', 'eliminado']

export default function History() {
  const { members } = useApp()
  const [f, setF] = useState({ q: '', actor: '', action: '', from: '', to: '' })
  const set = k => e => setF({ ...f, [k]: e.target.value })

  return (
    <div>
      <div className="view-head">
        <h2>Historial de cambios</h2>
        <span className="muted small">Registro automático e inalterable de todo lo que pasa en el proyecto</span>
      </div>
      <div className="filters">
        <input placeholder="Buscar por #id o título…" value={f.q} onChange={set('q')} />
        <select value={f.actor} onChange={set('actor')}>
          <option value="">Todas las personas</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        <select value={f.action} onChange={set('action')}>
          <option value="">Todas las acciones</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>)}
        </select>
        <label className="inline">Desde <input type="date" value={f.from} onChange={set('from')} /></label>
        <label className="inline">Hasta <input type="date" value={f.to} onChange={set('to')} /></label>
      </div>
      <div className="card pad">
        <HistoryList filters={f} />
      </div>
    </div>
  )
}
