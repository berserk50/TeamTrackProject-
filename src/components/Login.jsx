import { useState } from 'react'
import { supabase, errorText } from '../lib/supabase'
import { ThemeToggle } from './ui'

export default function Login({ onVisitor }) {
  const [mode, setMode] = useState('login') // login | signup | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const mail = email.trim().toLowerCase()
    let res
    if (mode === 'login') {
      res = await supabase.auth.signInWithPassword({ email: mail, password })
    } else if (mode === 'signup') {
      res = await supabase.auth.signUp({ email: mail, password, options: { emailRedirectTo: location.origin } })
      if (!res.error && !res.data.session) {
        setMsg({ ok: true, text: 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.' })
      }
    } else {
      res = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: location.origin })
      if (!res.error) setMsg({ ok: true, text: 'Te enviamos un enlace para restablecer la contraseña.' })
    }
    if (res.error) setMsg({ ok: false, text: errorText(res.error) })
    setBusy(false)
  }

  return (
    <div className="center-screen">
      <div className="corner"><ThemeToggle /></div>
      <form className="card narrow" onSubmit={submit}>
        <div className="brand big"><span className="brand-mark" aria-hidden="true" />TeamTrack</div>
        <p className="muted">
          {mode === 'login' && 'Inicia sesión con tu cuenta del equipo.'}
          {mode === 'signup' && 'Crea tu contraseña. Solo funciona con correos registrados en el equipo.'}
          {mode === 'reset' && 'Te enviaremos un enlace para crear una nueva contraseña.'}
        </p>
        <label>Correo
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        </label>
        {mode !== 'reset' && (
          <label>Contraseña
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
          </label>
        )}
        {msg && <div className={msg.ok ? 'notice ok' : 'notice error'}>{msg.text}</div>}
        <button className="btn primary full" disabled={busy}>
          {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}
        </button>
        <div className="login-links">
          {mode !== 'login' && <a onClick={() => setMode('login')}>Ya tengo cuenta</a>}
          {mode !== 'signup' && <a onClick={() => setMode('signup')}>Primera vez (crear contraseña)</a>}
          {mode !== 'reset' && <a onClick={() => setMode('reset')}>Olvidé mi contraseña</a>}
        </div>
        <hr />
        <button type="button" className="btn ghost full" onClick={onVisitor}>Entrar como visitante (solo lectura)</button>
      </form>
    </div>
  )
}

// Se muestra al volver del enlace "Olvidé mi contraseña"
export function SetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)

  async function submit(e) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return setMsg(errorText(error))
    onDone()
  }

  return (
    <div className="center-screen">
      <div className="corner"><ThemeToggle /></div>
      <form className="card narrow" onSubmit={submit}>
        <h1 className="card-title-lg">Nueva contraseña</h1>
        <label>Contraseña
          <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoFocus />
        </label>
        {msg && <div className="notice error">{msg}</div>}
        <button className="btn primary full">Guardar</button>
      </form>
    </div>
  )
}
