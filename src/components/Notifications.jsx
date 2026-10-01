import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'
import { fmtDateTime, humanValue } from '../lib/constants'
import { Avatar } from './ui'
import { BellIcon } from './icons'
import { navigate, itemPath, keyLabel } from '../lib/router'

const LIMIT = 50

// Texto de cada aviso (sin el nombre de quien lo hizo ni el ítem)
function describe(n) {
  if (n.kind === 'asignacion') return n.action === 'creado' ? 'creó y te asignó' : 'te asignó'
  if (n.kind === 'mencion') return 'te mencionó en'
  if (n.kind === 'comentario') return 'comentó en'
  if (n.field === 'asignado') return n.new_value ? 'reasignó' : 'quitó el responsable de'
  return {
    cancelado: 'canceló', reabierto: 'reabrió', eliminado: 'eliminó',
    adjunto: 'adjuntó un archivo en', 'adjunto eliminado': 'quitó un adjunto de',
  }[n.action] ?? `cambió ${n.field} en`
}

function detail(n) {
  if (n.kind === 'mencion' || n.kind === 'comentario') return n.new_value
  if (n.action === 'adjunto') return n.new_value
  if (n.action === 'adjunto eliminado') return n.old_value
  if (n.kind === 'asignacion' || n.action === 'eliminado') return null
  if (n.field === 'descripcion' || n.field === 'criterios de aceptacion') return null
  return `${humanValue(n.field, n.old_value)} → ${humanValue(n.field, n.new_value)}`
}

// "hace 5 min", "hace 2 h", o la fecha
function timeAgo(value) {
  const min = Math.round((Date.now() - new Date(value)) / 6e4)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  if (min < 24 * 60) return `hace ${Math.round(min / 60)} h`
  if (min < 7 * 24 * 60) return `hace ${Math.round(min / 1440)} d`
  return fmtDateTime(value)
}

// Campana de la barra superior con los avisos del usuario (como Jira)
export default function NotificationBell() {
  const { me, membersById, fail } = useApp()
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const [onlyUnread, setOnlyUnread] = useState(false)
  const box = useRef(null)

  async function load() {
    const { data, error } = await supabase.from('notifications').select('*')
      .order('created_at', { ascending: false }).limit(LIMIT)
    // Sin la migración (notificaciones.sql) la tabla no existe: la campana no se muestra
    if (error) { if (error.code !== '42P01' && error.code !== 'PGRST205') fail(error); setList(null); return }
    setList(data)
  }

  useEffect(() => { load() }, [me.id])

  // Tiempo real: avisos nuevos y marcados como leídos en otra pestaña
  useEffect(() => {
    const ch = supabase.channel('notifications-' + me.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${me.id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [me.id])

  // Cerrar al hacer clic fuera o con Escape
  useEffect(() => {
    if (!open) return
    const onDown = e => { if (!box.current?.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (list === null) return null

  const unread = list.filter(n => !n.read_at).length
  const shown = onlyUnread ? list.filter(n => !n.read_at) : list

  async function markRead(ids) {
    if (!ids.length) return
    const now = new Date().toISOString()
    setList(l => l.map(n => (ids.includes(n.id) ? { ...n, read_at: now } : n)))
    const { error } = await supabase.from('notifications').update({ read_at: now }).in('id', ids)
    if (error) { fail(error); load() }
  }

  function openNotification(n) {
    if (!n.read_at) markRead([n.id])
    setOpen(false)
    if (n.item_id) navigate(itemPath(n.item_id))
  }

  return (
    <div className="notif" ref={box}>
      <button type="button" className={'btn ghost icon sm notif-trigger' + (open ? ' pressed' : '')}
              onClick={() => setOpen(!open)} aria-expanded={open}
              aria-label={unread ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'} title="Notificaciones">
        <BellIcon size={18} />
        {unread > 0 && <span className="notif-count">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notificaciones">
          <div className="notif-head">
            <h2>Notificaciones</h2>
            <label className="notif-toggle">
              <input type="checkbox" checked={onlyUnread} onChange={e => setOnlyUnread(e.target.checked)} />
              Solo no leídas
            </label>
          </div>
          {unread > 0 && (
            <button type="button" className="notif-mark-all"
                    onClick={() => markRead(list.filter(n => !n.read_at).map(n => n.id))}>Marcar todas como leídas</button>
          )}

          {shown.length === 0
            ? <p className="notif-empty muted">{onlyUnread ? 'No tienes avisos sin leer.' : 'Aún no tienes notificaciones.'}</p>
            : (
              <ul className="notif-list">
                {shown.map(n => {
                  const extra = detail(n)
                  return (
                    <li key={n.id}>
                      <button type="button" className={'notif-item' + (n.read_at ? '' : ' unread')} onClick={() => openNotification(n)}>
                        <Avatar member={membersById[n.actor_id]} size={30} />
                        <span className="notif-text">
                          <span><b>{n.actor_name ?? 'Sistema'}</b> {describe(n)} <b>{keyLabel(n.item_label)}</b></span>
                          {extra && <span className="notif-extra">{extra}</span>}
                          <span className="notif-time" title={fmtDateTime(n.created_at)}>{timeAgo(n.created_at)}</span>
                        </span>
                        {!n.read_at && <span className="notif-dot" aria-label="Sin leer" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
        </div>
      )}
    </div>
  )
}
