import { useState } from 'react'
import { useApp } from '../lib/store'
import { STATUSES, OPEN_STATUSES, PRIORITIES, isOverdue } from '../lib/constants'
import ItemCard from '../components/ItemCard'
import { PageHeader, StatusDot } from '../components/ui'

export default function MyTasks() {
  const { items, me, activeMembers } = useApp()
  const [who, setWho] = useState(me?.id ?? activeMembers[0]?.id ?? '')
  const [onlySprint, setOnlySprint] = useState(false)
  const { activeSprint } = useApp()

  const mine = items.filter(i =>
    i.assignee_id === who && OPEN_STATUSES.includes(i.status) &&
    (!onlySprint || (activeSprint && i.sprint_id === activeSprint.id)))
    .sort((a, b) => PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank || a.id - b.id)

  const overdue = mine.filter(isOverdue).length
  const pts = mine.reduce((s, i) => s + Number(i.story_points ?? 0), 0)

  return (
    <div>
      <PageHeader title={who === me?.id ? 'Mis tareas' : 'Tareas de'}>
        <select value={who} onChange={e => setWho(e.target.value)} aria-label="Persona">
          {activeMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}{m.id === me?.id ? ' (yo)' : ''}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={onlySprint} onChange={e => setOnlySprint(e.target.checked)} /> Solo sprint activo</label>
      </PageHeader>
      <div className="stats">
        <div className="stat"><span>Abiertas</span><b>{mine.length}</b></div>
        <div className="stat"><span>Story points</span><b>{pts}</b></div>
        <div className={'stat' + (overdue ? ' bad' : '')}><span>Vencidas</span><b>{overdue}</b></div>
      </div>
      <div className="board">
        {OPEN_STATUSES.map(s => (
          <section key={s} className="column">
            <header>
              <span className="column-title"><StatusDot status={s} />{STATUSES[s].label}</span>
              <span className="column-count">{mine.filter(i => i.status === s).length}</span>
            </header>
            <div className="column-body">
              {mine.filter(i => i.status === s).map(i => <ItemCard key={i.id} item={i} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
