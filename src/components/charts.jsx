import { useState } from 'react'
import { fmtDate } from '../lib/constants'

const W = 640, H = 220, PAD = { top: 16, right: 16, bottom: 28, left: 34 }
const plotW = W - PAD.left - PAD.right
const plotH = H - PAD.top - PAD.bottom

function niceMax(value) {
  if (value <= 0) return 4
  const step = Math.pow(10, Math.floor(Math.log10(value)))
  const n = value / step
  const rounded = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return rounded * step
}

// Burndown: puntos (o ítems) restantes del sprint activo (guía ideal vs. real, día a día)
export function BurndownChart({ series, total, unit = 'pts' }) {
  const [hover, setHover] = useState(null) // índice del día bajo el cursor
  const [showTable, setShowTable] = useState(false)
  if (!series.length) return null

  const max = niceMax(total)
  const x = i => PAD.left + (series.length === 1 ? 0 : i / (series.length - 1) * plotW)
  const y = v => PAD.top + plotH - Math.min(v, max) / max * plotH

  const idealPath = series.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.ideal)}`).join(' ')
  const actualPts = series.filter(p => p.actual != null)
  const actualPath = actualPts.map((p, i) => `${i ? 'L' : 'M'}${x(series.indexOf(p))},${y(p.actual)}`).join(' ')
  const lastActual = actualPts[actualPts.length - 1]
  const ticks = [...new Set([0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f)))]
  const dayTicks = series.filter((_, i) => i === 0 || i === series.length - 1 || i % Math.ceil(series.length / 5) === 0)

  function pick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width * W
    let best = 0, bestD = Infinity
    series.forEach((_, i) => { const d = Math.abs(x(i) - px); if (d < bestD) { bestD = d; best = i } })
    setHover(best)
  }

  const hp = hover != null ? series[hover] : null

  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>Burndown · sprint activo</h3>
        <span className="muted small">{total} {unit} totales</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de burndown del sprint activo"
           onMouseMove={pick} onMouseLeave={() => setHover(null)}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={PAD.left - 8} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">{t}</text>
          </g>
        ))}
        {dayTicks.map((p, k) => (
          <text key={k} x={x(series.indexOf(p))} y={H - 8} className="chart-axis" textAnchor="middle">{fmtDate(p.date).replace(/ de \d+$/, '')}</text>
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

      {hp && (
        <div className="chart-tooltip-static">
          <b>{fmtDate(hp.date)}</b>
          <span><i className="chart-key ideal" />Ideal: {Math.round(hp.ideal)} {unit}</span>
          {hp.actual != null && <span><i className="chart-key actual" />Real: {hp.actual} {unit}</span>}
        </div>
      )}

      <div className="chart-legend">
        <span><i className="chart-key ideal" />Ideal</span>
        <span><i className="chart-key actual" />Real</span>
      </div>

      <button type="button" className="btn ghost sm" onClick={() => setShowTable(!showTable)}>
        {showTable ? 'Ocultar tabla' : 'Ver como tabla'}
      </button>
      {showTable && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Día</th><th className="num">Ideal</th><th className="num">Real</th></tr></thead>
            <tbody>
              {series.map((p, i) => (
                <tr key={i}><td>{fmtDate(p.date)}</td><td className="num">{Math.round(p.ideal)}</td><td className="num">{p.actual ?? ''}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Velocidad: story points (o ítems) completados por sprint cerrado (+ el activo, en curso)
export function VelocityChart({ data, unit = 'Puntos cerrados' }) {
  const [hover, setHover] = useState(null)
  const [showTable, setShowTable] = useState(false)
  if (!data.length) return null

  const max = niceMax(Math.max(...data.map(d => d.points), 1))
  const slot = plotW / data.length
  const barW = Math.min(40, slot * 0.55)
  const y = v => PAD.top + plotH - v / max * plotH
  const ticks = [...new Set([0, 0.5, 1].map(f => Math.round(max * f)))]

  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>Velocidad por sprint</h3>
        <span className="muted small">{unit}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de velocidad por sprint">
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={PAD.left - 8} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = PAD.left + slot * i + slot / 2
          const top = y(d.points)
          return (
            <g key={d.sprint.id}
               onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
               className="chart-bar-hit">
              <rect x={cx - barW / 2} y={top} width={barW} height={Math.max(0, H - PAD.bottom - top)}
                    rx="4" className={'chart-bar' + (d.inProgress ? ' in-progress' : '') + (hover === i ? ' hover' : '')} />
              {d.points > 0 && <text x={cx} y={top - 6} textAnchor="middle" className="chart-direct-label">{d.points}</text>}
              <text x={cx} y={H - 8} textAnchor="middle" className="chart-axis">{d.sprint.name.replace(/^Sprint /i, 'S')}</text>
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="chart-tooltip-static">
          <b>{data[hover].sprint.name}{data[hover].inProgress ? ' (en curso)' : ''}</b>
          <span>{data[hover].points} {unit.toLowerCase()}</span>
        </div>
      )}
      <button type="button" className="btn ghost sm" onClick={() => setShowTable(!showTable)}>
        {showTable ? 'Ocultar tabla' : 'Ver como tabla'}
      </button>
      {showTable && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Sprint</th><th className="num">{unit}</th></tr></thead>
            <tbody>
              {data.map(d => (
                <tr key={d.sprint.id}><td>{d.sprint.name}{d.inProgress ? ' (en curso)' : ''}</td><td className="num">{d.points}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
