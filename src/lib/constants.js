export const TYPES = {
  epica:    { label: 'Épica',          short: 'EP', color: '#7c3aed' },
  historia: { label: 'Historia',       short: 'HU', color: '#2563eb' },
  tarea:    { label: 'Tarea',          short: 'TK', color: '#0d9488' },
  bug:      { label: 'Bug',            short: 'BG', color: '#dc2626' },
}
export const TYPE_KEYS = Object.keys(TYPES)

export const STATUSES = {
  pendiente:   { label: 'Pendiente',    color: '#64748b' },
  en_progreso: { label: 'En progreso',  color: '#2563eb' },
  en_revision: { label: 'En revisión',  color: '#d97706' },
  qa:          { label: 'QA',           color: '#9333ea' },
  cerrada:     { label: 'Cerrada',      color: '#16a34a' },
  cancelada:   { label: 'Cancelada',    color: '#9ca3af' },
}
export const STATUS_KEYS = Object.keys(STATUSES)
export const OPEN_STATUSES = ['pendiente', 'en_progreso', 'en_revision', 'qa']

export const PRIORITIES = {
  critica: { label: 'Crítica', color: '#dc2626', rank: 0 },
  alta:    { label: 'Alta',    color: '#ea580c', rank: 1 },
  media:   { label: 'Media',   color: '#ca8a04', rank: 2 },
  baja:    { label: 'Baja',    color: '#64748b', rank: 3 },
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
  return item ? `#${item.id} ${item.title}` : ''
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
