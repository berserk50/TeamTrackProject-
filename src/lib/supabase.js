import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

export const supabase = isConfigured ? createClient(url, key) : null

export const BUCKET = 'adjuntos'

export function publicUrl(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// Traduce los errores más comunes de Postgres/Supabase a mensajes claros
export function errorText(error) {
  if (!error) return ''
  const msg = error.message || String(error)
  if (msg.includes('row-level security')) return 'No tienes permiso para esta acción (modo visitante o miembro inactivo).'
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (msg.includes('Database error saving new user')) return 'Ese correo no pertenece al equipo. Pide que te agreguen en la vista Equipo.'
  if (msg.includes('Email not confirmed')) return 'Debes confirmar tu correo antes de entrar (revisa tu bandeja).'
  if (msg.includes('one_active_sprint')) return 'Ya hay un sprint activo. Ciérralo antes de iniciar otro.'
  if (msg.includes('duplicate key') && msg.includes('email')) return 'Ya existe un miembro con ese correo.'
  return msg
}
