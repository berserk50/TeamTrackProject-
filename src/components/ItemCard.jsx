import { useApp } from '../lib/store'
import { fmtDate, isOverdue } from '../lib/constants'
import { TypeBadge, PriorityBadge, Assignee } from './ui'
import { CalendarIcon } from './icons'
import { Link, itemKey, itemPath } from '../lib/router'

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
        <Link className="card-id" to={itemPath(item.id)} onClick={e => e.stopPropagation()}>{itemKey(item.id)}</Link>
        <span className="spacer" />
        <PriorityBadge priority={item.priority} />
      </div>
      <div className="card-title">{item.title}</div>
      {parent && <div className="card-parent">↳ {parent.title}</div>}
      {item.tags.length > 0 && (
        <div className="tags">{item.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
      )}
      <div className="card-bottom">
        {item.story_points != null && <span className="pts" title="Story points">{Number(item.story_points)} pts</span>}
        {item.due_date && (
          <span className={'card-due' + (isOverdue(item) ? ' overdue' : '')} title="Fecha límite"><CalendarIcon size={13} />{fmtDate(item.due_date)}</span>
        )}
        <span className="spacer" />
        <Assignee member={membersById[item.assignee_id]} short />
      </div>
    </div>
  )
}
