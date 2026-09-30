import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'
import { fmtDateTime, humanValue } from '../lib/constants'
import { Avatar } from './ui'
import { Link, itemPath, keyLabel } from '../lib/router'

const ACTION_LABELS = {
  creado: 'creó',
  modificado: 'cambió',
  cancelado: 'canceló',
  reabierto: 'reabrió',
  comentario: 'comentó en',
  adjunto: 'adjuntó un archivo en',
  'adjunto eliminado': 'quitó un adjunto de',
  eliminado: 'ELIMINÓ',
}

const PAGE = 100

// Lista de eventos del historial. Con itemId muestra solo ese ítem.
export default function HistoryList({ itemId, filters = {} }) {
  const { membersById, setOpenItem, itemsById, fail } = useApp()
  const [rows, setRows] = useState([])
  const [limit, setLimit] = useState(PAGE)
  const [done, setDone] = useState(false)

  async function load() {
    let q = supabase.from('history').select('*').order('created_at', { ascending: false }).limit(limit)
    if (itemId) q = q.eq('item_id', itemId)
    if (filters.actor) q = q.eq('actor_id', filters.actor)
    if (filters.action) q = q.eq('action', filters.action)
    if (filters.q) q = q.ilike('item_label', `%${filters.q}%`)
    if (filters.from) q = q.gte('created_at', filters.from)
    if (filters.to) q = q.lte('created_at', filters.to + 'T23:59:59')
    const { data, error } = await q
    if (error) return fail(error)
    setRows(data); setDone(data.length < limit)
  }

  useEffect(() => { load() }, [itemId, limit, filters.actor, filters.action, filters.q, filters.from, filters.to])

  // Tiempo real para el historial
  useEffect(() => {
    const ch = supabase.channel('history-' + (itemId ?? 'all'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'history' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [itemId, limit, filters.actor, filters.action, filters.q, filters.from, filters.to])

  if (!rows.length) return <p className="muted">Sin movimientos registrados.</p>

  return (
    <>
      <ul className="history">
        {rows.map(h => (
          <li key={h.id} className={h.action === 'eliminado' ? 'deleted' : h.action === 'cancelado' ? 'cancelled' : ''}>
            <Avatar member={membersById[h.actor_id]} size={26} />
            <div className="grow">
              <div>
                <b>{h.actor_name ?? 'Sistema'}</b> {ACTION_LABELS[h.action] ?? h.action}{' '}
                {!itemId && (
                  itemsById[h.item_id]
                    ? <Link to={itemPath(h.item_id)}>{keyLabel(h.item_label)}</Link>
                    : <span className="strike-if-deleted">{keyLabel(h.item_label)}</span>
                )}
                {h.action === 'modificado' && <> · <i>{h.field}</i>: {humanValue(h.field, h.old_value)} → <b>{humanValue(h.field, h.new_value)}</b></>}
                {h.action === 'creado' && <> ({humanValue('tipo', h.new_value)})</>}
                {(h.action === 'cancelado' || h.action === 'reabierto') && <> · estado: {humanValue('estado', h.old_value)} → <b>{humanValue('estado', h.new_value)}</b></>}
                {(h.action === 'adjunto') && <> · {h.new_value}</>}
                {(h.action === 'adjunto eliminado') && <> · {h.old_value}</>}
              </div>
              {h.action === 'comentario' && h.new_value && <div className="history-extra pre">{h.new_value}</div>}
              {h.reason && <div className="history-extra"><b>Motivo:</b> {h.reason}</div>}
              {h.snapshot && (
                <details className="history-extra">
                  <summary>Ver datos del ítem eliminado</summary>
                  <pre>{JSON.stringify(h.snapshot, null, 2)}</pre>
                </details>
              )}
            </div>
            <span className="muted small nowrap">{fmtDateTime(h.created_at)}</span>
          </li>
        ))}
      </ul>
      {!done && <button className="btn ghost" onClick={() => setLimit(limit + PAGE)}>Cargar más</button>}
    </>
  )
}
