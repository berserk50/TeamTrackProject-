import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'
import { STATUSES, STATUS_KEYS, OPEN_STATUSES, SPRINT_STATUSES, fmtDate } from '../lib/constants'
import { Modal, TypeBadge, StatusBadge, StatusDot, Assignee, Progress, PageHeader } from '../components/ui'
import { ChevronIcon, PlusIcon } from '../components/icons'
import { itemKey } from '../lib/router'

export default function Sprints() {
  const { sprints, items, canEdit, activeSprint, membersById, setOpenItem, fail, toast, loadSprints, loadItems } = useApp()
  const [editing, setEditing] = useState(null) // sprint | {} (nuevo)
  const [closing, setClosing] = useState(null)
  const [expanded, setExpanded] = useState(activeSprint?.id ?? null)

  async function start(s) {
    const { error } = await supabase.from('sprints').update({ status: 'activo' }).eq('id', s.id)
    if (error) return fail(error)
    toast(`${s.name} iniciado`); loadSprints()
  }
  async function remove(s) {
    if (!confirm(`¿Eliminar ${s.name}? Sus ítems volverán al backlog.`)) return
    const { error } = await supabase.from('sprints').delete().eq('id', s.id)
    if (error) return fail(error)
    toast('Sprint eliminado'); loadSprints(); loadItems()
  }

  return (
    <div>
      <PageHeader title="Sprints">
        {canEdit && <button className="btn primary sm" onClick={() => setEditing({})}><PlusIcon /><span>Nuevo sprint</span></button>}
      </PageHeader>
      {sprints.length === 0 && <p className="empty-state card">Aún no hay sprints.</p>}

      <div className="sprint-list">
        {sprints.map(s => {
          const its = items.filter(i => i.sprint_id === s.id)
          const valid = its.filter(i => i.status !== 'cancelada')
          const total = valid.reduce((a, i) => a + Number(i.story_points ?? 0), 0)
          const done = valid.filter(i => i.status === 'cerrada').reduce((a, i) => a + Number(i.story_points ?? 0), 0)
          const pct = valid.length ? Math.round(valid.filter(i => i.status === 'cerrada').length / valid.length * 100) : 0
          const open = expanded === s.id
          return (
            <div key={s.id} className={'card sprint ' + s.status}>
              <div className="sprint-head" onClick={() => setExpanded(open ? null : s.id)}>
                <div className="grow">
                  <div className="sprint-name">
                    <ChevronIcon size={14} className={'icon chevron' + (open ? ' open' : '')} />
                    {s.name} <span className={'pill ' + s.status}>{SPRINT_STATUSES[s.status]}</span>
                  </div>
                  <div className="sprint-dates">{fmtDate(s.start_date)} → {fmtDate(s.end_date)}{s.goal && ` · Objetivo: ${s.goal}`}</div>
                </div>
                <div className="sprint-stats">
                  <span>{valid.length} ítems</span>
                  <span>{done}/{total} pts</span>
                  <Progress value={pct} wide />
                </div>
                {canEdit && (
                  <div className="sprint-actions" onClick={e => e.stopPropagation()}>
                    {s.status === 'planificado' && <button className="btn primary sm" disabled={!!activeSprint} title={activeSprint ? 'Ya hay un sprint activo' : ''} onClick={() => start(s)}>Iniciar</button>}
                    {s.status === 'activo' && <button className="btn primary sm" onClick={() => setClosing(s)}>Cerrar sprint</button>}
                    {s.status !== 'cerrado' && <button className="btn ghost sm" onClick={() => setEditing(s)}>Editar</button>}
                    {s.status === 'planificado' && <button className="btn danger-ghost sm" onClick={() => remove(s)}>Eliminar</button>}
                  </div>
                )}
              </div>
              {open && (
                <div className="sprint-body">
                  <div className="status-counts">
                    {STATUS_KEYS.map(k => {
                      const n = its.filter(i => i.status === k).length
                      return n ? <span key={k}><StatusDot status={k} />{STATUSES[k].label}: {n}</span> : null
                    })}
                  </div>
                  {its.length === 0 && <p className="muted">Sin ítems. Muévelos desde la vista Backlog.</p>}
                  <ul className="child-list">
                    {its.sort((a, b) => STATUS_KEYS.indexOf(a.status) - STATUS_KEYS.indexOf(b.status)).map(i => (
                      <li key={i.id} onClick={() => setOpenItem({ id: i.id })}>
                        <TypeBadge type={i.type} /><span className="grow">{itemKey(i.id)} {i.title}</span>
                        {i.story_points != null && <span className="pts">{Number(i.story_points)} pts</span>}
                        <StatusBadge status={i.status} /><Assignee member={membersById[i.assignee_id]} short />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editing && <SprintForm sprint={editing} onClose={() => setEditing(null)} />}
      {closing && <CloseSprint sprint={closing} onClose={() => setClosing(null)} />}
    </div>
  )
}

function SprintForm({ sprint, onClose }) {
  const { sprints, fail, toast, loadSprints } = useApp()
  const isNew = !sprint.id
  const today = new Date().toISOString().slice(0, 10)
  const in2w = new Date(Date.now() + 13 * 864e5).toISOString().slice(0, 10)
  const [f, setF] = useState({
    name: sprint.name ?? `Sprint ${sprints.length + 1}`,
    goal: sprint.goal ?? '',
    start_date: sprint.start_date ?? today,
    end_date: sprint.end_date ?? in2w,
  })
  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function save(e) {
    e.preventDefault()
    if (f.end_date < f.start_date) return fail({ message: 'La fecha de fin debe ser posterior al inicio' })
    const row = { ...f, name: f.name.trim(), goal: f.goal.trim() || null }
    const { error } = isNew
      ? await supabase.from('sprints').insert(row)
      : await supabase.from('sprints').update(row).eq('id', sprint.id)
    if (error) return fail(error)
    toast(isNew ? 'Sprint creado' : 'Sprint actualizado'); loadSprints(); onClose()
  }

  return (
    <Modal title={isNew ? 'Nuevo sprint' : `Editar ${sprint.name}`} onClose={onClose}>
      <form onSubmit={save}>
        <div className="modal-body grid-form">
          <label className="span2">Nombre<input required value={f.name} onChange={set('name')} /></label>
          <label>Inicio<input type="date" required value={f.start_date} onChange={set('start_date')} /></label>
          <label>Fin<input type="date" required value={f.end_date} onChange={set('end_date')} /></label>
          <label className="span2">Objetivo del sprint<textarea rows={3} value={f.goal} onChange={set('goal')} /></label>
        </div>
        <div className="modal-foot"><button className="btn primary">{isNew ? 'Crear' : 'Guardar'}</button></div>
      </form>
    </Modal>
  )
}

function CloseSprint({ sprint, onClose }) {
  const { items, sprints, fail, toast, loadSprints, loadItems } = useApp()
  const unfinished = items.filter(i => i.sprint_id === sprint.id && OPEN_STATUSES.includes(i.status))
  const targets = sprints.filter(s => s.status === 'planificado')
  const [dest, setDest] = useState('backlog')
  const [busy, setBusy] = useState(false)

  async function confirmClose() {
    setBusy(true)
    if (unfinished.length) {
      const { error } = await supabase.from('work_items')
        .update({ sprint_id: dest === 'backlog' ? null : Number(dest) })
        .in('id', unfinished.map(i => i.id))
      if (error) { setBusy(false); return fail(error) }
    }
    const { error } = await supabase.from('sprints').update({ status: 'cerrado' }).eq('id', sprint.id)
    setBusy(false)
    if (error) return fail(error)
    toast(`${sprint.name} cerrado`); loadSprints(); loadItems(); onClose()
  }

  return (
    <Modal title={`Cerrar ${sprint.name}`} onClose={onClose}>
      <div className="modal-body">
        {unfinished.length === 0
          ? <p>Todos los ítems del sprint están terminados.</p>
          : (
            <>
              <p>Hay <b>{unfinished.length}</b> ítem(s) sin terminar. ¿A dónde los movemos?</p>
              <select value={dest} onChange={e => setDest(e.target.value)}>
                <option value="backlog">Backlog (sin sprint)</option>
                {targets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </>
          )}
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Volver</button>
        <button className="btn primary" disabled={busy} onClick={confirmClose}>Cerrar sprint</button>
      </div>
    </Modal>
  )
}
