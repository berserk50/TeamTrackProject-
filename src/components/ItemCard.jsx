import { useApp } from '../lib/store'
import { fmtDate, isOverdue } from '../lib/constants'
import { TypeBadge, PriorityBadge, Avatar } from './ui'

export default function ItemCard({ item, draggable, onDragStart }) {
  const { membersById, itemsById, setOpenItem } = useApp()
  const parent = itemsById[item.parent_id]
  return (
    <div
      className={'item-card' + (item.status === 'cancelada' ? ' dim' : '')}
      draggable={draggable}
      onDragStart={e => { e.dataTransfer.setData('text/plain', String(item.id)); onDragStart?.(item) }}
      onClick={() => setOpenItem({ id: item.id })}
    >
      <div className="card-top">
        <TypeBadge type={item.type} />
        <span className="muted small">#{item.id}</span>
        <span className="spacer" />
        <PriorityBadge priority={item.priority} />
      </div>
      <div className="card-title">{item.title}</div>
      {parent && <div className="card-parent muted small">↳ {parent.title}</div>}
      {item.tags.length > 0 && (
        <div className="tags">{item.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
      )}
      <div className="card-bottom">
        {item.story_points != null && <span className="pts" title="Story points">{Number(item.story_points)} pts</span>}
        {item.due_date && (
          <span className={'small ' + (isOverdue(item) ? 'overdue' : 'muted')} title="Fecha límite">📅 {fmtDate(item.due_date)}</span>
        )}
        <span className="spacer" />
        <Avatar member={membersById[item.assignee_id]} size={24} />
      </div>
    </div>
  )
}
