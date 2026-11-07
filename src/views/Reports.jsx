import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'
import { OPEN_STATUSES, PRIORITIES, PRIORITY_KEYS, SPRINT_STATUSES, TYPES, TYPE_KEYS, fmtDate, isOverdue } from '../lib/constants'
import { PageHeader, Avatar } from '../components/ui'
import {
  BurndownChart, VelocityChart, StatusSplitCard, CategoryBarsCard, StackedBar, StatusLegend,
  STATUS_GROUPS, countByGroup,
} from '../components/charts'
import { exportItemsXlsx } from '../lib/export'

// Días (desde field='estado', new_value='cerrada') en que cada ítem llegó a Cerrada por última vez
function useClosures(sprintId, itemIds) {
  const [closures, setClosures] = useState(null)
  const key = itemIds.join(',')
  useEffect(() => {
    if (!sprintId || !itemIds.length) { setClosures(new Map()); return }
    let cancelled = false
    setClosures(null)
    supabase.from('history').select('item_id, created_at')
      .eq('field', 'estado').eq('new_value', 'cerrada').in('item_id', itemIds)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled || error) return
        const map = new Map()
        for (const h of data) if (!map.has(h.item_id)) map.set(h.item_id, h.created_at)
        setClosures(map)
      })
    return () => { cancelled = true }
  }, [sprintId, key])
  return closures
}

function useBurndownSeries(sprint, valid) {
  const closures = useClosures(sprint?.id, valid.map(i => i.id))
  if (!sprint || !closures) return null

  // Si nadie puso story points, el burndown cuenta ítems en su lugar
  const totalPoints = valid.reduce((s, i) => s + Number(i.story_points ?? 0), 0)
  const byCount = totalPoints === 0
  const weight = i => byCount ? 1 : Number(i.story_points ?? 0)
  const total = byCount ? valid.length : totalPoints

  const start = new Date(sprint.start_date + 'T00:00:00')
  const end = new Date(sprint.end_date + 'T00:00:00')
  const today = new Date(new Date().toDateString())
  const days = Math.max(1, Math.round((end - start) / 864e5))

  const series = []
  for (let d = 0; d <= days; d++) {
    const day = new Date(start.getTime() + d * 864e5)
    const ideal = Math.max(0, total - (total * d / days))
    let actual = null
    if (day <= today) {
      const closed = valid
        .filter(i => i.status === 'cerrada' && closures.get(i.id) && new Date(closures.get(i.id)) < new Date(day.getTime() + 864e5))
        .reduce((s, i) => s + weight(i), 0)
      actual = Math.max(0, total - closed)
    }
    series.push({ date: day, ideal, actual })
  }
  return { total, series, unit: byCount ? 'ítems' : 'pts' }
}

const sum = (rows, f) => rows.reduce((s, i) => s + Number(i[f] ?? 0), 0)

// Resumen por integrante del sprint elegido (incluye a los activos sin trabajo y la fila "Sin asignar")
function memberRows(sprintItems, activeMembers, membersById) {
  const byMember = new Map()
  for (const i of sprintItems) {
    const k = i.assignee_id ?? 'none'
    if (!byMember.has(k)) byMember.set(k, [])
    byMember.get(k).push(i)
  }
  for (const m of activeMembers) if (!byMember.has(m.id)) byMember.set(m.id, [])
  return [...byMember.entries()].map(([k, rows]) => {
    const counts = countByGroup(rows)
    return {
      key: k, member: k === 'none' ? null : membersById[k], rows, counts,
      total: rows.length, closed: counts.done, open: rows.length - counts.done,
      overdue: rows.filter(isOverdue).length,
      ptsTotal: sum(rows, 'story_points'), ptsDone: sum(rows.filter(i => i.status === 'cerrada'), 'story_points'),
      hours: sum(rows, 'estimate_hours'),
    }
  }).sort((a, b) => (a.key === 'none') - (b.key === 'none') || b.total - a.total || (a.member?.full_name ?? '').localeCompare(b.member?.full_name ?? ''))
}

