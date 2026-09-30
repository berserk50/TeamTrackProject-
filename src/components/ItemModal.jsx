import { useEffect, useMemo, useState } from 'react'
import { supabase, publicUrl, BUCKET } from '../lib/supabase'
import { useApp, updateItem, deleteItemForever } from '../lib/store'
import {
  TYPES, TYPE_KEYS, STATUSES, PRIORITIES, PRIORITY_KEYS, SEVERITIES, ALLOWED_PARENTS,
  itemLabel, fmtDateTime,
} from '../lib/constants'
import { Modal, ReasonDialog, TypeBadge, StatusBadge, Avatar, PriorityBadge } from './ui'
import HistoryList from './HistoryList'

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

export default function ItemModal({ target, onClose }) {
  const { itemsById, items, canEdit, setOpenItem, fail, toast, loadItems } = useApp()
  const isNew = Boolean(target.new)
  const item = isNew ? null : itemsById[target.id]
  const [tab, setTab] = useState('detalles')
  const [dialog, setDialog] = useState(null) // 'cancel' | 'delete'

  if (!isNew && !item) {
    return (
      <Modal title="Ítem no encontrado" onClose={onClose}>
        <div className="modal-body"><p className="muted">El ítem #{target.id} no existe o fue eliminado. Revisa la vista Historial.</p></div>
      </Modal>
    )
  }

  const children = item ? items.filter(i => i.parent_id === item.id) : []

  async function cancelItem(reason) {
    const { error } = await updateItem(item.id, { status: 'cancelada', cancel_reason: reason })
    if (error) return fail(error)
    toast('Ítem cancelado'); setDialog(null); loadItems()
  }
  async function reopen() {
    const { error } = await updateItem(item.id, { status: 'pendiente' })
    if (error) return fail(error)
    toast('Ítem reabierto'); loadItems()
  }
  async function removeForever(reason) {
    const { error } = await deleteItemForever(item, reason)
    if (error) return fail(error)
    toast(`#${item.id} eliminado definitivamente`); setDialog(null); loadItems(); onClose()
  }

  const title = isNew
    ? 'Nuevo ítem'
    : <span className="modal-title"><TypeBadge type={item.type} /> #{item.id} <StatusBadge status={item.status} /></span>

  return (
    <Modal title={title} onClose={onClose} wide>
      {!isNew && (
        <div className="tabs">
          {['detalles', 'comentarios', 'adjuntos', 'historial'].map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
          <div className="spacer" />
          {canEdit && item.status !== 'cancelada' && (
            <button className="btn ghost sm" onClick={() => setDialog('cancel')}>Cancelar ítem</button>
          )}
          {canEdit && item.status === 'cancelada' && (
            <button className="btn ghost sm" onClick={reopen}>Reabrir</button>
          )}
          {canEdit && <button className="btn danger-ghost sm" onClick={() => setDialog('delete')}>Eliminar</button>}
        </div>
      )}

      {item?.status === 'cancelada' && (
        <div className="notice warn">Cancelado. Motivo: {item.cancel_reason}</div>
      )}

      {tab === 'detalles' && (
        <Details
          item={item} defaults={target.defaults} isNew={isNew} children={children}
          onCreated={(created) => setOpenItem({ id: created.id })}
        />
      )}
      {tab === 'comentarios' && <Comments item={item} />}
      {tab === 'adjuntos' && <Attachments item={item} />}
      {tab === 'historial' && <div className="modal-body"><HistoryList itemId={item.id} /></div>}

      {dialog === 'cancel' && (
        <ReasonDialog
          title={`Cancelar #${item.id}`}
          description="El ítem se conserva con estado Cancelada y el motivo queda en el historial. Se puede reabrir después."
          confirmLabel="Cancelar ítem" onConfirm={cancelItem} onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'delete' && (
        <ReasonDialog
          danger title={`Eliminar #${item.id} definitivamente`}
          description={`Se borrará el ítem, sus comentarios y sus adjuntos. ${children.length ? `Sus ${children.length} hijo(s) quedarán sin padre. ` : ''}En el historial queda el registro de quién lo eliminó, cuándo, el motivo y una copia de sus datos. Úsalo solo para ítems creados por error; si no, mejor cancélalo.`}
          confirmLabel="Eliminar definitivamente" onConfirm={removeForever} onClose={() => setDialog(null)}
        />
      )}
    </Modal>
  )
}

/* ------------------------------ Detalles ------------------------------ */

function Details({ item, defaults, isNew, children, onCreated }) {
  const { items, activeMembers, membersById, sprints, canEdit, fail, toast, loadItems, setOpenItem } = useApp()
  // Se recalcula solo cuando el ítem cambia de verdad (updated_at), no en cada recarga
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => toForm(item ?? { ...defaults }), [item?.id, item?.updated_at])
  const [f, setF] = useState(initial)
  const [busy, setBusy] = useState(false)

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
      toast(`${TYPES[data.type].label} #${data.id} creada`)
      await loadItems(); onCreated(data)
    } else {
      const patch = Object.fromEntries(FIELDS.filter(k =>
        JSON.stringify(row[k] ?? null) !== JSON.stringify(normalize(item, k))).map(k => [k, row[k]]))
      const { error } = await updateItem(item.id, patch)
      setBusy(false)
      if (error) return fail(error)
      toast('Cambios guardados'); loadItems()
    }
  }

  const statusOptions = Object.keys(STATUSES).filter(s => s !== 'cancelada' || f.status === 'cancelada')

  return (
    <form onSubmit={save}>
      <fieldset disabled={ro} className="modal-body grid-form">
        <label className="span2">Título
          <input required value={f.title} onChange={set('title')} autoFocus={isNew} />
        </label>

        <label>Tipo
          <select value={f.type} onChange={e => setF({ ...f, type: e.target.value, parent_id: '' })}
                  disabled={!isNew && children.length > 0}>
            {TYPE_KEYS.map(k => <option key={k} value={k}>{TYPES[k].label}</option>)}
          </select>
        </label>
        <label>Estado
          <select value={f.status} onChange={set('status')} disabled={f.status === 'cancelada'}>
            {statusOptions.map(k => <option key={k} value={k}>{STATUSES[k].label}</option>)}
          </select>
        </label>

        <label>Asignado a
          <select value={f.assignee_id} onChange={set('assignee_id')}>
            <option value="">— Sin asignar —</option>
            {activeMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            {f.assignee_id && !activeMembers.some(m => m.id === f.assignee_id) && (
              <option value={f.assignee_id}>{membersById[f.assignee_id]?.full_name ?? '?'} (inactivo)</option>
            )}
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
              <option value="">— Sin definir —</option>
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

        <label className={f.type === 'bug' ? '' : ''}>Padre
          <select value={f.parent_id} onChange={set('parent_id')} disabled={f.type === 'epica'}>
            <option value="">{f.type === 'epica' ? 'Las épicas no tienen padre' : '— Sin padre —'}</option>
            {parentOptions.map(p => <option key={p.id} value={p.id}>{TYPES[p.type].short} {itemLabel(p)}</option>)}
          </select>
        </label>

        <label>Story points
          <input type="number" min="0" step="0.5" value={f.story_points} onChange={set('story_points')} />
        </label>
        <label>Estimación (horas)
          <input type="number" min="0" step="0.5" value={f.estimate_hours} onChange={set('estimate_hours')} />
        </label>
        <label>Fecha límite
          <input type="date" value={f.due_date} onChange={set('due_date')} />
        </label>
        <label>Etiquetas (separadas por coma)
          <input value={f.tags} onChange={set('tags')} placeholder="frontend, login" />
        </label>

        <label className="span2">Descripción
          <textarea rows={5} value={f.description} onChange={set('description')}
                    placeholder={f.type === 'bug' ? 'Pasos para reproducir, resultado esperado y resultado actual…' : ''} />
        </label>
        {(f.type === 'historia' || f.type === 'epica') && (
          <label className="span2">Criterios de aceptación
            <textarea rows={4} value={f.acceptance_criteria} onChange={set('acceptance_criteria')}
                      placeholder={'Dado que…\nCuando…\nEntonces…'} />
          </label>
        )}
      </fieldset>

      {!isNew && (
        <div className="modal-body meta">
          <span>Creado {fmtDateTime(item.created_at)}{item.created_by && ` por ${membersById[item.created_by]?.full_name ?? '?'}`}</span>
          <span>Actualizado {fmtDateTime(item.updated_at)}</span>
          {item.closed_at && <span>Cerrado {fmtDateTime(item.closed_at)}</span>}
        </div>
      )}

      {!isNew && item.type !== 'tarea' && item.type !== 'bug' && (
        <div className="modal-body">
          <div className="section-head">
            <h4>Hijos ({children.length})</h4>
            {canEdit && (
              <button type="button" className="btn ghost sm" onClick={() => setOpenItem({
                new: true,
                defaults: { type: item.type === 'epica' ? 'historia' : 'tarea', parent_id: item.id, sprint_id: item.sprint_id },
              })}>+ Agregar hijo</button>
            )}
          </div>
          {children.length === 0 && <p className="muted">Sin ítems hijos.</p>}
          <ul className="child-list">
            {children.map(c => (
              <li key={c.id} onClick={() => setOpenItem({ id: c.id })}>
                <TypeBadge type={c.type} /> <span className="grow">#{c.id} {c.title}</span>
                <PriorityBadge priority={c.priority} /> <StatusBadge status={c.status} />
                <Avatar member={membersById[c.assignee_id]} size={22} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {canEdit && (
        <div className="modal-foot">
          <button className="btn primary" disabled={busy || !changed || !f.title.trim()}>
            {isNew ? 'Crear' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </form>
  )
}

function normalize(item, k) {
  const v = item[k]
  if (k === 'story_points' || k === 'estimate_hours') return v == null ? null : Number(v)
  return v ?? null
}

/* ----------------------------- Comentarios ----------------------------- */

const EMPTY_COMMENT = { body: '', repository: '', branch: '', commit_url: '', pr_url: '' }

function Comments({ item }) {
  const { membersById, canEdit, fail } = useApp()
  const [list, setList] = useState([])
  const [c, setC] = useState(EMPTY_COMMENT)
  const [showGit, setShowGit] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data, error } = await supabase.from('comments').select('*').eq('item_id', item.id).order('created_at')
    if (error) fail(error); else setList(data)
  }
  useEffect(() => { load() }, [item.id])

  const hasContent = Object.values(c).some(v => v.trim())

  async function post(e) {
    e.preventDefault()
    const row = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.trim() || null]))
    for (const k of ['commit_url', 'pr_url']) {
      if (row[k] && !/^https?:\/\//i.test(row[k])) return fail({ message: 'Los enlaces de commit y PR deben empezar con https://' })
    }
    setBusy(true)
    const { error } = await supabase.from('comments').insert({ ...row, item_id: item.id })
    setBusy(false)
    if (error) return fail(error)
    setC(EMPTY_COMMENT); setShowGit(false); load()
  }

  const set = k => e => setC({ ...c, [k]: e.target.value })

  return (
    <div className="modal-body">
      {list.length === 0 && <p className="muted">Aún no hay comentarios.</p>}
      <ul className="comments">
        {list.map(cm => (
          <li key={cm.id}>
            <Avatar member={membersById[cm.author_id]} size={30} />
            <div className="grow">
              <div className="comment-head">
                <b>{membersById[cm.author_id]?.full_name ?? 'Ex miembro'}</b>
                <span className="muted">{fmtDateTime(cm.created_at)}</span>
              </div>
              {cm.body && <p className="pre">{cm.body}</p>}
              {(cm.repository || cm.branch || cm.commit_url || cm.pr_url) && (
                <div className="git-chips">
                  {cm.repository && <span className="chip">📦 {cm.repository}</span>}
                  {cm.branch && <span className="chip">🌿 {cm.branch}</span>}
                  {cm.commit_url && <a className="chip link" href={cm.commit_url} target="_blank" rel="noreferrer">Commit ↗</a>}
                  {cm.pr_url && <a className="chip link" href={cm.pr_url} target="_blank" rel="noreferrer">Pull request ↗</a>}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canEdit && (
        <form className="comment-form" onSubmit={post}>
          <textarea rows={3} placeholder="Escribe un comentario…" value={c.body} onChange={set('body')} />
          <button type="button" className="btn ghost sm" onClick={() => setShowGit(!showGit)}>
            {showGit ? '− Ocultar datos de GitHub' : '+ Vincular GitHub (repo, rama, commit, PR)'}
          </button>
          {showGit && (
            <div className="grid-form tight">
              <label>Repositorio<input placeholder="org/repo" value={c.repository} onChange={set('repository')} /></label>
              <label>Rama<input placeholder="feature/login" value={c.branch} onChange={set('branch')} /></label>
              <label>Enlace del commit<input placeholder="https://github.com/…/commit/…" value={c.commit_url} onChange={set('commit_url')} /></label>
              <label>Enlace del PR<input placeholder="https://github.com/…/pull/…" value={c.pr_url} onChange={set('pr_url')} /></label>
            </div>
          )}
          <div className="right"><button className="btn primary" disabled={!hasContent || busy}>Comentar</button></div>
        </form>
      )}
    </div>
  )
}

/* ------------------------------ Adjuntos ------------------------------ */

function Attachments({ item }) {
  const { membersById, canEdit, fail, toast } = useApp()
  const [list, setList] = useState([])
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)

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
    <div className="modal-body">
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
                : <a className="file-icon" href={url} target="_blank" rel="noreferrer">📄</a>}
              <div className="attach-name" title={a.file_name}>{a.file_name}</div>
              <div className="muted small">{membersById[a.uploaded_by]?.full_name ?? ''} · {fmtDateTime(a.created_at)}</div>
              <div className="attach-actions">
                <a href={url} target="_blank" rel="noreferrer">Abrir</a>
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
