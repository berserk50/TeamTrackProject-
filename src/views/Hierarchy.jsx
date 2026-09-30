import { useState } from 'react'
import { useApp } from '../lib/store'
import { TypeBadge, StatusBadge, PriorityBadge, Avatar } from '../components/ui'

function progress(item, childrenOf) {
  // % de hijos cerrados (recursivo, sin contar cancelados)
  const leaves = []
  const walk = (i) => {
    const kids = childrenOf[i.id] ?? []
    if (!kids.length) { if (i !== item) leaves.push(i); return }
    kids.forEach(walk)
  }
  walk(item)
  const valid = leaves.filter(l => l.status !== 'cancelada')
  if (!valid.length) return null
  return Math.round((valid.filter(l => l.status === 'cerrada').length / valid.length) * 100)
}

export default function Hierarchy() {
  const { items, membersById, setOpenItem, canEdit } = useApp()
  const [showClosed, setShowClosed] = useState(false)
  const [collapsed, setCollapsed] = useState(new Set())

  const pool = showClosed ? items : items.filter(i => !['cerrada', 'cancelada'].includes(i.status))
  const ids = new Set(pool.map(i => i.id))
  const childrenOf = {}
  for (const i of pool) if (i.parent_id && ids.has(i.parent_id)) (childrenOf[i.parent_id] ??= []).push(i)
  for (const k in childrenOf) childrenOf[k].sort((a, b) => a.id - b.id)
  // El avance se calcula con TODOS los hijos, aunque los cerrados estén ocultos
  const allChildrenOf = {}
  for (const i of items) if (i.parent_id) (allChildrenOf[i.parent_id] ??= []).push(i)

  const roots = pool.filter(i => !i.parent_id || !ids.has(i.parent_id))
  const epics = roots.filter(i => i.type === 'epica').sort((a, b) => a.id - b.id)
  const orphans = roots.filter(i => i.type !== 'epica').sort((a, b) => a.id - b.id)

  const toggle = (id) => { const s = new Set(collapsed); s.has(id) ? s.delete(id) : s.add(id); setCollapsed(s) }

  function Node({ item, depth }) {
    const kids = childrenOf[item.id] ?? []
    const pct = allChildrenOf[item.id]?.length ? progress(item, allChildrenOf) : null
    const isCollapsed = collapsed.has(item.id)
    return (
      <>
        <div className="tree-row" style={{ paddingLeft: 12 + depth * 26 }}>
          <span className="twisty" onClick={() => kids.length && toggle(item.id)}>
            {kids.length ? (isCollapsed ? '▸' : '▾') : ''}
          </span>
          <TypeBadge type={item.type} />
          <a className="grow" onClick={() => setOpenItem({ id: item.id })}>#{item.id} {item.title}</a>
          {pct != null && (
            <span className="progress" title={`${pct}% de los hijos cerrados`}>
              <span style={{ width: pct + '%' }} /><em>{pct}%</em>
            </span>
          )}
          <PriorityBadge priority={item.priority} />
          <StatusBadge status={item.status} />
          <Avatar member={membersById[item.assignee_id]} size={22} />
          {canEdit && item.type !== 'tarea' && item.type !== 'bug' && (
            <button className="btn ghost xs" title="Agregar hijo" onClick={() => setOpenItem({
              new: true,
              defaults: { type: item.type === 'epica' ? 'historia' : 'tarea', parent_id: item.id, sprint_id: item.sprint_id },
            })}>+</button>
          )}
        </div>
        {!isCollapsed && kids.map(k => <Node key={k.id} item={k} depth={depth + 1} />)}
      </>
    )
  }

  return (
    <div>
      <div className="view-head">
        <h2>Jerarquía</h2>
        <span className="muted small">Épica → Historia de usuario → Tarea / Bug</span>
        <label className="check"><input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} /> Incluir cerrados y cancelados</label>
      </div>
      <div className="tree card">
        {epics.length === 0 && <p className="muted pad">No hay épicas abiertas.</p>}
        {epics.map(e => <Node key={e.id} item={e} depth={0} />)}
      </div>
      {orphans.length > 0 && (
        <>
          <h3 className="sub">Sin épica ({orphans.length})</h3>
          <div className="tree card">{orphans.map(o => <Node key={o.id} item={o} depth={0} />)}</div>
        </>
      )}
    </div>
  )
}
