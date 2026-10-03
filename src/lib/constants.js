// Los colores de tipos, estados y prioridades viven en styles.css (clases por clave)
import { itemKey } from './router'
export const TYPES = {
  epica:    { label: 'Épica', short: 'EP' },
  historia: { label: 'Historia', short: 'HU' },
  tarea:    { label: 'Tarea', short: 'TK' },
  bug:      { label: 'Bug', short: 'BG' },
}
export const TYPE_KEYS = Object.keys(TYPES)

export const STATUSES = {
  pendiente:   { label: 'Pendiente' },
  en_progreso: { label: 'En progreso' },
  en_revision: { label: 'En revisión' },
  qa:          { label: 'QA' },
  cerrada:     { label: 'Cerrada' },
  cancelada:   { label: 'Cancelada' },
}
export const STATUS_KEYS = Object.keys(STATUSES)
export const OPEN_STATUSES = ['pendiente', 'en_progreso', 'en_revision', 'qa']

export const PRIORITIES = {
  critica: { label: 'Crítica', rank: 0 },
  alta:    { label: 'Alta', rank: 1 },
  media:   { label: 'Media', rank: 2 },
  baja:    { label: 'Baja', rank: 3 },
}
export const PRIORITY_KEYS = Object.keys(PRIORITIES)

export const SEVERITIES = {
  bloqueante: 'Bloqueante',
  mayor: 'Mayor',
  menor: 'Menor',
  trivial: 'Trivial',
}

export const SPRINT_STATUSES = {
  planificado: 'Planificado',
  activo: 'Activo',
  cerrado: 'Cerrado',
}

// Qué tipos pueden ser padre de cada tipo
export const ALLOWED_PARENTS = {
  epica: [],
  historia: ['epica'],
  tarea: ['epica', 'historia'],
  bug: ['epica', 'historia'],
}

export function itemLabel(item) {
  return item ? `${itemKey(item.id)} ${item.title}` : ''
}

export function fmtDate(value) {
  if (!value) return ''
  const d = value.length === 10 ? new Date(value + 'T00:00:00') : new Date(value)
  return d.toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('es-PA', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function fmtTime(value) {
  return new Date(value).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })
}

// "Hoy", "Ayer" o la fecha completa, para agrupar actividad por día
export function dayLabel(value) {
  const d = new Date(value), today = new Date()
  const days = Math.round((new Date(today.toDateString()) - new Date(d.toDateString())) / 864e5)
  const date = d.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  if (days === 0) return 'Hoy · ' + date
  if (days === 1) return 'Ayer · ' + date
  return date[0].toUpperCase() + date.slice(1)
}

// Agrupa ítems por sprint: el activo primero, luego el resto en el orden
// habitual de la app (sprints ordenados por fecha de inicio), y el Backlog al final.
// Cada grupo trae { key, sprint, rows }; "key" es el id del sprint o 'backlog'.
export function groupBySprint(rows, sprints, activeSprint, sprintsById) {
  const order = [...(activeSprint ? [activeSprint.id] : []), ...sprints.map(s => s.id).filter(id => id !== activeSprint?.id), 'backlog']
  const buckets = new Map(order.map(k => [k, []]))
  for (const r of rows) buckets.get(r.sprint_id ?? 'backlog')?.push(r)
  return order
    .map(key => ({ key, sprint: key === 'backlog' ? null : sprintsById[key], rows: buckets.get(key) ?? [] }))
    .filter(g => g.rows.length > 0)
}

export function isOverdue(item) {
  if (!item.due_date || !OPEN_STATUSES.includes(item.status)) return false
  return new Date(item.due_date + 'T23:59:59') < new Date()
}

// Traduce valores internos que aparecen en el historial
export function humanValue(field, value) {
  if (value == null || value === '') return '—'
  if (field === 'estado') return STATUSES[value]?.label ?? value
  if (field === 'tipo') return TYPES[value]?.label ?? value
  if (field === 'prioridad') return PRIORITIES[value]?.label ?? value
  if (field === 'severidad') return SEVERITIES[value] ?? value
  return value
}
