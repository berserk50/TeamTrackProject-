import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'
import { PRIORITIES, STATUS_KEYS, fmtDate, isOverdue } from '../lib/constants'
import { FilterBar, applyFilters, EMPTY_FILTERS, TypeBadge, StatusBadge, PriorityBadge, Avatar } from '../components/ui'

const SORTS = {
  id:       (a, b) => a.id - b.id,
  title:    (a, b) => a.title.localeCompare(b.title),
  priority: (a, b) => PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank,
  status:   (a, b) => STATUS_KEYS.indexOf(a.status) - STATUS_KEYS.indexOf(b.status),
  points:   (a, b) => Number(a.story_points ?? -1) - Number(b.story_points ?? -1),
  due:      (a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'),
}

export default function ListView() {
  const { items, membersById, sprintsById, sprints, activeMembers, itemsById, canEdit, setOpenItem, fail, toast, loadItems } = useApp()
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, status: 'abiertos' })
  const [sort, setSort] = useState({ key: 'priority', dir: 1 })
  const [selected, setSelected] = useState(new Set())

  const rows = applyFilters(items, filters).sort((a, b) => SORTS[sort.key](a, b) * sort.dir || b.id - a.id)
  const totalPts = rows.reduce((s, i) => s + Number(i.story_points ?? 0), 0)

  const th = (key, label) => (
    <th className="sortable" onClick={() => setSort({ key, dir: sort.key === key ? -sort.dir : 1 })}>
      {label}{sort.key === key ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}
    </th>
  )

  const toggle = (id) => {
    const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s)
  }

  async function bulk(patch) {
    const ids = [...selected]
    const { error } = await supabase.from('work_items').update(patch).in('id', ids)
    if (error) return fail(error)
    toast(`${ids.length} ítem(s) actualizados`); setSelected(new Set()); loadItems()
  }

  return (
    <div>
      <div className="view-head">
        <h2>Backlog</h2>
        <span className="muted">{rows.length} ítems · {totalPts} pts</span>
      </div>
      <FilterBar filters={filters} setFilters={setFilters} />

      {canEdit && selected.size > 0 && (
        <div className="bulkbar">
          <b>{selected.size} seleccionados</b>
          <select value="" onChange={e => bulk({ sprint_id: e.target.value === 'backlog' ? null : Number(e.target.value) })}>
            <option value="" disabled>Mover a sprint…</option>
            <option value="backlog">Backlog (sin sprint)</option>
            {sprints.filter(s => s.status !== 'cerrado').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value="" onChange={e => bulk({ assignee_id: e.target.value === 'none' ? null : e.target.value })}>
            <option value="" disabled>Asignar a…</option>
            <option value="none">Sin asignar</option>
            {activeMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          <button className="btn ghost sm" onClick={() => setSelected(new Set())}>Quitar selección</button>
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {canEdit && (
                <th><input type="checkbox"
                  checked={rows.length > 0 && rows.every(r => selected.has(r.id))}
                  onChange={e => setSelected(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())} /></th>
              )}
              {th('id', '#')}<th>Tipo</th>{th('title', 'Título')}{th('status', 'Estado')}{th('priority', 'Prioridad')}
              <th>Asignado</th><th>Sprint</th>{th('points', 'Pts')}{th('due', 'Fecha límite')}<th>Padre</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(i => (
              <tr key={i.id} onClick={() => setOpenItem({ id: i.id })} className={i.status === 'cancelada' ? 'dim' : ''}>
                {canEdit && <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} /></td>}
                <td className="muted">{i.id}</td>
                <td><TypeBadge type={i.type} /></td>
                <td className="title-cell">{i.title}{i.tags.map(t => <span key={t} className="tag">{t}</span>)}</td>
                <td><StatusBadge status={i.status} /></td>
                <td><PriorityBadge priority={i.priority} /></td>
                <td><span className="assignee"><Avatar member={membersById[i.assignee_id]} size={22} /> {membersById[i.assignee_id]?.full_name ?? ''}</span></td>
                <td className="small">{sprintsById[i.sprint_id]?.name ?? <span className="muted">Backlog</span>}</td>
                <td>{i.story_points != null ? Number(i.story_points) : ''}</td>
                <td className={isOverdue(i) ? 'overdue' : ''}>{fmtDate(i.due_date)}</td>
                <td className="small muted">{itemsById[i.parent_id] ? `#${i.parent_id} ${itemsById[i.parent_id].title}` : ''}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={11} className="muted center">No hay ítems con estos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
