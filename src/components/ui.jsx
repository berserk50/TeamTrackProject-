import { useState } from 'react'
import { TYPES, STATUSES, PRIORITIES, TYPE_KEYS, STATUS_KEYS, PRIORITY_KEYS } from '../lib/constants'
import { useApp } from '../lib/store'

export function TypeBadge({ type }) {
  const t = TYPES[type]
  return <span className="badge type" style={{ background: t.color }} title={t.label}>{t.short}</span>
}

export function StatusBadge({ status }) {
  const s = STATUSES[status]
  return <span className="badge outline" style={{ color: s.color, borderColor: s.color }}>{s.label}</span>
}

export function PriorityBadge({ priority }) {
  const p = PRIORITIES[priority]
  return <span className="prio" style={{ color: p.color }} title={'Prioridad ' + p.label}>● {p.label}</span>
}

export function initials(name = '') {
  return name.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const AVATAR_COLORS = ['#2563eb', '#db2777', '#0d9488', '#ea580c', '#7c3aed', '#65a30d', '#0891b2']
export function Avatar({ member, size = 26 }) {
  if (!member) return <span className="avatar empty" style={{ width: size, height: size }} title="Sin asignar">?</span>
  const color = AVATAR_COLORS[[...member.id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]
  return (
    <span className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.42 }} title={member.full_name}>
      {initials(member.full_name)}
    </span>
  )
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn ghost sm" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Diálogo que exige escribir un motivo (cancelar / eliminar)
export function ReasonDialog({ title, description, confirmLabel, danger, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal title={title} onClose={onClose}>
      <div className="modal-body">
        {description && <p className="muted">{description}</p>}
        <label>Motivo (obligatorio)
          <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} autoFocus />
        </label>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Volver</button>
        <button
          className={'btn ' + (danger ? 'danger' : 'primary')}
          disabled={!reason.trim() || busy}
          onClick={async () => { setBusy(true); await onConfirm(reason.trim()); setBusy(false) }}
        >{confirmLabel}</button>
      </div>
    </Modal>
  )
}

// Barra de filtros reutilizable
export const EMPTY_FILTERS = { q: '', type: '', status: '', assignee: '', sprint: '', priority: '' }

export function applyFilters(items, f) {
  const q = f.q.trim().toLowerCase()
  return items.filter(i =>
    (!q || i.title.toLowerCase().includes(q) || String(i.id) === q.replace('#', '') ||
      i.tags.some(t => t.toLowerCase().includes(q))) &&
    (!f.type || i.type === f.type) &&
    (!f.status || (f.status === 'abiertos' ? !['cerrada', 'cancelada'].includes(i.status) : i.status === f.status)) &&
    (!f.priority || i.priority === f.priority) &&
    (!f.assignee || (f.assignee === 'none' ? !i.assignee_id : i.assignee_id === f.assignee)) &&
    (!f.sprint || (f.sprint === 'backlog' ? !i.sprint_id : String(i.sprint_id) === f.sprint)),
  )
}

export function FilterBar({ filters, setFilters, hide = [] }) {
  const { activeMembers, sprints } = useApp()
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })
  const dirty = Object.entries(filters).some(([k, v]) => v && !hide.includes(k))
  return (
    <div className="filters">
      {!hide.includes('q') && <input placeholder="Buscar título, #id o etiqueta…" value={filters.q} onChange={set('q')} />}
      {!hide.includes('type') && (
        <select value={filters.type} onChange={set('type')}>
          <option value="">Todos los tipos</option>
          {TYPE_KEYS.map(k => <option key={k} value={k}>{TYPES[k].label}</option>)}
        </select>
      )}
      {!hide.includes('status') && (
        <select value={filters.status} onChange={set('status')}>
          <option value="">Todos los estados</option>
          <option value="abiertos">Abiertos (no cerrados)</option>
          {STATUS_KEYS.map(k => <option key={k} value={k}>{STATUSES[k].label}</option>)}
        </select>
      )}
      {!hide.includes('priority') && (
        <select value={filters.priority} onChange={set('priority')}>
          <option value="">Toda prioridad</option>
          {PRIORITY_KEYS.map(k => <option key={k} value={k}>{PRIORITIES[k].label}</option>)}
        </select>
      )}
      {!hide.includes('assignee') && (
        <select value={filters.assignee} onChange={set('assignee')}>
          <option value="">Todas las personas</option>
          <option value="none">Sin asignar</option>
          {activeMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
      )}
      {!hide.includes('sprint') && (
        <select value={filters.sprint} onChange={set('sprint')}>
          <option value="">Todos los sprints</option>
          <option value="backlog">Backlog (sin sprint)</option>
          {sprints.map(s => <option key={s.id} value={String(s.id)}>{s.name}{s.status === 'activo' ? ' (activo)' : ''}</option>)}
        </select>
      )}
      {dirty && (
        <button className="btn ghost sm" onClick={() => {
          const keep = Object.fromEntries(hide.map(k => [k, filters[k]]))
          setFilters({ ...EMPTY_FILTERS, ...keep })
        }}>Limpiar</button>
      )}
    </div>
  )
}
