import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'
import { PRIORITIES, STATUS_KEYS, fmtDate, isOverdue, groupBySprint } from '../lib/constants'
import { FilterBar, applyFilters, EMPTY_FILTERS, TypeBadge, StatusBadge, PriorityBadge, Assignee, SprintBadge, PageHeader } from '../components/ui'
import { ArrowUpIcon, ArrowDownIcon } from '../components/icons'
import { Link, itemKey, itemPath } from '../lib/router'

const SORTS = {
  id:       (a, b) => a.id - b.id,
  title:    (a, b) => a.title.localeCompare(b.title),
  priority: (a, b) => PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank,
  status:   (a, b) => STATUS_KEYS.indexOf(a.status) - STATUS_KEYS.indexOf(b.status),
  points:   (a, b) => Number(a.story_points ?? -1) - Number(b.story_points ?? -1),
  due:      (a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'),
}

// Claves de los hijos directos y cuántos están cerrados (los cancelados no cuentan)
const MAX_KEYS = 4
function ChildrenCell({ kids = [] }) {
  if (!kids.length) return null
  const valid = kids.filter(k => k.status !== 'cancelada')
  const done = valid.filter(k => k.status === 'cerrada').length
  return (
    <div className="children-cell" title={kids.map(k => `${itemKey(k.id)} ${k.title}`).join('\n')}>
      <span className="children-count">{done}/{valid.length}</span>
      {kids.slice(0, MAX_KEYS).map(k => (
        <Link key={k.id} to={itemPath(k.id)} onClick={e => e.stopPropagation()}
              className={'child-key' + (['cerrada', 'cancelada'].includes(k.status) ? ' done' : '')}>{itemKey(k.id)}</Link>
      ))}
      {kids.length > MAX_KEYS && <span className="muted">+{kids.length - MAX_KEYS}</span>}
    </div>
  )
}

// Fila separadora con el nombre del sprint (y sus puntos) seguida de sus ítems
function GroupRows({ group, activeSprint, canEdit, grouped, membersById, sprintsById, itemsById, childrenOf, selected, toggle, setOpenItem }) {
  const pts = group.rows.reduce((s, i) => s + Number(i.story_points ?? 0), 0)
  const cols = canEdit ? 12 : 11
  return (
    <>
      {grouped && (
        <tr className="group-row">
          <td colSpan={cols}>
            <SprintBadge sprint={group.sprint} />
            {group.sprint && group.sprint.id === activeSprint?.id && <span className="muted small"> · sprint activo</span>}
            <span className="muted small"> · {group.rows.length} ítem(s) · {pts} pts</span>
          </td>
        </tr>
      )}
      {group.rows.map(i => (
        <tr key={i.id} onClick={() => setOpenItem({ id: i.id })} className={i.status === 'cancelada' ? 'dim' : ''}>
          {canEdit && <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} /></td>}
          <td className="nowrap"><Link className="key-link" to={itemPath(i.id)} onClick={e => e.stopPropagation()}>{itemKey(i.id)}</Link></td>
          <td><TypeBadge type={i.type} /></td>
          <td className="title-cell">{i.title}{i.tags.map(t => <span key={t} className="tag">{t}</span>)}</td>
          <td><StatusBadge status={i.status} /></td>
          <td><PriorityBadge priority={i.priority} /></td>
          <td><Assignee member={membersById[i.assignee_id]} /></td>
          <td className="small col-sprint"><SprintBadge sprint={sprintsById[i.sprint_id]} /></td>
          <td className="num">{i.story_points != null ? Number(i.story_points) : ''}</td>
          <td className={'nowrap' + (isOverdue(i) ? ' overdue' : '')}>{fmtDate(i.due_date)}</td>
          <td className="small muted col-parent">{itemsById[i.parent_id] ? `${itemKey(i.parent_id)} ${itemsById[i.parent_id].title}` : ''}</td>
          <td className="col-children"><ChildrenCell kids={childrenOf[i.id]} /></td>
        </tr>
      ))}
    </>
  )
}

export default function ListView() {
  const { items, membersById, sprintsById, sprints, activeSprint, activeMembers, itemsById, canEdit, setOpenItem, fail, toast, loadItems } = useApp()
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, status: 'abiertos' })
  const [sort, setSort] = useState({ key: 'priority', dir: 1 })
  const [selected, setSelected] = useState(new Set())
  const [grouped, setGrouped] = useState(true)

  const childrenOf = {}
  for (const i of items) if (i.parent_id) (childrenOf[i.parent_id] ??= []).push(i)
  for (const k in childrenOf) childrenOf[k].sort((a, b) => a.id - b.id)

  const rows = applyFilters(items, filters).sort((a, b) => SORTS[sort.key](a, b) * sort.dir || b.id - a.id)
  const totalPts = rows.reduce((s, i) => s + Number(i.story_points ?? 0), 0)
  const groups = grouped ? groupBySprint(rows, sprints, activeSprint, sprintsById) : [{ key: 'todos', sprint: null, rows }]

  const th = (key, label) => (
    <th className="sortable" onClick={() => setSort({ key, dir: sort.key === key ? -sort.dir : 1 })}>
      <span className="th-sort">{label}{sort.key === key && (sort.dir > 0 ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />)}</span>
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
      <PageHeader title="Backlog" subtitle={`${rows.length} ítems · ${totalPts} pts`}>
        <label className="check"><input type="checkbox" checked={grouped} onChange={e => setGrouped(e.target.checked)} /> Agrupar por sprint</label>
      </PageHeader>
      <FilterBar filters={filters} setFilters={setFilters} />

      {canEdit && selected.size > 0 && (
        <div className="bulkbar">
          <span className="bulk-count">{selected.size} seleccionados</span>
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
              {th('id', 'Clave')}<th>Tipo</th>{th('title', 'Título')}{th('status', 'Estado')}{th('priority', 'Prioridad')}
              <th>Asignado</th><th className="col-sprint">Sprint</th>{th('points', 'Pts')}{th('due', 'Fecha límite')}<th className="col-parent">Padre</th><th className="col-children">Hijos</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <GroupRows key={g.key} group={g} sprintsById={sprintsById} activeSprint={activeSprint} canEdit={canEdit}
                         grouped={grouped} membersById={membersById} itemsById={itemsById} childrenOf={childrenOf}
                         selected={selected} toggle={toggle} setOpenItem={setOpenItem} />
            ))}
            {rows.length === 0 && <tr><td colSpan={canEdit ? 12 : 11} className="empty-row">No hay ítems con estos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
