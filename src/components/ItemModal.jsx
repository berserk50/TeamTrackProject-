import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, publicUrl, BUCKET } from '../lib/supabase'
import { useApp, updateItem, deleteItemForever } from '../lib/store'
import {
  TYPES, TYPE_KEYS, STATUSES, PRIORITIES, PRIORITY_KEYS, SEVERITIES, ALLOWED_PARENTS,
  itemLabel, fmtDate, fmtDateTime, fmtTime, dayLabel, isOverdue,
} from '../lib/constants'
import { Modal, ReasonDialog, TypeBadge, StatusBadge, Avatar, Assignee, PriorityBadge, RichText } from './ui'
import HistoryList from './HistoryList'
import { Link, navigate, itemKey, itemPath } from '../lib/router'
import { RepoIcon, BranchIcon, ExternalIcon, FileIcon, PlusIcon, LinkIcon, EditIcon, ChevronIcon } from './icons'

const FIELDS = [
  'type', 'title', 'description', 'acceptance_criteria', 'status', 'priority', 'severity',
  'story_points', 'estimate_hours', 'due_date', 'tags', 'parent_id', 'sprint_id', 'assignee_id',
]

function toForm(item) {
  return {
    type: item.type ?? 'tarea',
    title: item.title ?? '',
    description: item.description ?? '',
    acceptance_criteria: item.acceptance_criteria ?? '',
    status: item.status ?? 'pendiente',
    priority: item.priority ?? 'media',
    severity: item.severity ?? '',
    story_points: item.story_points ?? '',
    estimate_hours: item.estimate_hours ?? '',
    due_date: item.due_date ?? '',
    tags: (item.tags ?? []).join(', '),
    parent_id: item.parent_id ?? '',
    sprint_id: item.sprint_id ?? '',
    assignee_id: item.assignee_id ?? '',
  }
}

function toRow(f) {
  const num = v => (v === '' || v == null ? null : Number(v))
  return {
    type: f.type,
    title: f.title.trim(),
    description: f.description.trim() || null,
    acceptance_criteria: f.acceptance_criteria.trim() || null,
    status: f.status,
    priority: f.priority,
    severity: f.type === 'bug' ? (f.severity || null) : null,
    story_points: num(f.story_points),
    estimate_hours: num(f.estimate_hours),
    due_date: f.due_date || null,
    tags: [...new Set(f.tags.split(',').map(t => t.trim()).filter(Boolean))],
    parent_id: num(f.parent_id),
    sprint_id: num(f.sprint_id),
    assignee_id: f.assignee_id || null,
  }
}

// Ventana de creación. Al crear se cierra y el aviso enlaza a la página del ítem nuevo.
export default function ItemModal({ target, onClose }) {
  const { toast, setOpenItem } = useApp()

  function created(data) {
    const label = TYPES[data.type].label
    toast(`${label} ${itemKey(data.id)} ${data.type === 'bug' ? 'creado' : 'creada'}: ${data.title}`, 'ok',
      { label: 'Ver', onClick: () => setOpenItem({ id: data.id }) })
    onClose()
  }

  return (
    <Modal title="Nuevo ítem" onClose={onClose} wide>
      <Details item={null} defaults={target.defaults} isNew children={[]} onCreated={created} onCancel={onClose} />
    </Modal>
  )
}