function MemberBreakdown({ rows, showPts, showHours }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...rows.map(r => r.total))
  return (
    <div className="chart-card span-all">
      <div className="chart-head">
        <h3>Avance por integrante</h3>
        <span className="muted small">La barra muestra la carga de cada uno, repartida por estado</span>
      </div>
      <div className="table-wrap member-table">
        <table className="table">
          <thead>
            <tr>
              <th>Integrante</th>
              <th className="col-bar">Reparto por estado</th>
              <th className="num">Total</th>
              <th className="num">Cerradas</th>
              <th className="num">Abiertas</th>
              <th className="num">Avance</th>
              <th className="num">Vencidas</th>
              {showPts && <th className="num col-opt">Puntos</th>}
              {showHours && <th className="num col-opt">Horas est.</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key} className={r.total ? '' : 'dim'}>
                <td>
                  <span className="member-cell">
                    <Avatar member={r.member} size={22} />
                    <span>{r.member?.full_name ?? 'Sin asignar'}</span>
                  </span>
                </td>
                <td className="col-bar">
                  {r.total > 0
                    ? <StackedBar counts={r.counts} scale={r.total / max}
                                  onHover={g => setHover(g ? { r, g } : null)}
                                  label={STATUS_GROUPS.map(g => `${g.label}: ${r.counts[g.key]}`).join(', ')} />
                    : <span className="muted small">Sin ítems en este sprint</span>}
                </td>
                <td className="num">{r.total}</td>
                <td className="num">{r.closed}</td>
                <td className="num">{r.open}</td>
                <td className="num">{r.total ? Math.round(r.closed / r.total * 100) + '%' : '—'}</td>
                <td className={'num' + (r.overdue ? ' overdue' : '')}>{r.overdue}</td>
                {showPts && <td className="num col-opt">{r.ptsDone}/{r.ptsTotal}</td>}
                {showHours && <td className="num col-opt">{r.hours}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="chart-tooltip-static" aria-live="polite">
        {hover ? <><b>{hover.r.member?.full_name ?? 'Sin asignar'}</b><span>{hover.g.label}: {hover.r.counts[hover.g.key]}</span></>
               : <span className="muted">Pasa el cursor sobre una barra para ver el detalle</span>}
      </div>
      <StatusLegend />
    </div>
  )
}

