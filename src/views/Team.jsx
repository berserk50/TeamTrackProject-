import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'
import { OPEN_STATUSES } from '../lib/constants'
import { Avatar, PageHeader } from '../components/ui'
import { CloseIcon } from '../components/icons'

export default function Team() {
  const { members, items, me, canEdit, session, fail, toast, loadMembers } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [editing, setEditing] = useState(null)

  async function add(e) {
    e.preventDefault()
    const { error } = await supabase.from('members').insert({ full_name: name.trim(), email: email.trim().toLowerCase() })
    if (error) return fail(error)
    toast(`${name} agregado. Ya puede crear su contraseña en "Primera vez".`)
    setName(''); setEmail(''); loadMembers()
  }

  async function setActive(m, active) {
    if (!active && m.id === me?.id && !confirm('Te vas a desactivar a ti mismo y perderás permisos de edición. ¿Continuar?')) return
    if (!active && !confirm(`¿Quitar a ${m.full_name} del equipo? Conserva su historial, pero ya no podrá editar ni ser asignado.`)) return
    const { error } = await supabase.from('members').update({ active }).eq('id', m.id)
    if (error) return fail(error)
    toast(active ? `${m.full_name} reactivado` : `${m.full_name} quitado del equipo`); loadMembers()
  }

  async function rename(m) {
    const value = editing.value.trim()
    if (!value) return
    const { error } = await supabase.from('members').update({ full_name: value }).eq('id', m.id)
    if (error) return fail(error)
    setEditing(null); loadMembers()
  }

  return (
    <div>
      <PageHeader title="Equipo" subtitle="Todos los miembros tienen el mismo rol" />

      <div className="team-grid">
        {members.map(m => {
          const open = items.filter(i => i.assignee_id === m.id && OPEN_STATUSES.includes(i.status))
          const pts = open.reduce((s, i) => s + Number(i.story_points ?? 0), 0)
          return (
            <div key={m.id} className={'card member' + (m.active ? '' : ' dim')}>
              <Avatar member={m} size={44} />
              <div className="grow">
                {editing?.id === m.id ? (
                  <div className="inline-edit">
                    <input value={editing.value} autoFocus
                           onChange={e => setEditing({ id: m.id, value: e.target.value })}
                           onKeyDown={e => { if (e.key === 'Enter') rename(m); if (e.key === 'Escape') setEditing(null) }} />
                    <button className="btn primary sm" onClick={() => rename(m)}>OK</button>
                    <button className="btn ghost icon sm" onClick={() => setEditing(null)} aria-label="Cancelar"><CloseIcon /></button>
                  </div>
                ) : (
                  <div className="member-name">{m.full_name}{m.id === me?.id && ' (yo)'}</div>
                )}
                {session && <div className="member-email">{m.email}</div>}
                <div className="member-status">
                  {m.active ? <span className="ok-text">Activo</span> : <span className="muted">Inactivo</span>}
                  <span className="sep">·</span>{m.user_id ? 'Cuenta creada' : <span className="warn-text">Sin cuenta aún</span>}
                </div>
                <div className="member-load">{open.length} abiertas · {pts} pts</div>
              </div>
              {canEdit && (
                <div className="member-actions">
                  <button className="btn ghost sm" onClick={() => setEditing({ id: m.id, value: m.full_name })}>Renombrar</button>
                  {m.active
                    ? <button className="btn danger-ghost sm" onClick={() => setActive(m, false)}>Quitar</button>
                    : <button className="btn ghost sm" onClick={() => setActive(m, true)}>Reactivar</button>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {canEdit && (
        <form className="card add-member" onSubmit={add}>
          <h2 className="section-title">Agregar integrante</h2>
          <div className="add-member-fields">
            <input required placeholder="Nombre completo" aria-label="Nombre completo" value={name} onChange={e => setName(e.target.value)} />
            <input required type="email" placeholder="correo@empresa.com" aria-label="Correo" value={email} onChange={e => setEmail(e.target.value)} />
            <button className="btn primary">Agregar</button>
          </div>
          <p className="hint">Después, la persona entra a la app, elige "Primera vez (crear contraseña)" con ese mismo correo.</p>
        </form>
      )}
    </div>
  )
}
