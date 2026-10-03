import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'
import { OPEN_STATUSES, isOverdue } from '../lib/constants'
import { PageHeader } from '../components/ui'
import { BurndownChart, VelocityChart } from '../components/charts'
import { exportWorkItems } from '../lib/csv'

// Días (desde field='estado', new_value='cerrada') en que cada ítem llegó a Cerrada por última vez
function useClosures(sprintId, itemIds) {
  const [closures, setClosures] = useState(null)
  useEffect(() => {
    if (!sprintId || !itemIds.length) { setClosures(new Map()); return }
    let cancelled = false
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
  }, [sprintId, itemIds.join(',')])
  return closures
}

function useBurndownSeries(sprint, items) {
  const valid = sprint ? items.filter(i => i.sprint_id === sprint.id && i.status !== 'cancelada') : []
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
        .filter(i => closures.get(i.id) && new Date(closures.get(i.id)) < new Date(day.getTime() + 864e5))
        .reduce((s, i) => s + weight(i), 0)
      actual = Math.max(0, total - closed)
    }
    series.push({ date: day, ideal, actual })
  }
  return { total, series, unit: byCount ? 'ítems' : 'pts' }
}

export default function Reports() {
  const { items, sprints, activeSprint, membersById, sprintsById } = useApp()
  const ctx = { membersById, sprintsById }

  const open = items.filter(i => OPEN_STATUSES.includes(i.status))
  const overdue = open.filter(isOverdue)
  const unassigned = open.filter(i => !i.assignee_id)
  const critical = open.filter(i => i.priority === 'critica')

  const sprintItems = activeSprint ? items.filter(i => i.sprint_id === activeSprint.id && i.status !== 'cancelada') : []
  const sprintDone = sprintItems.filter(i => i.status === 'cerrada').length
  const sprintPct = sprintItems.length ? Math.round(sprintDone / sprintItems.length * 100) : 0

  const burndown = useBurndownSeries(activeSprint, items)

  const closedSprints = sprints.filter(s => s.status === 'cerrado').sort((a, b) => a.end_date.localeCompare(b.end_date)).slice(-5)
  const velocitySprints = [...closedSprints, ...(activeSprint ? [activeSprint] : [])]
  // Si nadie puso story points en estos sprints, se cuenta ítems cerrados en su lugar
  const anyPoints = velocitySprints.some(s => items.some(i => i.sprint_id === s.id && Number(i.story_points ?? 0) > 0))
  const velocityData = velocitySprints.map(s => {
    const done = items.filter(i => i.sprint_id === s.id && i.status === 'cerrada')
    return {
      sprint: s, inProgress: s.status === 'activo',
      points: anyPoints ? done.reduce((sum, i) => sum + Number(i.story_points ?? 0), 0) : done.length,
    }
  })
  const velocityUnit = anyPoints ? 'Puntos cerrados' : 'Ítems cerrados'

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Avance del sprint activo, velocidad del equipo y exportación de datos">
        <button className="btn ghost sm" onClick={() => exportWorkItems('teamtrack-backlog.csv', items, ctx)}>Exportar backlog (CSV)</button>
        {activeSprint && (
          <button className="btn ghost sm" onClick={() => exportWorkItems(`teamtrack-${activeSprint.name}.csv`, sprintItems, ctx)}>
            Exportar sprint activo (CSV)
          </button>
        )}
      </PageHeader>

      <div className="stats kpis">
        <div className="stat"><span>Abiertas</span><b>{open.length}</b></div>
        <div className={'stat' + (overdue.length ? ' bad' : '')}><span>Vencidas</span><b>{overdue.length}</b></div>
        <div className="stat"><span>Sin asignar</span><b>{unassigned.length}</b></div>
        <div className={'stat' + (critical.length ? ' bad' : '')}><span>Críticas abiertas</span><b>{critical.length}</b></div>
        <div className="stat"><span>Sprint activo</span><b>{activeSprint ? sprintPct + '%' : '—'}</b></div>
      </div>

      {!activeSprint && <p className="hint">No hay sprint activo: el burndown aparece cuando inicies uno en la vista Sprints.</p>}

      <div className="charts-grid">
        {burndown && burndown.total > 0 && <BurndownChart series={burndown.series} total={burndown.total} unit={burndown.unit} />}
        {velocityData.length > 0
          ? <VelocityChart data={velocityData} unit={velocityUnit} />
          : <p className="muted">Aún no hay sprints cerrados para calcular la velocidad.</p>}
      </div>
    </div>
  )
}