export default function Reports() {
  const { items, itemsById, sprints, activeSprint, activeMembers, membersById, sprintsById } = useApp()
  const ctx = { itemsById, membersById, sprintsById }

  // Sprint a analizar: el activo; si no hay, el que cubre la fecha de hoy; si no, el más reciente
  const [sprintId, setSprintId] = useState(() => {
    const today = new Date().toLocaleDateString('en-CA')   // AAAA-MM-DD local
    const current = sprints.find(s => s.start_date <= today && today <= s.end_date)
    return (activeSprint ?? current ?? sprints[0])?.id ?? null
  })
  const sprint = sprintsById[sprintId] ?? activeSprint ?? sprints[0] ?? null

  const sprintItems = useMemo(
    () => (sprint ? items.filter(i => i.sprint_id === sprint.id && i.status !== 'cancelada') : []),
    [items, sprint?.id],
  )
  const sprintClosed = sprintItems.filter(i => i.status === 'cerrada')
  const sprintOpen = sprintItems.filter(i => OPEN_STATUSES.includes(i.status))
  const sprintPct = sprintItems.length ? Math.round(sprintClosed.length / sprintItems.length * 100) : 0
  const ptsTotal = sum(sprintItems, 'story_points')
  const ptsDone = sum(sprintClosed, 'story_points')
  const hoursTotal = sum(sprintItems, 'estimate_hours')

  const burndown = useBurndownSeries(sprint, sprintItems)
  const members = memberRows(sprintItems, activeMembers, membersById)

  // Generales (todo el proyecto)
  const open = items.filter(i => OPEN_STATUSES.includes(i.status))
  const overdue = open.filter(isOverdue)
  const unassigned = open.filter(i => !i.assignee_id)
  const critical = open.filter(i => i.priority === 'critica')
  const bugsOpen = open.filter(i => i.type === 'bug')
  const backlogOpen = open.filter(i => !i.sprint_id)

  const closedSprints = sprints.filter(s => s.status === 'cerrado').sort((a, b) => a.end_date.localeCompare(b.end_date)).slice(-6)
  const velocitySprints = [...closedSprints, ...(activeSprint ? [activeSprint] : [])]
  // Si nadie puso story points en estos sprints, se cuenta ítems cerrados en su lugar
  const anyPoints = velocitySprints.some(s => items.some(i => i.sprint_id === s.id && Number(i.story_points ?? 0) > 0))
  const velocityData = velocitySprints.map(s => {
    const done = items.filter(i => i.sprint_id === s.id && i.status === 'cerrada')
    return { sprint: s, inProgress: s.status === 'activo', points: anyPoints ? sum(done, 'story_points') : done.length }
  })
  const velocityUnit = anyPoints ? 'Puntos cerrados' : 'Ítems cerrados'

  const typeRows = TYPE_KEYS.map(k => ({ key: k, label: TYPES[k].label, items: sprintItems.filter(i => i.type === k) }))
  const prioRows = PRIORITY_KEYS.map(k => ({ key: k, label: PRIORITIES[k].label, items: sprintItems.filter(i => i.priority === k) }))

  // Excel del sprint: hoja "Tareas" con TODOS sus ítems (incluidas las canceladas) y hoja "Por integrante"
  function exportSprint() {
    const all = items.filter(i => i.sprint_id === sprint.id)
    const memberSheet = {
      name: 'Por integrante',
      columns: [
        { label: 'Integrante', width: 24 }, { label: 'Total', width: 8 },
        ...STATUS_GROUPS.map(g => ({ label: g.label, width: 12 })),
        { label: 'Abiertas', width: 9 }, { label: 'Avance %', width: 9 }, { label: 'Vencidas', width: 9 },
        { label: 'Puntos cerrados', width: 9 }, { label: 'Puntos totales', width: 9 }, { label: 'Horas estimadas', width: 9 },
      ],
      rows: members.map(r => [
        r.member?.full_name ?? 'Sin asignar', r.total, ...STATUS_GROUPS.map(g => r.counts[g.key]),
        r.open, r.total ? Math.round(r.closed / r.total * 100) : 0, r.overdue, r.ptsDone, r.ptsTotal, r.hours,
      ]),
    }
    const short = sprint.name.split('·')[0].trim()
    exportItemsXlsx(`TeamTrack - ${short}.xlsx`, 'Tareas', all, ctx, [memberSheet])
  }

  return (
    <div className="reports">
      <PageHeader title="Reportes" subtitle="Avance del sprint, carga por integrante, velocidad del equipo y exportación">
        {sprints.length > 0 && (
          <label className="inline">
            <span className="muted small">Sprint</span>
            <select value={sprint?.id ?? ''} onChange={e => setSprintId(Number(e.target.value))}>
              {sprints.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({SPRINT_STATUSES[s.status]?.toLowerCase()})</option>
              ))}
            </select>
          </label>
        )}
        {sprint && <button className="btn ghost sm" onClick={exportSprint}>Exportar sprint (Excel)</button>}
        <button className="btn ghost sm" onClick={() => exportItemsXlsx('TeamTrack - Backlog completo.xlsx', 'Backlog', items, ctx)}>Exportar backlog (Excel)</button>
      </PageHeader>

      {!sprint ? <p className="hint">Aún no hay sprints. Crea uno en la vista Sprints para ver sus reportes.</p> : (
        <section aria-labelledby="rep-sprint">
          <h2 id="rep-sprint" className="report-section">
            {sprint.name}
            <span className="muted small">{fmtDate(sprint.start_date)} – {fmtDate(sprint.end_date)} · {SPRINT_STATUSES[sprint.status]}</span>
          </h2>

          <div className="stats kpis">
            <div className="stat"><span>Ítems del sprint</span><b>{sprintItems.length}</b></div>
            <div className="stat"><span>Cerrados</span><b>{sprintClosed.length}</b></div>
            <div className="stat"><span>Abiertos</span><b>{sprintOpen.length}</b></div>
            <div className="stat"><span>Avance</span><b>{sprintPct}%</b></div>
            {ptsTotal > 0 && <div className="stat"><span>Puntos cerrados</span><b>{ptsDone}<small>/{ptsTotal}</small></b></div>}
            {hoursTotal > 0 && <div className="stat"><span>Horas estimadas</span><b>{hoursTotal}</b></div>}
            <div className={'stat' + (sprintOpen.filter(isOverdue).length ? ' bad' : '')}><span>Vencidos</span><b>{sprintOpen.filter(isOverdue).length}</b></div>
            <div className="stat"><span>Sin asignar</span><b>{sprintOpen.filter(i => !i.assignee_id).length}</b></div>
          </div>

          <div className="charts-grid">
            <StatusSplitCard items={sprintItems} title="Cerrados vs. abiertos" />
            {burndown && burndown.total > 0
              ? <BurndownChart series={burndown.series} total={burndown.total} unit={burndown.unit} title="Burndown" />
              : <div className="chart-card"><div className="chart-head"><h3>Burndown</h3></div><p className="muted small">{burndown ? 'El sprint no tiene ítems.' : 'Cargando…'}</p></div>}
            <MemberBreakdown rows={members} showPts={ptsTotal > 0} showHours={hoursTotal > 0} />
            <CategoryBarsCard title="Por tipo" rows={typeRows} note="cerrados / total" />
            <CategoryBarsCard title="Por prioridad" rows={prioRows} note="cerrados / total" />
          </div>
        </section>
      )}

      <section aria-labelledby="rep-general">
        <h2 id="rep-general" className="report-section">Proyecto completo</h2>
        <div className="stats kpis">
          <div className="stat"><span>Abiertas</span><b>{open.length}</b></div>
          <div className="stat"><span>En backlog (sin sprint)</span><b>{backlogOpen.length}</b></div>
          <div className={'stat' + (overdue.length ? ' bad' : '')}><span>Vencidas</span><b>{overdue.length}</b></div>
          <div className="stat"><span>Sin asignar</span><b>{unassigned.length}</b></div>
          <div className={'stat' + (critical.length ? ' bad' : '')}><span>Críticas abiertas</span><b>{critical.length}</b></div>
          <div className="stat"><span>Bugs abiertos</span><b>{bugsOpen.length}</b></div>
        </div>
        <div className="charts-grid">
          {velocityData.length > 0
            ? <VelocityChart data={velocityData} unit={velocityUnit} />
            : <p className="muted">Aún no hay sprints cerrados para calcular la velocidad.</p>}
        </div>
      </section>
    </div>
  )
}
