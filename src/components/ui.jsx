import { useEffect, useState } from 'react'
import { TYPES, STATUSES, PRIORITIES, TYPE_KEYS, STATUS_KEYS, PRIORITY_KEYS } from '../lib/constants'
import { useApp } from '../lib/store'
import { CloseIcon, SunIcon, MoonIcon } from './icons'
import { Link, itemPath, ITEM_PREFIX } from '../lib/router'

export function TypeBadge({ type }) {
  const t = TYPES[type]
  return <span className={'badge type-' + type} title={t.label}>{t.short}</span>
}

export function StatusDot({ status }) {
  return <span className={'dot status-' + status} aria-hidden="true" />
}

export function StatusBadge({ status }) {
  return <span className="badge status"><StatusDot status={status} />{STATUSES[status].label}</span>
}

export function PriorityBadge({ priority }) {
  const p = PRIORITIES[priority]
  return <span className="prio" title={'Prioridad ' + p.label}><span className={'dot prio-' + priority} aria-hidden="true" />{p.label}</span>
}

// Indica a qué sprint pertenece un ítem (o que está en el Backlog, sin sprint)
export function SprintBadge({ sprint }) {
  if (!sprint) return <span className="pill backlog" title="Sin sprint asignado">Backlog</span>
  return <span className={'pill ' + sprint.status} title={`Sprint: ${sprint.name}`}>{sprint.name}</span>
}

export function initials(name = '') {
  return name.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const AVATAR_TONES = 6
export function Avatar({ member, size = 26 }) {
  if (!member) return <span className="avatar empty" style={{ width: size, height: size }} title="Sin asignar">?</span>
  const tone = [...member.id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES
  return (
    <span className={'avatar av-' + tone} style={{ width: size, height: size, fontSize: size * 0.4 }} title={member.full_name}>
      {initials(member.full_name)}
    </span>
  )
}

// Texto con enlaces: [texto](https://…), URLs sueltas y claves de ítem (TT-12)
const RICH = new RegExp(String.raw`\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])|\b(${ITEM_PREFIX}-(\d+))\b`, 'g')
// mentions: nombres de los miembros mencionados; su "@Nombre" se resalta
export function RichText({ text, className, mentions }) {
  const out = []
  let last = 0
  const MENTION = mentions?.length
    ? new RegExp('@(' + mentions.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g')
    : null
  const plain = (s, at) => {
    if (!MENTION) return out.push(s)
    let i = 0
    for (const m of s.matchAll(MENTION)) {
      if (m.index > i) out.push(s.slice(i, m.index))
      out.push(<span key={'m' + (at + m.index)} className="mention">{m[0]}</span>)
      i = m.index + m[0].length
    }
    if (i < s.length) out.push(s.slice(i))
  }
  for (const m of text.matchAll(RICH)) {
    if (m.index > last) plain(text.slice(last, m.index), last)
    const k = m.index
    if (m[1]) out.push(<a key={k} href={m[2]} target="_blank" rel="noreferrer">{m[1]}</a>)
    else if (m[3]) out.push(<a key={k} href={m[3]} target="_blank" rel="noreferrer" className="bare-link">{m[3]}</a>)
    else out.push(<Link key={k} to={itemPath(Number(m[5]))}>{m[4]}</Link>)
    last = k + m[0].length
  }
  if (last < text.length) plain(text.slice(last), last)
  return <div className={className}>{out}</div>
}

// "Edgar Rosario" -> "Edgar R."
export function shortName(name = '') {
  const [first, second] = name.split(/\s+/)
  return second && !second.startsWith('(') ? `${first} ${second[0]}.` : first
}

// Avatar + nombre del responsable; visible en tarjetas, listas y árbol
export function Assignee({ member, size = 22, short }) {
  return (
    <span className={'assignee' + (member ? '' : ' none')} title={member ? 'Asignado a ' + member.full_name : 'Sin asignar'}>
      <Avatar member={member} size={size} />
      <span className="assignee-name">{member ? (short ? shortName(member.full_name) : member.full_name) : 'Sin asignar'}</span>
    </span>
  )
}

export function Progress({ value, wide, title }) {
  return (
    <span className={'progress' + (wide ? ' wide' : '')} title={title}>
      <span className="progress-track"><span className="progress-fill" style={{ width: value + '%' }} /></span>
      <span className="progress-label">{value}%</span>
    </span>
  )
}

// Encabezado común de cada vista: título, subtítulo opcional y controles a la derecha
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div className="page-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

/* ------------------------------ Tema ------------------------------ */

const THEME_KEY = 'teamtrack-theme'
const systemTheme = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

export function useTheme() {
  const [theme, setThemeState] = useState(() => document.documentElement.dataset.theme || systemTheme())
  useEffect(() => {
    // Si el usuario nunca eligió, sigue al sistema
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => { if (!document.documentElement.dataset.theme) setThemeState(systemTheme()) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const setTheme = (t) => {
    document.documentElement.dataset.theme = t
    try { localStorage.setItem(THEME_KEY, t) } catch { /* sin almacenamiento: solo esta sesión */ }
    setThemeState(t)
  }
  return [theme, setTheme]
}

export function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  return (
    <div className="segmented" role="group" aria-label="Tema">
      <button type="button" className={theme === 'light' ? 'active' : ''} aria-pressed={theme === 'light'}
              onClick={() => setTheme('light')} title="Modo claro">
        <SunIcon /><span>Claro</span>
      </button>
      <button type="button" className={theme === 'dark' ? 'active' : ''} aria-pressed={theme === 'dark'}
              onClick={() => setTheme('dark')} title="Modo oscuro">
        <MoonIcon /><span>Oscuro</span>
      </button>
    </div>
  )
}

export function Modal({ title, onClose, children, wide, actions }) {
  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{title}</h2>
          <div className="modal-actions">
            {actions}
            <button className="btn icon ghost" onClick={onClose} aria-label="Cerrar"><CloseIcon /></button>
          </div>
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

// "TT-12", "tt12", "TT 12" o "#12" -> 12. Un número solo no cuenta: también puede ser parte de un título.
const KEY_QUERY = new RegExp(`^(?:#|${ITEM_PREFIX}[-\\s]?)(\\d+)$`, 'i')
export function keyFromQuery(q = '') {
  const m = q.trim().match(KEY_QUERY)
  return m ? Number(m[1]) : null
}

export function applyFilters(items, f) {
  // Buscar por clave muestra ese ítem aunque los demás filtros (sprint, estado…) lo ocultarían
  const key = keyFromQuery(f.q)
  if (key != null) return items.filter(i => Number(i.id) === key)
  const q = f.q.trim().toLowerCase()
  return items.filter(i =>
    (!q || i.title.toLowerCase().includes(q) || String(i.id) === q ||
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
      {!hide.includes('q') && <input type="search" className="search" placeholder="Buscar título, clave (TT-12) o etiqueta…" value={filters.q} onChange={set('q')} />}
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
