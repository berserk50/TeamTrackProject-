import { itemKey } from './router'
import { TYPES, STATUSES, PRIORITIES } from './constants'
import { downloadXlsx } from './xlsx'

// Exportación a Excel de ítems de trabajo.
// ctx = { itemsById, membersById, sprintsById } (itemsById debe tener TODOS los ítems, para resolver HU y épica)

// "HU-31 · Pruebas…" -> { code: 'HU-31', title: 'Pruebas…' }
const CODE = /^([A-Za-z]+-\d+(?:\.\d+)*)\s*[·:\-–—]\s*(.+)$/
export function splitCode(title = '') {
  const m = title.match(CODE)
  return m ? { code: m[1], title: m[2] } : { code: '', title }
}
const isCodeTag = t => /^(HU|EP)-\d+/i.test(t)

function ancestor(item, type, itemsById) {
  for (let p = itemsById[item.parent_id], guard = 0; p && guard < 10; p = itemsById[p.parent_id], guard++) {
    if (p.type === type) return p
  }
  return null
}

const label = i => (i ? i.title : '')
const num = v => (v == null || v === '' ? '' : Number(v))
const date = v => (v ? String(v).slice(0, 10) : '')

// Orden: cada HU seguida de sus tareas y bugs; luego lo que no cuelga de una HU
function orderByStory(items, itemsById) {
  const byCode = (a, b) => a.title.localeCompare(b.title, 'es', { numeric: true })
  const set = new Set(items.map(i => i.id))
  const storyOf = i => (i.type === 'historia' ? i : ancestor(i, 'historia', itemsById))
  const stories = items.filter(i => i.type === 'historia').sort(byCode)
  const out = [], used = new Set()
  for (const s of stories) {
    out.push(s); used.add(s.id)
    for (const c of items.filter(i => i.id !== s.id && storyOf(i)?.id === s.id).sort(byCode)) { out.push(c); used.add(c.id) }
  }
  // Ítems cuya HU no está en la lista (p. ej. backlog filtrado): agrupados por su HU igualmente
  const rest = items.filter(i => !used.has(i.id))
  rest.sort((a, b) => {
    const sa = storyOf(a)?.title ?? '￿', sb = storyOf(b)?.title ?? '￿'
    return sa.localeCompare(sb, 'es', { numeric: true }) || (a.type === 'epica') - (b.type === 'epica') || byCode(a, b)
  })
  return [...out, ...rest].filter(i => set.has(i.id))
}

export const ITEM_COLUMNS = [
  { label: 'Clave', width: 9 },
  { label: 'Código', width: 11 },
  { label: 'Tipo', width: 9 },
  { label: 'Título', width: 55 },
  { label: 'HU', width: 45 },
  { label: 'Épica', width: 35 },
  { label: 'Estado', width: 13 },
  { label: 'Prioridad', width: 10 },
  { label: 'Responsable', width: 22 },
  { label: 'Rol', width: 10 },
  { label: 'Integrantes', width: 40 },
  { label: 'Sprint', width: 40 },
  { label: 'Story points', width: 8 },
  { label: 'Horas estimadas', width: 9 },
  { label: 'Fecha límite', width: 12 },
  { label: 'Cerrada el', width: 12 },
]

export function itemRows(items, { itemsById, membersById, sprintsById }) {
  const name = id => membersById[id]?.full_name ?? ''
  const all = Object.values(itemsById)
  return orderByStory(items, itemsById).map(i => {
    const { code, title } = splitCode(i.title)
    const story = i.type === 'historia' ? i : ancestor(i, 'historia', itemsById)
    const epic = i.type === 'epica' ? null : ancestor(i, 'epica', itemsById)
    const tags = i.tags ?? []
    // Integrantes: en una HU, el responsable de la HU y de todas sus tareas; en el resto, su responsable
    const people = i.type === 'historia' || i.type === 'epica'
      ? [...new Set([i.assignee_id, ...all.filter(c => c.parent_id === i.id).map(c => c.assignee_id)].filter(Boolean).map(name))]
      : [name(i.assignee_id)].filter(Boolean)
    return [
      itemKey(i.id),
      code,
      TYPES[i.type]?.label ?? i.type,
      title,
      label(story) || tags.find(t => /^HU-/i.test(t)) || '',
      label(epic) || (i.type === 'epica' ? '' : tags.find(t => /^EP-/i.test(t)) || ''),
      STATUSES[i.status]?.label ?? i.status,
      PRIORITIES[i.priority]?.label ?? i.priority,
      name(i.assignee_id) || 'Sin asignar',
      tags.filter(t => !isCodeTag(t)).join(', '),
      people.join(', '),
      sprintsById[i.sprint_id]?.name ?? 'Backlog',
      num(i.story_points),
      num(i.estimate_hours),
      date(i.due_date),
      date(i.closed_at),
    ]
  })
}

export function exportItemsXlsx(filename, sheetLabel, items, ctx, extraSheets = []) {
  downloadXlsx(filename, [{ name: sheetLabel, columns: ITEM_COLUMNS, rows: itemRows(items, ctx) }, ...extraSheets])
}
