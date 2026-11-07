import { useLayoutEffect, useRef, useState } from 'react'
import { fmtDate } from '../lib/constants'

// Los SVG se dibujan al ancho real de su tarjeta (no se escalan con viewBox),
// así los textos de los ejes se ven siempre a su tamaño y no quedan diminutos.
const H = 240, PAD = { top: 18, right: 18, bottom: 32, left: 40 }

function useWidth(fallback = 560) {
  const ref = useRef(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(Math.max(260, Math.round(el.clientWidth)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

function niceMax(value) {
  if (value <= 0) return 4
  const step = Math.pow(10, Math.floor(Math.log10(value)))
  const n = value / step
  const rounded = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return rounded * step
}

// Marcas del eje Y en números redondos (paso 1, 2, 5, 10, 20…), como mucho 5 tramos
function axisTicks(max) {
  let step = 1
  for (let k = 0; max / step > 5; k++) step = [1, 2, 5][(k + 1) % 3] * Math.pow(10, Math.floor((k + 1) / 3))
  const ticks = []
  for (let t = 0; t <= max; t += step) ticks.push(t)
  return ticks
}

// "Sprint 3 · Expedientes, documentos…" -> { short: 'Sprint 3', desc: 'Expedientes, documentos…' }
export function splitSprint(name = '') {
  const [short, ...rest] = name.split('·')
  return { short: short.trim(), desc: rest.join('·').trim() }
}

const shortDate = d => d.toLocaleDateString('es-PA', { day: '2-digit', month: 'short' })

// Burndown: puntos (o ítems) restantes del sprint (guía ideal vs. real, día a día)
export function BurndownChart({ series, total, unit = 'pts', title = 'Burndown' }) {
  const [box, W] = useWidth()
  const [hover, setHover] = useState(null) // índice del día bajo el cursor
  const [showTable, setShowTable] = useState(false)
  if (!series.length) return null

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const max = niceMax(total)
  const x = i => PAD.left + (series.length === 1 ? 0 : i / (series.length - 1) * plotW)
  const y = v => PAD.top + plotH - Math.min(v, max) / max * plotH

  const idealPath = series.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.ideal)}`).join(' ')
  const actualPts = series.filter(p => p.actual != null)
  const actualPath = actualPts.map((p, i) => `${i ? 'L' : 'M'}${x(series.indexOf(p))},${y(p.actual)}`).join(' ')
  const lastActual = actualPts[actualPts.length - 1]
  const ticks = axisTicks(max)
  // Una etiqueta de fecha cada ~70 px para que no se encimen
  const every = Math.max(1, Math.ceil(series.length / Math.max(2, Math.floor(plotW / 70))))
  const dayTicks = series.map((p, i) => ({ p, i })).filter(({ i }) => i % every === 0 || i === series.length - 1)
    .filter(({ i }, k, arr) => !(k === arr.length - 2 && arr[arr.length - 1].i - i < every * 0.6))

  function pick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    let best = 0, bestD = Infinity
    series.forEach((_, i) => { const d = Math.abs(x(i) - px); if (d < bestD) { bestD = d; best = i } })
    setHover(best)
  }

  const hp = hover != null ? series[hover] : null

  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>{title}</h3>
        <span className="muted small">{total} {unit} totales</span>
      </div>
      <div ref={box}>
        <svg width={W} height={H} role="img" aria-label={title}
             onMouseMove={pick} onMouseLeave={() => setHover(null)}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={PAD.left - 8} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">{t}</text>
            </g>
          ))}
          {dayTicks.map(({ p, i }) => (
            <text key={i} x={x(i)} y={H - 10} className="chart-axis"
                  textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}>{shortDate(p.date)}</text>
          ))}

          <path d={idealPath} className="chart-line ideal" />
          {actualPath && <path d={actualPath} className="chart-line actual" />}
          {lastActual && (
            <>
              <circle cx={x(series.indexOf(lastActual))} cy={y(lastActual.actual)} r="5" className="chart-dot actual" />
              <text x={x(series.indexOf(lastActual)) + 8} y={y(lastActual.actual) - 8} className="chart-direct-label">{lastActual.actual}</text>
            </>
          )}

          {hp && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} className="chart-crosshair" />
              <circle cx={x(hover)} cy={y(hp.ideal)} r="4" className="chart-dot ideal" />
              {hp.actual != null && <circle cx={x(hover)} cy={y(hp.actual)} r="4" className="chart-dot actual" />}
            </>
          )}
        </svg>
      </div>

      <div className="chart-tooltip-static" aria-live="polite">
        {hp ? (
          <>
            <b>{fmtDate(hp.date)}</b>
            <span><i className="chart-key ideal" />Ideal: {Math.round(hp.ideal)} {unit}</span>
            {hp.actual != null && <span><i className="chart-key actual" />Real: {hp.actual} {unit}</span>}
          </>
        ) : (
          <>
            <span><i className="chart-key ideal" />Ideal</span>
            <span><i className="chart-key actual" />Real (restante)</span>
            <span className="muted">Pasa el cursor para ver cada día</span>
          </>
        )}
      </div>

      <TableToggle open={showTable} setOpen={setShowTable}>
        <thead><tr><th>Día</th><th className="num">Ideal</th><th className="num">Real</th></tr></thead>
        <tbody>
          {series.map((p, i) => (
            <tr key={i}><td>{fmtDate(p.date)}</td><td className="num">{Math.round(p.ideal)}</td><td className="num">{p.actual ?? ''}</td></tr>
          ))}
        </tbody>
      </TableToggle>
    </div>
  )
}

// Velocidad: story points (o ítems) completados por sprint cerrado (+ el activo, en curso)
export function VelocityChart({ data, unit = 'Puntos cerrados' }) {
  const [box, W] = useWidth()
  const [hover, setHover] = useState(null)
  if (!data.length) return null

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const max = niceMax(Math.max(...data.map(d => d.points), 1))
  const slot = plotW / data.length
  const barW = Math.min(44, slot * 0.6)
  const y = v => PAD.top + plotH - v / max * plotH
  const ticks = axisTicks(max)
  // Nombre completo si cabe; si no, "S1", "S2"…
  // En el eje solo va "Sprint 3" (o "S3" si no cabe); la descripción completa va en la lista de abajo
  const label = name => {
    const short = splitSprint(name).short
    return slot >= 64 ? short : short.replace(/^Sprint\s*/i, 'S')
  }

  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>Velocidad por sprint</h3>
        <span className="muted small">{unit}</span>
      </div>
      <div ref={box}>
        <svg width={W} height={H} role="img" aria-label="Gráfico de velocidad por sprint">
          {ticks.map(t => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={PAD.left - 8} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">{t}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = PAD.left + slot * i + slot / 2
            const top = y(d.points)
            const h = Math.max(0, H - PAD.bottom - top)
            return (
              <g key={d.sprint.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="chart-bar-hit">
                <rect x={cx - slot / 2} y={PAD.top} width={slot} height={plotH} fill="transparent" />
                {h > 0 && (
                  <path className={'chart-bar' + (d.inProgress ? ' in-progress' : '') + (hover === i ? ' hover' : '')}
                        d={`M${cx - barW / 2},${top + h} V${top + Math.min(4, h)} Q${cx - barW / 2},${top} ${cx - barW / 2 + Math.min(4, h)},${top}
                            H${cx + barW / 2 - Math.min(4, h)} Q${cx + barW / 2},${top} ${cx + barW / 2},${top + Math.min(4, h)} V${top + h} Z`} />
                )}
                <text x={cx} y={top - 6} textAnchor="middle" className="chart-direct-label">{d.points}</text>
                <text x={cx} y={H - 10} textAnchor="middle" className="chart-axis">{label(d.sprint.name)}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="chart-tooltip-static" aria-live="polite">
        {hover != null ? (
          <><b>{data[hover].sprint.name}{data[hover].inProgress ? ' (en curso)' : ''}</b><span>{data[hover].points} {unit.toLowerCase()}</span></>
        ) : (
          <><span><i className="chart-key bar" />Sprint cerrado</span><span><i className="chart-key bar in-progress" />En curso</span></>
        )}
      </div>
      <ol className="sprint-key-list">
        {data.map((d, i) => {
          const { short, desc } = splitSprint(d.sprint.name)
          return (
            <li key={d.sprint.id} className={hover === i ? 'hover' : ''}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <b>{short}</b>
              <span className="sprint-key-desc">{desc || '—'}{d.inProgress ? ' (en curso)' : ''}</span>
              <span className="sprint-key-val">{d.points}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function TableToggle({ open, setOpen, children }) {
  return (
    <>
      <button type="button" className="btn ghost sm" onClick={() => setOpen(!open)}>
        {open ? 'Ocultar tabla' : 'Ver como tabla'}
      </button>
      {open && <div className="table-wrap"><table className="table">{children}</table></div>}
    </>
  )
}

/* ---------------- Barras apiladas por estado (HTML, sin SVG) ---------------- */

// Grupos de estado de los reportes, en el orden en que se apilan.
// Colores en styles.css (.seg-*), validados para daltonismo en claro y oscuro.
export const STATUS_GROUPS = [
  { key: 'done',     label: 'Cerradas',         statuses: ['cerrada'] },
  { key: 'review',   label: 'En revisión / QA', statuses: ['en_revision', 'qa'] },
  { key: 'progress', label: 'En progreso',      statuses: ['en_progreso'] },
  { key: 'todo',     label: 'Pendientes',       statuses: ['pendiente'] },
]

export function countByGroup(items) {
  const counts = Object.fromEntries(STATUS_GROUPS.map(g => [g.key, 0]))
  for (const i of items) {
    const g = STATUS_GROUPS.find(g => g.statuses.includes(i.status))
    if (g) counts[g.key]++
  }
  return counts
}

export function StatusLegend({ counts }) {
  return (
    <div className="chart-legend">
      {STATUS_GROUPS.map(g => (
        <span key={g.key}><i className={'seg-key seg-' + g.key} />{g.label}{counts && <b className="legend-count">{counts[g.key]}</b>}</span>
      ))}
    </div>
  )
}

// Barra horizontal apilada. scale = fracción del ancho total que ocupa (para comparar cargas entre filas).
export function StackedBar({ counts, scale = 1, onHover, label }) {
  const total = STATUS_GROUPS.reduce((s, g) => s + counts[g.key], 0)
  return (
    <div className="stacked-track" role="img" aria-label={label}>
      <div className="stacked" style={{ width: (scale * 100) + '%' }}>
        {total > 0 && STATUS_GROUPS.filter(g => counts[g.key] > 0).map(g => (
          <span key={g.key} className={'seg seg-' + g.key} style={{ flexGrow: counts[g.key] }}
                onMouseEnter={() => onHover?.(g)} onMouseLeave={() => onHover?.(null)}
                title={`${g.label}: ${counts[g.key]}`} />
        ))}
      </div>
    </div>
  )
}

// Abiertos vs. cerrados del sprint: una sola barra 100 % con el reparto por estado
export function StatusSplitCard({ items, title }) {
  const [hover, setHover] = useState(null)
  const counts = countByGroup(items)
  const total = items.length
  const closed = counts.done
  const open = total - closed
  const pct = n => (total ? Math.round(n / total * 100) : 0)
  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>{title}</h3>
        <span className="muted small">{total} ítems</span>
      </div>
      <div className="split-headline">
        <div><b className="split-num">{closed}</b><span>cerrados · {pct(closed)}%</span></div>
        <div><b className="split-num">{open}</b><span>abiertos · {pct(open)}%</span></div>
      </div>
      <StackedBar counts={counts} onHover={setHover} label={STATUS_GROUPS.map(g => `${g.label}: ${counts[g.key]}`).join(', ')} />
      <div className="chart-tooltip-static" aria-live="polite">
        {hover ? <><b>{hover.label}</b><span>{counts[hover.key]} ítems · {pct(counts[hover.key])}%</span></>
               : <span className="muted">Pasa el cursor sobre la barra para ver cada estado</span>}
      </div>
      <StatusLegend counts={counts} />
    </div>
  )
}

// Lista de categorías (tipo, prioridad…) con su barra apilada por estado
export function CategoryBarsCard({ title, rows, note }) {
  const [hover, setHover] = useState(null) // { row, group }
  const max = Math.max(1, ...rows.map(r => r.items.length))
  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>{title}</h3>
        {note && <span className="muted small">{note}</span>}
      </div>
      {rows.every(r => !r.items.length) ? <p className="muted small">Sin ítems.</p> : (
        <div className="cat-rows">
          {rows.map(r => {
            const counts = countByGroup(r.items)
            return (
              <div key={r.key} className="cat-row">
                <span className="cat-label">{r.label}</span>
                <StackedBar counts={counts} scale={r.items.length / max}
                            onHover={g => setHover(g ? { row: r, group: g, n: counts[g.key] } : null)}
                            label={`${r.label}: ${r.items.length} ítems, ${counts.done} cerrados`} />
                <span className="cat-num">{counts.done}/{r.items.length}</span>
              </div>
            )
          })}
        </div>
      )}
      <div className="chart-tooltip-static" aria-live="polite">
        {hover ? <><b>{hover.row.label}</b><span>{hover.group.label}: {hover.n}</span></>
               : <span className="muted">Cerrados / total por fila</span>}
      </div>
      <StatusLegend />
    </div>
  )
}
