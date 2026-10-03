import { itemKey } from './router'

// Exportar listas a CSV (abre bien en Excel/Sheets, con BOM para que respete los acentos)
function cell(value) {
  const s = value == null ? '' : String(value)
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

// columns: [{ key, label }] o [{ get: row => valor, label }]
export function toCSV(columns, rows) {
  const header = columns.map(c => cell(c.label)).join(',')
  const lines = rows.map(r => columns.map(c => cell(c.get ? c.get(r) : r[c.key])).join(','))
  return [header, ...lines].join('\r\n')
}

export function downloadCSV(filename, csvText) {
  const blob = new Blob(['﻿' + csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

const WORK_ITEM_COLUMNS = [
  { label: 'Clave', get: i => itemKey(i.id) },
  { label: 'Tipo', key: 'type' },
  { label: 'Título', key: 'title' },
  { label: 'Estado', key: 'status' },
  { label: 'Prioridad', key: 'priority' },
  { label: 'Asignado', get: (i, ctx) => ctx.membersById[i.assignee_id]?.full_name ?? '' },
  { label: 'Sprint', get: (i, ctx) => ctx.sprintsById[i.sprint_id]?.name ?? 'Backlog' },
  { label: 'Story points', get: i => i.story_points ?? '' },
  { label: 'Horas estimadas', get: i => i.estimate_hours ?? '' },
  { label: 'Fecha límite', key: 'due_date' },
]

// Exporta ítems de work_items a CSV; ctx = { membersById, sprintsById }
export function exportWorkItems(filename, items, ctx) {
  const columns = WORK_ITEM_COLUMNS.map(c => ({ label: c.label, get: row => c.get ? c.get(row, ctx) : row[c.key] }))
  downloadCSV(filename, toCSV(columns, items))
}