// Página propia de cada ítem: /browse/TT-12
export function ItemPage({ id }) {
  const { itemsById, items, canEdit, fail, toast, loadItems } = useApp()
  const item = itemsById[id]
  const [dialog, setDialog] = useState(null) // 'cancel' | 'delete'
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const comments = useComments(id)
  useEffect(() => { setEditing(false) }, [id]) // al pasar a otro ítem se vuelve a modo lectura

  useEffect(() => {
    document.title = item ? `[${itemKey(item.id)}] ${item.title} · TeamTrack` : `${itemKey(id)} · TeamTrack`
    return () => { document.title = 'TeamTrack' }
  }, [id, item?.title])

  if (!item) {
    return (
      <div className="item-page">
        <nav className="breadcrumb" aria-label="Ruta"><Link to="/#lista">Backlog</Link><span>/</span><span>{itemKey(id)}</span></nav>
        <div className="card empty-state">
          <p><b>{itemKey(id)}</b> no existe o fue eliminado.</p>
          <p className="small">Si fue eliminado, el registro queda en <Link to="/#historial">Historial</Link>.</p>
        </div>
      </div>
    )
  }

  const children = items.filter(i => i.parent_id === item.id)
  const parent = itemsById[item.parent_id]

  async function cancelItem(reason) {
    const { error } = await updateItem(item.id, { status: 'cancelada', cancel_reason: reason })
    if (error) return fail(error)
    toast(`${itemKey(item.id)} cancelado`); setDialog(null); loadItems()
  }
  async function reopen() {
    const { error } = await updateItem(item.id, { status: 'pendiente' })
    if (error) return fail(error)
    toast(`${itemKey(item.id)} reabierto`); loadItems()
  }
  async function removeForever(reason) {
    const { error } = await deleteItemForever(item, reason)
    if (error) return fail(error)
    toast(`${itemKey(item.id)} eliminado definitivamente`); setDialog(null)
    navigate('/#lista'); loadItems()
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.origin + itemPath(item.id))
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { toast('No se pudo copiar el enlace', 'error') }
  }

  return (
    <div className="item-page">
      <nav className="breadcrumb" aria-label="Ruta">
        <Link to="/#lista">Backlog</Link>
        {parent && <><span>/</span><Link to={itemPath(parent.id)}>{itemKey(parent.id)}</Link></>}
        <span>/</span><span aria-current="page">{itemKey(item.id)}</span>
      </nav>

      <div className="item-page-head">
        <div className="item-page-key">
          <TypeBadge type={item.type} />
          <span className="key">{itemKey(item.id)}</span>
          <StatusBadge status={item.status} />
        </div>
        <div className="item-page-actions">
          {canEdit && !editing && <button className="btn sm" onClick={() => setEditing(true)}><EditIcon />Editar</button>}
          <button className="btn ghost sm" onClick={copyLink}><LinkIcon />{copied ? 'Enlace copiado' : 'Copiar enlace'}</button>
          {canEdit && (item.status !== 'cancelada'
            ? <button className="btn ghost sm" onClick={() => setDialog('cancel')}>Cancelar ítem</button>
            : <button className="btn ghost sm" onClick={reopen}>Reabrir</button>)}
          {canEdit && <button className="btn danger-ghost sm" onClick={() => setDialog('delete')}>Eliminar</button>}
        </div>
      </div>

      {item.status === 'cancelada' && (
        <div className="notice warn page-notice">Cancelado. Motivo: {item.cancel_reason}</div>
      )}

      <div className="card item-sheet">
        {editing
          ? <Details key={item.id} item={item} isNew={false} children={children} activity={<Activity item={item} comments={comments} />}
                     onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
          : <ItemReadView item={item} children={children} dev={<DevPanel item={item} comments={comments} />} activity={<Activity item={item} comments={comments} />} />}
      </div>

      {dialog === 'cancel' && (
        <ReasonDialog
          title={`Cancelar ${itemKey(item.id)}`}
          description="El ítem se conserva con estado Cancelada y el motivo queda en el historial. Se puede reabrir después."
          confirmLabel="Cancelar ítem" onConfirm={cancelItem} onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'delete' && (
        <ReasonDialog
          danger title={`Eliminar ${itemKey(item.id)} definitivamente`}
          description={`Se borrará el ítem, sus comentarios y sus adjuntos. ${children.length ? `Sus ${children.length} hijo(s) quedarán sin padre. ` : ''}En el historial queda el registro de quién lo eliminó, cuándo, el motivo y una copia de sus datos. Úsalo solo para ítems creados por error; si no, mejor cancélalo.`}
          confirmLabel="Eliminar definitivamente" onConfirm={removeForever} onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

/* ---------------------------- Modo lectura ---------------------------- */

// Épica a la que pertenece el ítem (subiendo por la cadena de padres)
function epicOf(item, itemsById) {
  let p = itemsById[item.parent_id]
  for (let guard = 0; p && guard < 10; guard++) {
    if (p.type === 'epica') return p
    p = itemsById[p.parent_id]
  }
  return null
}

const DETAILS_KEY = 'teamtrack-details-open'
function useDetailsOpen() {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(DETAILS_KEY) !== '0' } catch { return true }
  })
  const toggle = () => {
    try { localStorage.setItem(DETAILS_KEY, open ? '0' : '1') } catch { /* solo esta sesión */ }
    setOpen(!open)
  }
  return [open, toggle]
}

// Vista por defecto de la página del ítem: solo lectura; los cambios se hacen con "Editar"
function ItemReadView({ item, children, dev, activity }) {
  const { itemsById, membersById, sprintsById, setOpenItem, canEdit } = useApp()
  const [detailsOpen, toggleDetails] = useDetailsOpen()
  const epic = item.type === 'epica' ? null : epicOf(item, itemsById)
  const parent = itemsById[item.parent_id]
  const sprint = sprintsById[item.sprint_id]

  return (
    <div className={'item-layout' + (detailsOpen ? '' : ' details-collapsed')}>
      <div className="item-main">
        <div>
          <h1 className="item-title">{item.title}</h1>
          <div className="item-summary">
            <div className="summary-field">
              <span className="summary-label">Épica</span>
              {item.type === 'epica'
                ? <span className="muted">Es una épica</span>
                : epic
                  ? <Link className="epic-link" to={itemPath(epic.id)}><TypeBadge type="epica" />{itemKey(epic.id)} {epic.title}</Link>
                  : <span className="muted">Sin épica</span>}
            </div>
            <div className="summary-field">
              <span className="summary-label">Prioridad</span>
              <PriorityBadge priority={item.priority} />
            </div>
            <div className="summary-field">
              <span className="summary-label">Responsable</span>
              <Assignee member={membersById[item.assignee_id]} />
            </div>
            <div className="summary-field">
              <span className="summary-label">Fecha límite</span>
              {item.due_date
                ? <span className={isOverdue(item) ? 'overdue' : ''}>{fmtDate(item.due_date)}{isOverdue(item) && ' · vencida'}</span>
                : <span className="muted">Sin fecha</span>}
            </div>
          </div>
        </div>

        <section className="read-section">
          <h3 className="section-title">Descripción</h3>
          {item.description
            ? <RichText className="prose" text={item.description} />
            : <p className="muted small">Sin descripción.</p>}
        </section>

        {(item.type === 'historia' || item.type === 'epica') && (
          <section className="read-section">
            <h3 className="section-title">Criterios de aceptación</h3>
            {item.acceptance_criteria
              ? <RichText className="prose" text={item.acceptance_criteria} />
              : <p className="muted small">Sin criterios definidos.</p>}
          </section>
        )}

        {item.type !== 'tarea' && item.type !== 'bug' && (
          <section className="read-section">
            <div className="section-head">
              <h3 className="section-title">Hijos ({children.length})</h3>
              {canEdit && (
                <button type="button" className="btn ghost sm" onClick={() => setOpenItem({
                  new: true,
                  defaults: { type: item.type === 'epica' ? 'historia' : 'tarea', parent_id: item.id, sprint_id: item.sprint_id },
                })}><PlusIcon /><span>Agregar hijo</span></button>
              )}
            </div>
            {children.length === 0 && <p className="muted small">Sin ítems hijos.</p>}
            <ul className="child-list">
              {children.map(c => (
                <li key={c.id} onClick={() => setOpenItem({ id: c.id })}>
                  <TypeBadge type={c.type} /> <span className="grow">{itemKey(c.id)} {c.title}</span>
                  <PriorityBadge priority={c.priority} /> <StatusBadge status={c.status} />
                  <Assignee member={membersById[c.assignee_id]} short />
                </li>
              ))}
            </ul>
          </section>
        )}

        {dev}
      </div>

      <aside className="item-side">
        <button type="button" className="side-toggle" onClick={toggleDetails} aria-expanded={detailsOpen}>
          <span>Detalles</span>
          <ChevronIcon size={14} className={'icon chevron' + (detailsOpen ? ' open' : '')} />
        </button>
        {detailsOpen && (
          <>
            <dl className="detail-list">
              <dt>Estado</dt><dd><StatusBadge status={item.status} /></dd>
              <dt>Tipo</dt><dd><TypeBadge type={item.type} /> {TYPES[item.type].label}</dd>
              {item.type === 'bug' && <><dt>Severidad</dt><dd>{SEVERITIES[item.severity] ?? <span className="muted">Sin definir</span>}</dd></>}
              <dt>Sprint</dt><dd>{sprint ? `${sprint.name} · ${sprint.status}` : <span className="muted">Backlog</span>}</dd>
              <dt>Padre</dt><dd>{parent ? <Link to={itemPath(parent.id)}>{itemKey(parent.id)} {parent.title}</Link> : <span className="muted">Sin padre</span>}</dd>
              <dt>Story points</dt><dd>{item.story_points != null ? Number(item.story_points) : <span className="muted">—</span>}</dd>
              <dt>Horas</dt><dd>{item.estimate_hours != null ? Number(item.estimate_hours) : <span className="muted">—</span>}</dd>
              <dt>Etiquetas</dt><dd>{item.tags.length ? item.tags.map(t => <span key={t} className="tag">{t}</span>) : <span className="muted">—</span>}</dd>
            </dl>
            <dl className="item-meta">
              <dt>Creado</dt><dd>{fmtDateTime(item.created_at)}{item.created_by && <> · {membersById[item.created_by]?.full_name ?? '?'}</>}</dd>
              <dt>Actualizado</dt><dd>{fmtDateTime(item.updated_at)}</dd>
              {item.closed_at && <><dt>Cerrado</dt><dd>{fmtDateTime(item.closed_at)}</dd></>}
            </dl>
          </>
        )}
      </aside>

      {activity && <section className="item-activity">{activity}</section>}
    </div>
  )
}

/* ------------------------------ Actividad ------------------------------ */

// Comentarios, adjuntos e historial debajo de la descripción (como Jira / DevOps)
function Activity({ item, comments }) {
  const [tab, setTab] = useState('comentarios')
  return (
    <>
      <div className="activity-head">
        <h3 className="section-title">Actividad</h3>
        <div className="tab-list" role="tablist">
          {[['comentarios', 'Comentarios'], ['adjuntos', 'Adjuntos'], ['historial', 'Historial']].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'comentarios' && <Comments item={item} comments={comments} />}
      {tab === 'adjuntos' && <Attachments item={item} />}
      {tab === 'historial' && <HistoryList itemId={item.id} />}
    </>
  )
}

/* ------------------------------ Detalles ------------------------------ */

function Details({ item, defaults, isNew, children, onCreated, onCancel, onSaved, activity }) {
  const { items, me, activeMembers, membersById, sprints, canEdit, fail, toast, loadItems, setOpenItem } = useApp()
  // Se recalcula solo cuando el ítem cambia de verdad (updated_at), no en cada recarga
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => toForm(item ?? { ...defaults }), [item?.id, item?.updated_at])
  const [f, setF] = useState(initial)
  const [busy, setBusy] = useState(false)
  const formId = 'item-form-' + (item?.id ?? 'new')

  useEffect(() => { setF(initial) }, [initial]) // refleja cambios hechos por otros

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const ro = !canEdit

  const parentOptions = items.filter(i =>
    ALLOWED_PARENTS[f.type].includes(i.type) && i.id !== item?.id && i.status !== 'cancelada')

  const row = toRow(f)
  const changed = isNew ? true : FIELDS.some(k => JSON.stringify(row[k] ?? null) !== JSON.stringify(normalize(item, k)))

  async function save(e) {
    e.preventDefault()
    if (!row.title) return
    setBusy(true)
    if (isNew) {
      const { data, error } = await supabase.from('work_items').insert(row).select().single()
      setBusy(false)
      if (error) return fail(error)
      await loadItems(); onCreated(data)
    } else {
      const patch = Object.fromEntries(FIELDS.filter(k =>
        JSON.stringify(row[k] ?? null) !== JSON.stringify(normalize(item, k))).map(k => [k, row[k]]))
      const { error } = await updateItem(item.id, patch)
      setBusy(false)
      if (error) return fail(error)
      toast(`${itemKey(item.id)} guardado`); loadItems(); onSaved?.()
    }
  }

  const statusOptions = Object.keys(STATUSES).filter(s => s !== 'cancelada' || f.status === 'cancelada')

  return (
    <>
      <div className={'item-layout' + (activity ? '' : ' no-activity')}>
        <div className="item-main">
          <fieldset disabled={ro} className="item-fields">
            <label>Título
              <input className="title-input" form={formId} required value={f.title} onChange={set('title')} autoFocus={isNew}
                     placeholder="¿Qué hay que hacer?" />
            </label>
            <label>Descripción
              <textarea form={formId} rows={isNew ? 4 : 5} value={f.description} onChange={set('description')}
                        placeholder={f.type === 'bug' ? 'Pasos para reproducir, resultado esperado y resultado actual…' : 'Agrega detalles, contexto o enlaces…'} />
            </label>
            {(f.type === 'historia' || f.type === 'epica') && (
              <label>Criterios de aceptación
                <textarea form={formId} rows={4} value={f.acceptance_criteria} onChange={set('acceptance_criteria')}
                          placeholder={'Dado que…\nCuando…\nEntonces…'} />
              </label>
            )}
          </fieldset>

          {!isNew && item.type !== 'tarea' && item.type !== 'bug' && (
            <section className="item-section">
              <div className="section-head">
                <h3 className="section-title">Hijos ({children.length})</h3>
                {canEdit && (
                  <button type="button" className="btn ghost sm" onClick={() => setOpenItem({
                    new: true,
                    defaults: { type: item.type === 'epica' ? 'historia' : 'tarea', parent_id: item.id, sprint_id: item.sprint_id },
                  })}><PlusIcon /><span>Agregar hijo</span></button>
                )}
              </div>
              {children.length === 0 && <p className="muted small">Sin ítems hijos.</p>}
              <ul className="child-list">
                {children.map(c => (
                  <li key={c.id} onClick={() => setOpenItem({ id: c.id })}>
                    <TypeBadge type={c.type} /> <span className="grow">{itemKey(c.id)} {c.title}</span>
                    <PriorityBadge priority={c.priority} /> <StatusBadge status={c.status} />
                    <Assignee member={membersById[c.assignee_id]} short />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="item-side">
          <form id={formId} onSubmit={save}>
            <fieldset disabled={ro} className="side-fields">
              <label>Estado
                <select value={f.status} onChange={set('status')} disabled={f.status === 'cancelada'}>
                  {statusOptions.map(k => <option key={k} value={k}>{STATUSES[k].label}</option>)}
                </select>
              </label>

              <label>
                <span className="label-row">
                  Asignado a
                  {canEdit && me && f.assignee_id !== me.id && (
                    <button type="button" className="link-btn" onClick={() => setF({ ...f, assignee_id: me.id })}>Asignarme</button>
                  )}
                </span>
                <select value={f.assignee_id} onChange={set('assignee_id')}>
                  <option value="">Sin asignar</option>
                  {activeMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  {f.assignee_id && !activeMembers.some(m => m.id === f.assignee_id) && (
                    <option value={f.assignee_id}>{membersById[f.assignee_id]?.full_name ?? '?'} (inactivo)</option>
                  )}
                </select>
              </label>

              <label>Tipo
                <select value={f.type} onChange={e => setF({ ...f, type: e.target.value, parent_id: '' })}
                        disabled={!isNew && children.length > 0}>
                  {TYPE_KEYS.map(k => <option key={k} value={k}>{TYPES[k].label}</option>)}
                </select>
              </label>

              <label>Prioridad
                <select value={f.priority} onChange={set('priority')}>
                  {PRIORITY_KEYS.map(k => <option key={k} value={k}>{PRIORITIES[k].label}</option>)}
                </select>
              </label>

              {f.type === 'bug' && (
                <label>Severidad
                  <select value={f.severity} onChange={set('severity')}>
                    <option value="">Sin definir</option>
                    {Object.entries(SEVERITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
              )}

              <label>Sprint
                <select value={f.sprint_id} onChange={set('sprint_id')}>
                  <option value="">Backlog (sin sprint)</option>
                  {sprints.filter(s => s.status !== 'cerrado' || s.id === Number(f.sprint_id)).map(s => (
                    <option key={s.id} value={s.id}>{s.name} · {s.status}</option>
                  ))}
                </select>
              </label>

              <label>Padre
                <select value={f.parent_id} onChange={set('parent_id')} disabled={f.type === 'epica'}>
                  <option value="">{f.type === 'epica' ? 'Las épicas no tienen padre' : 'Sin padre'}</option>
                  {parentOptions.map(p => <option key={p.id} value={p.id}>{TYPES[p.type].short} {itemLabel(p)}</option>)}
                </select>
              </label>

              <div className="side-pair">
                <label>Story points
                  <input type="number" min="0" step="0.5" value={f.story_points} onChange={set('story_points')} />
                </label>
                <label>Horas
                  <input type="number" min="0" step="0.5" value={f.estimate_hours} onChange={set('estimate_hours')} />
                </label>
              </div>
              <label>Fecha límite
                <input type="date" value={f.due_date} onChange={set('due_date')} />
              </label>
              <label>Etiquetas
                <input value={f.tags} onChange={set('tags')} placeholder="frontend, login" />
              </label>
            </fieldset>
          </form>

          {!isNew && (
            <dl className="item-meta">
              <dt>Creado</dt><dd>{fmtDateTime(item.created_at)}{item.created_by && <> · {membersById[item.created_by]?.full_name ?? '?'}</>}</dd>
              <dt>Actualizado</dt><dd>{fmtDateTime(item.updated_at)}</dd>
              {item.closed_at && <><dt>Cerrado</dt><dd>{fmtDateTime(item.closed_at)}</dd></>}
            </dl>
          )}
        </aside>

        {activity && <section className="item-activity">{activity}</section>}
      </div>

      {canEdit && (
        <div className="modal-foot">
          {!isNew && changed && <span className="foot-hint">Tienes cambios sin guardar</span>}
          <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
          <button form={formId} className="btn primary" disabled={busy || !changed || !f.title.trim()}>
            {isNew ? 'Crear' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </>
  )
}

function normalize(item, k) {
  const v = item[k]
  if (k === 'story_points' || k === 'estimate_hours') return v == null ? null : Number(v)
  return v ?? null
}

// Comentarios de un ítem, compartidos por la actividad y el panel Desarrollo (con tiempo real)
function useComments(itemId) {
  const { fail } = useApp()
  const [list, setList] = useState([])

  async function reload() {
    const { data, error } = await supabase.from('comments').select('*').eq('item_id', itemId).order('created_at')
    if (error) fail(error); else setList(data)
  }
  useEffect(() => { setList([]); reload() }, [itemId])

  // Los comentarios de otros aparecen sin reabrir el ítem
  useEffect(() => {
    const ch = supabase.channel('comments-' + itemId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `item_id=eq.${itemId}` }, reload)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [itemId])

  return { list, reload }
}

// Inserta un comentario; valida que los enlaces de commit/PR sean URLs
async function postComment(itemId, fields, fail) {
  const row = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.trim() || null]))
  for (const k of ['commit_url', 'pr_url']) {
    if (row[k] && !/^https?:\/\//i.test(row[k])) { fail({ message: 'Los enlaces de commit y PR deben empezar con https://' }); return false }
  }
  const { error } = await supabase.from('comments').insert({ ...row, item_id: itemId })
  if (error) { fail(error); return false }
  return true
}

/* ----------------------------- Desarrollo ----------------------------- */

const commitRef = (url) => url.match(/\/commits?\/([0-9a-f]{7,40})/i)?.[1].slice(0, 7) ?? 'Commit'
const prRef = (url) => { const n = url.match(/\/pull(?:s|-requests)?\/(\d+)/i)?.[1]; return n ? `PR #${n}` : 'Pull request' }

// Ramas, commits y pull requests vinculados al ítem (como el panel Development de Jira)
function DevPanel({ item, comments }) {
  const { membersById, canEdit, fail } = useApp()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ repository: '', branch: '', commit_url: '', pr_url: '', body: '' })
  const [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })

  const linked = comments.list.filter(c => c.repository || c.branch || c.commit_url || c.pr_url)
  const branches = [...new Map(linked.filter(c => c.branch).map(c => [`${c.repository ?? ''}:${c.branch}`, c])).values()]
  const commits = linked.filter(c => c.commit_url).reverse()
  const prs = linked.filter(c => c.pr_url).reverse()
  const hasLink = f.repository.trim() || f.branch.trim() || f.commit_url.trim() || f.pr_url.trim()

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    const ok = await postComment(item.id, f, fail)
    setBusy(false)
    if (!ok) return
    setF({ repository: '', branch: '', commit_url: '', pr_url: '', body: '' }); setOpen(false); comments.reload()
  }

  const who = (c) => <span className="dev-meta">{membersById[c.author_id]?.full_name ?? 'Ex miembro'} · {fmtDate(c.created_at)}</span>

  return (
    <section className="read-section dev-panel">
      <div className="section-head">
        <h3 className="section-title">Desarrollo</h3>
        {canEdit && !open && <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}><BranchIcon />Vincular commit o PR</button>}
      </div>

      {open && (
        <form className="dev-form" onSubmit={save}>
          <div className="grid-form tight">
            <label>Repositorio<input placeholder="org/repo" value={f.repository} onChange={set('repository')} /></label>
            <label>Rama<input placeholder="feature/login" value={f.branch} onChange={set('branch')} /></label>
            <label>Enlace del commit<input type="url" placeholder="https://github.com/…/commit/…" value={f.commit_url} onChange={set('commit_url')} /></label>
            <label>Enlace del PR<input type="url" placeholder="https://github.com/…/pull/…" value={f.pr_url} onChange={set('pr_url')} /></label>
            <label className="span2">Nota (opcional)<input placeholder="Qué cambia este commit" value={f.body} onChange={set('body')} /></label>
          </div>
          <div className="comment-actions">
            <span className="hint">Queda registrado también en Comentarios.</span>
            <span className="grow" />
            <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn primary sm" disabled={!hasLink || busy}>{busy ? 'Guardando…' : 'Vincular'}</button>
          </div>
        </form>
      )}

      {!linked.length && !open && <p className="muted small">Sin ramas, commits ni pull requests vinculados.</p>}
      {linked.length > 0 && (
        <div className="dev-groups">
          {branches.length > 0 && (
            <div className="dev-group">
              <h4>Ramas ({branches.length})</h4>
              <ul>{branches.map(c => (
                <li key={c.id}><BranchIcon size={14} /><span className="dev-main">{c.repository && <span className="muted">{c.repository} · </span>}{c.branch}</span>{who(c)}</li>
              ))}</ul>
            </div>
          )}
          {commits.length > 0 && (
            <div className="dev-group">
              <h4>Commits ({commits.length})</h4>
              <ul>{commits.map(c => (
                <li key={c.id}>
                  <a className="dev-main mono" href={c.commit_url} target="_blank" rel="noreferrer">{commitRef(c.commit_url)}<ExternalIcon size={12} /></a>
                  {c.body && <span className="dev-note" title={c.body}>{c.body.split('\n')[0]}</span>}
                  {who(c)}
                </li>
              ))}</ul>
            </div>
          )}
          {prs.length > 0 && (
            <div className="dev-group">
              <h4>Pull requests ({prs.length})</h4>
              <ul>{prs.map(c => (
                <li key={c.id}>
                  <a className="dev-main" href={c.pr_url} target="_blank" rel="noreferrer">{prRef(c.pr_url)}<ExternalIcon size={12} /></a>
                  {c.body && <span className="dev-note" title={c.body}>{c.body.split('\n')[0]}</span>}
                  {who(c)}
                </li>
              ))}</ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/* ----------------------------- Comentarios ----------------------------- */

const EMPTY_COMMENT = { body: '', repository: '', branch: '', commit_url: '', pr_url: '' }

function Comments({ item, comments }) {
  const { me, membersById, canEdit, fail } = useApp()
  const [c, setC] = useState(EMPTY_COMMENT)
  const [showGit, setShowGit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [docs, setDocs] = useState(null) // adjuntos para citar; se cargan al pedirlos
  const bodyRef = useRef(null)
  const list = comments.list

  const hasContent = Object.values(c).some(v => v.trim())

  async function post(e) {
    e.preventDefault()
    setBusy(true)
    const ok = await postComment(item.id, c, fail)
    setBusy(false)
    if (!ok) return
    setC(EMPTY_COMMENT); setShowGit(false); setDocs(null); comments.reload()
  }

  async function toggleDocs() {
    if (docs) return setDocs(null)
    const { data, error } = await supabase.from('attachments').select('*').eq('item_id', item.id).order('created_at')
    if (error) return fail(error)
    setDocs(data)
  }

  // Inserta [nombre](url) en el cursor; se muestra como enlace en el comentario
  function cite(a) {
    const ref = `[${a.file_name}](${publicUrl(a.storage_path)})`
    const el = bodyRef.current
    const at = el ? el.selectionStart : c.body.length
    const body = c.body.slice(0, at) + (at && !/\s$/.test(c.body.slice(0, at)) ? ' ' : '') + ref + ' ' + c.body.slice(at)
    setC({ ...c, body }); setDocs(null)
    requestAnimationFrame(() => el?.focus())
  }

  const set = k => e => setC({ ...c, [k]: e.target.value })

  return (
    <div className="activity-body">
      {canEdit && (
        <form className="comment-form" onSubmit={post}>
          <Avatar member={me} size={30} />
          <div className="grow">
            <textarea ref={bodyRef} rows={2} placeholder="Escribe un comentario… Puedes pegar enlaces o mencionar ítems como TT-12" value={c.body} onChange={set('body')} />
            {docs && (
              <div className="doc-picker">
                {docs.length === 0
                  ? <p className="muted small">Este ítem no tiene adjuntos. Súbelos en la pestaña Adjuntos.</p>
                  : docs.map(a => (
                    <button key={a.id} type="button" className="doc-option" onClick={() => cite(a)}>
                      <FileIcon size={14} /><span>{a.file_name}</span>
                    </button>
                  ))}
              </div>
            )}
            {showGit && (
              <div className="grid-form tight">
                <label>Repositorio<input placeholder="org/repo" value={c.repository} onChange={set('repository')} /></label>
                <label>Rama<input placeholder="feature/login" value={c.branch} onChange={set('branch')} /></label>
                <label>Enlace del commit<input placeholder="https://github.com/…/commit/…" value={c.commit_url} onChange={set('commit_url')} /></label>
                <label>Enlace del PR<input placeholder="https://github.com/…/pull/…" value={c.pr_url} onChange={set('pr_url')} /></label>
              </div>
            )}
            <div className="comment-actions">
              <div className="comment-tools">
                <button type="button" className={'btn ghost sm' + (docs ? ' pressed' : '')} onClick={toggleDocs}><FileIcon />Citar documento</button>
                <button type="button" className={'btn ghost sm' + (showGit ? ' pressed' : '')} onClick={() => setShowGit(!showGit)}><BranchIcon />GitHub</button>
              </div>
              <button className="btn primary sm" disabled={!hasContent || busy}>{busy ? 'Enviando…' : 'Comentar'}</button>
            </div>
          </div>
        </form>
      )}
      {list.length === 0 && <p className="muted small">Aún no hay comentarios.</p>}
      {groupByDay([...list].reverse()).map(([day, dayComments]) => (
        <section key={day} className="comment-day">
          <h4 className="day-label">{dayLabel(dayComments[0].created_at)}</h4>
          <ul className="comments">
            {dayComments.map(cm => (
              <li key={cm.id}>
                <Avatar member={membersById[cm.author_id]} size={30} />
                <div className="grow">
                  <div className="comment-head">
                    <b>{membersById[cm.author_id]?.full_name ?? 'Ex miembro'}</b>
                    <span className="muted" title={fmtDateTime(cm.created_at)}>{fmtTime(cm.created_at)}</span>
                  </div>
                  {cm.body && <RichText className="pre" text={cm.body} />}
                  {(cm.repository || cm.branch || cm.commit_url || cm.pr_url) && (
                    <div className="git-chips">
                      {cm.repository && <span className="chip"><RepoIcon size={13} />{cm.repository}</span>}
                      {cm.branch && <span className="chip"><BranchIcon size={13} />{cm.branch}</span>}
                      {cm.commit_url && <a className="chip link" href={cm.commit_url} target="_blank" rel="noreferrer">{commitRef(cm.commit_url)}<ExternalIcon size={12} /></a>}
                      {cm.pr_url && <a className="chip link" href={cm.pr_url} target="_blank" rel="noreferrer">{prRef(cm.pr_url)}<ExternalIcon size={12} /></a>}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

// Agrupa comentarios (ya ordenados) por día local: [[clave, [comentarios]], ...]
function groupByDay(list) {
  const groups = new Map()
  for (const c of list) {
    const key = new Date(c.created_at).toLocaleDateString('en-CA')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(c)
  }
  return [...groups]
}

/* ------------------------------ Adjuntos ------------------------------ */

function Attachments({ item }) {
  const { membersById, canEdit, fail, toast } = useApp()
  const [list, setList] = useState([])
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  // Enlace público y permanente del archivo, para pegarlo en comentarios o fuera de la app
  async function copyUrl(a, url) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(a.id); setTimeout(() => setCopiedId(null), 2000)
    } catch { toast('No se pudo copiar el enlace', 'error') }
  }

  async function load() {
    const { data, error } = await supabase.from('attachments').select('*').eq('item_id', item.id).order('created_at')
    if (error) fail(error); else setList(data)
  }
  useEffect(() => { load() }, [item.id])

  async function upload(files) {
    if (!files.length) return
    setBusy(true)
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { fail({ message: `${file.name} supera 10 MB` }); continue }
      const safe = (file.name || 'captura.png').replace(/[^\w.\-]+/g, '_')
      const path = `items/${item.id}/${Date.now()}-${safe}`
      const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
      if (up.error) { fail(up.error); continue }
      const { error } = await supabase.from('attachments').insert({
        item_id: item.id, storage_path: path, file_name: file.name || safe, mime_type: file.type, size_bytes: file.size,
      })
      if (error) { fail(error); await supabase.storage.from(BUCKET).remove([path]) }
    }
    setBusy(false); load(); toast('Adjuntos subidos')
  }

  // Pegar una captura con Ctrl+V mientras la pestaña está abierta
  useEffect(() => {
    if (!canEdit) return
    const onPaste = (e) => {
      const files = [...(e.clipboardData?.files ?? [])]
      if (files.length) { e.preventDefault(); upload(files) }
    }
    addEventListener('paste', onPaste)
    return () => removeEventListener('paste', onPaste)
  }, [canEdit, item.id])

  async function remove(a) {
    if (!confirm(`¿Quitar el adjunto "${a.file_name}"?`)) return
    const st = await supabase.storage.from(BUCKET).remove([a.storage_path])
    if (st.error) return fail(st.error)
    const { error } = await supabase.from('attachments').delete().eq('id', a.id)
    if (error) return fail(error)
    load()
  }

  return (
    <div className="activity-body">
      {canEdit && (
        <label className="dropzone"
               onDragOver={e => e.preventDefault()}
               onDrop={e => { e.preventDefault(); upload([...e.dataTransfer.files]) }}>
          <input type="file" multiple hidden onChange={e => { upload([...e.target.files]); e.target.value = '' }} />
          {busy ? 'Subiendo…' : 'Arrastra archivos aquí, haz clic para elegir, o pega una captura con Ctrl+V (máx. 10 MB)'}
        </label>
      )}
      {list.length === 0 && <p className="muted">Sin adjuntos.</p>}
      <div className="attach-grid">
        {list.map(a => {
          const url = publicUrl(a.storage_path)
          const isImg = a.mime_type?.startsWith('image/')
          return (
            <div key={a.id} className="attach">
              {isImg
                ? <img src={url} alt={a.file_name} onClick={() => setPreview(url)} />
                : <a className="file-icon" href={url} target="_blank" rel="noreferrer" aria-label={'Abrir ' + a.file_name}><FileIcon size={28} /></a>}
              <div className="attach-name" title={a.file_name}>{a.file_name}</div>
              <div className="muted small">{membersById[a.uploaded_by]?.full_name ?? ''} · {fmtDateTime(a.created_at)}</div>
              <div className="attach-actions">
                <a href={url} target="_blank" rel="noreferrer">Abrir</a>
                <a onClick={() => copyUrl(a, url)}>{copiedId === a.id ? 'Copiado' : 'Copiar enlace'}</a>
                {canEdit && <a onClick={() => remove(a)}>Quitar</a>}
              </div>
            </div>
          )
        })}
      </div>
      {preview && (
        <div className="overlay" onClick={() => setPreview(null)}>
          <img className="lightbox" src={preview} alt="" />
        </div>
      )}
    </div>
  )
}
