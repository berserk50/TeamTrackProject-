import { useState } from 'react'
import { useApp, updateItem } from '../lib/store'
import { STATUSES, OPEN_STATUSES, PRIORITIES } from '../lib/constants'
import { FilterBar, applyFilters, keyFromQuery, EMPTY_FILTERS, ReasonDialog, PageHeader, StatusDot } from '../components/ui'
import ItemCard from '../components/ItemCard'
import { itemKey } from '../lib/router'

export default function Board() {
  const { items, activeSprint, canEdit, fail, toast, loadItems } = useApp()
  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    sprint: activeSprint ? String(activeSprint.id) : '',
  })
  const [showCancelled, setShowCancelled] = useState(false)
  const [hideEpics, setHideEpics] = useState(true)
  const [dragOver, setDragOver] = useState(null)
  const [pendingCancel, setPendingCancel] = useState(null)

  // Al buscar por clave se muestra el ítem aunque sea una épica o esté cancelado
  const byKey = keyFromQuery(filters.q) != null
  const visible = applyFilters(items, filters)
    .filter(i => byKey || !(hideEpics && i.type === 'epica' && !filters.type))
  const withCancelled = showCancelled || (byKey && visible.some(i => i.status === 'cancelada'))
  const columns = [...OPEN_STATUSES, 'cerrada', ...(withCancelled ? ['cancelada'] : [])]

  async function drop(status, e) {
    e.preventDefault(); setDragOver(null)
    const id = Number(e.dataTransfer.getData('text/plain'))
    const item = items.find(i => i.id === id)
    if (!item || item.status === status) return
    if (status === 'cancelada') return setPendingCancel(item)
    const { error } = await updateItem(id, { status })
    if (error) return fail(error)
    loadItems()
  }

  async function confirmCancel(reason) {
    const { error } = await updateItem(pendingCancel.id, { status: 'cancelada', cancel_reason: reason })
    if (error) return fail(error)
    toast(`${itemKey(pendingCancel.id)} cancelado`); setPendingCancel(null); loadItems()
  }

  return (
    <div>
      <PageHeader title="Tablero">
        <label className="check"><input type="checkbox" checked={hideEpics} onChange={e => setHideEpics(e.target.checked)} /> Ocultar épicas</label>
        <label className="check"><input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)} /> Mostrar canceladas</label>
      </PageHeader>
      <FilterBar filters={filters} setFilters={setFilters} hide={['status']} />
      {!activeSprint && <p className="hint">No hay sprint activo. Inicia uno en la vista Sprints o elige un filtro.</p>}

      <div className="board">
        {columns.map(status => {
          const col = visible.filter(i => i.status === status)
            .sort((a, b) => PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank || a.id - b.id)
          const pts = col.reduce((s, i) => s + Number(i.story_points ?? 0), 0)
          return (
            <section
              key={status}
              className={'column' + (dragOver === status ? ' over' : '')}
              onDragOver={canEdit ? (e => { e.preventDefault(); setDragOver(status) }) : undefined}
              onDragLeave={() => setDragOver(null)}
              onDrop={canEdit ? (e => drop(status, e)) : undefined}
            >
              <header>
                <span className="column-title"><StatusDot status={status} />{STATUSES[status].label}</span>
                <span className="column-count">{col.length}{pts ? ` · ${pts} pts` : ''}</span>
              </header>
              <div className="column-body">
                {col.map(i => <ItemCard key={i.id} item={i} draggable={canEdit} />)}
              </div>
            </section>
          )
        })}
      </div>

      {pendingCancel && (
        <ReasonDialog
          title={`Cancelar ${itemKey(pendingCancel.id)}`}
          description={pendingCancel.title}
          confirmLabel="Cancelar ítem"
          onConfirm={confirmCancel}
          onClose={() => setPendingCancel(null)}
        />
      )}
    </div>
  )
}
