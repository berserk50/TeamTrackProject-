import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, errorText } from './supabase'
import { navigate, itemPath } from './router'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const MEMBER_COLS_PUBLIC = 'id, full_name, active, user_id, created_at'
const MEMBER_COLS_FULL = MEMBER_COLS_PUBLIC + ', email'

export function AppProvider({ session, visitor, onSignOut, children }) {
  const [members, setMembers] = useState([])
  const [sprints, setSprints] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [openItem, setNewItem] = useState(null)   // { new: true, defaults } — formulario de creación
  // Un ítem existente se abre en su propia URL (/browse/TT-12); uno nuevo, en la ventana de creación
  const setOpenItem = useCallback((target) => {
    if (target && !target.new && target.id != null) navigate(itemPath(target.id))
    else setNewItem(target)
  }, [])
  const [toasts, setToasts] = useState([])

  // action opcional: { label, onClick } — muestra un enlace dentro del aviso
  const toast = useCallback((text, kind = 'ok', action = null) => {
    const id = Math.random()
    setToasts(t => [...t, { id, text, kind, action }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), action ? 8000 : 4500)
  }, [])
  const dismissToast = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), [])

  const fail = useCallback((error) => { toast(errorText(error), 'error') }, [toast])

  const loadMembers = useCallback(async () => {
    const cols = session ? MEMBER_COLS_FULL : MEMBER_COLS_PUBLIC
    const { data, error } = await supabase.from('members').select(cols).order('full_name')
    if (error) fail(error); else setMembers(data)
  }, [session, fail])

  const loadSprints = useCallback(async () => {
    const { data, error } = await supabase.from('sprints').select('*').order('start_date', { ascending: false })
    if (error) fail(error); else setSprints(data)
  }, [fail])

  const loadItems = useCallback(async () => {
    const { data, error } = await supabase.from('work_items').select('*').order('id', { ascending: false })
    if (error) fail(error); else setItems(data)
  }, [fail])

  const reloadAll = useCallback(async () => {
    await Promise.all([loadMembers(), loadSprints(), loadItems()])
    setLoading(false)
  }, [loadMembers, loadSprints, loadItems])

  useEffect(() => { reloadAll() }, [reloadAll])

  // Tiempo real: si otro miembro cambia algo, se refresca solo
  useEffect(() => {
    const ch = supabase.channel('teamtrack-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_items' }, loadItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sprints' }, loadSprints)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadItems, loadSprints])

  const me = useMemo(
    () => (session ? members.find(m => m.user_id === session.user.id) ?? null : null),
    [members, session],
  )
  const canEdit = Boolean(me?.active)

  const value = {
    session, visitor, onSignOut, me, canEdit, loading,
    members, activeMembers: members.filter(m => m.active),
    sprints, activeSprint: sprints.find(s => s.status === 'activo') ?? null,
    items, itemsById: Object.fromEntries(items.map(i => [i.id, i])),
    membersById: Object.fromEntries(members.map(m => [m.id, m])),
    sprintsById: Object.fromEntries(sprints.map(s => [s.id, s])),
    loadMembers, loadSprints, loadItems, reloadAll,
    openItem, setOpenItem, toast, dismissToast, fail, toasts,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// Operaciones de escritura compartidas por varias vistas
export async function updateItem(id, patch) {
  return supabase.from('work_items').update(patch).eq('id', id).select().single()
}

export async function deleteItemForever(item, reason) {
  // 1) borra los archivos físicos del Storage, 2) la función SQL borra el ítem y deja rastro
  const { data: files } = await supabase.from('attachments').select('storage_path').eq('item_id', item.id)
  if (files?.length) {
    const { error } = await supabase.storage.from('adjuntos').remove(files.map(f => f.storage_path))
    if (error) return { error }
  }
  return supabase.rpc('delete_work_item', { p_id: item.id, p_reason: reason })
}
