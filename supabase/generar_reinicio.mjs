// Genera el SQL de reinicio de TeamTrack a partir de Documentacion/05-backlog-siete-sprints.md
import { readFileSync, writeFileSync } from 'node:fs'

const [, , backlogPath, outPath] = process.argv
const lines = readFileSync(backlogPath, 'utf8').split(/\r?\n/)

const REPO = 'Death272004/Tr-mites-Migratorios'
const REPO_URL = 'https://github.com/' + REPO

// Rol -> miembro (patrón sobre members.full_name)
const ROLE_MEMBER = {
  PO: 'Richard%', DOC: 'Richard%', EQUIPO: 'Richard%',
  LT: 'Kennet%', DEVOPS: 'Kennet%',
  BE: 'Edgar%', FE: 'Jonhatan%', QA: 'Vivian%',
}
const PRIORITY = { 'Crítica': 'critica', 'Alta': 'alta', 'Media': 'media', 'Baja': 'baja' }

// Historia -> épica (el backlog lista las épicas por sprint; se reparte por tema)
const HU_EPIC = {
  'HU-01': 'EP-10', 'HU-02': 'EP-10', 'HU-03': 'EP-10', 'HU-04': 'EP-10', 'HU-05': 'EP-10', 'HU-09': 'EP-10',
  'HU-06': 'EP-01', 'HU-07': 'EP-01', 'HU-08': 'EP-06',
  'HU-10': 'EP-02', 'HU-11': 'EP-02', 'HU-14': 'EP-02', 'HU-12': 'EP-03', 'HU-13': 'EP-03',
  'HU-15': 'EP-04', 'HU-16': 'EP-04', 'HU-17': 'EP-04', 'HU-18': 'EP-04', 'HU-18b': 'EP-07', 'HU-18c': 'EP-07',
  'HU-19': 'EP-05', 'HU-20': 'EP-05', 'HU-21': 'EP-05', 'HU-22': 'EP-07',
  'HU-23': 'EP-06', 'HU-24': 'EP-06', 'HU-26': 'EP-06', 'HU-25': 'EP-07',
  'HU-27': 'EP-08', 'HU-28': 'EP-08', 'HU-29': 'EP-08', 'HU-30': 'EP-08',
  'HU-31': 'EP-08', 'HU-32': 'EP-09', 'HU-33': 'EP-09', 'HU-34': 'EP-09',
}

// Sprints semanales; el Sprint 4 termina la semana del 12 al 18 de octubre de 2026
const SPRINT_DATES = [
  ['2026-09-21', '2026-09-27'], ['2026-09-28', '2026-10-04'], ['2026-10-05', '2026-10-11'],
  ['2026-10-12', '2026-10-18'], ['2026-10-19', '2026-10-25'], ['2026-10-26', '2026-11-01'],
  ['2026-11-02', '2026-11-08'],
]
const SPRINT_SHORT = [
  'Portal del cliente, marco legal y fuentes simuladas',
  'Entorno, modelo de datos y autenticación',
  'Expedientes, documentos, consentimiento y ARCO',
  'Estados, revisión y auditoría',
  'Verificación documental y adaptadores',
  'Seguridad, rendimiento y usabilidad',
  'Aceptación, documentación y entrega',
]

// Trabajo ya subido al repo: queda En revisión con comentario (rama + commit)
const IN_REVIEW = {
  'HU-01': { branch: 'Frontend', commit: '95f295796d183e5da21098b7a3899ab0f09af8d7', who: 'Jonas',
    note: 'Fase A lista: layout, enrutado hash con protección por rol, componentes reutilizables y README del frontend.' },
  'HU-02': { branch: 'Frontend', commit: '6b0ec161fcb67a9e8cb557f3c986f1498f60bd50', who: 'Jonas',
    note: 'P-01 a P-05 construidas (login, registro, OTP simulado, recuperación, perfil) y gestor de sesión.' },
  'HU-03': { branch: 'Frontend', commit: 'af3a0b9bde41cdbe1bed45ac058199c6654ec6fa', who: 'Jonas', skip: ['TASK-03.6'],
    note: 'P-06 a P-18 construidas (bandeja, selección de trámite, titularidad, asistente de 8 pasos, resumen y cita). Falta revisar los fixtures del solicitante (TASK-03.6).' },
  'HU-07': { branch: 'feature/hu-07-openapi', commit: 'a9122b9436ed599bb9e84b95621096647e93d75b', who: 'Edgar',
    note: 'openapi.yaml v0.1.0 y CHANGELOG-api.md en Backend/docs.' },
  'HU-10': { branch: 'feature/hu-10-entorno', commit: '96b7f3ebd1fd669fc84bc2dadebdb4790a28b23f', who: 'Edgar', skip: ['TASK-10.6'],
    note: 'Spring Boot con perfiles, PostgreSQL + migración Flyway V1, Dockerfile, docker-compose, .env.example y README. Falta la verificación de arranque limpio de QA (TASK-10.6).' },
}

const clean = s => s.replace(/\*\*/g, '').trim()
const cells = l => l.split('|').slice(1, -1).map(c => c.trim())
const roles = s => clean(s).replace(/\bcon\b/g, ',').replace(/\//g, ',').split(',').map(r => r.trim()).filter(Boolean)
const roleKey = r => r.toUpperCase().replace('DEVOPS', 'DEVOPS')
const q = s => s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'"
const arr = a => a.length ? 'array[' + a.map(q).join(', ') + ']' : "'{}'"
const member = role => {
  const pat = ROLE_MEMBER[roleKey(role)]
  if (!pat) throw new Error('Rol sin persona: ' + role)
  return `(select id from members where full_name ilike ${q(pat)})`
}
function shortTitle(code, text, max = 110) {
  let t = clean(text).replace(/`/g, '')
  if (t.length > max) t = t.slice(0, max).replace(/\s+\S*$/, '').replace(/[,;:(]$/, '') + '…'
  return `${code} · ${t}`
}

// --- Épicas (§5.2)
const epics = []
for (const l of lines) {
  const m = l.match(/^\|\s*\**(EP-\d+)\**\s*\|/)
  if (m) { const c = cells(l).map(clean); epics.push({ code: c[0], title: c[1], goal: c[2], priority: PRIORITY[c[3]] }) }
}

// --- Sprints, historias y tareas (§5.7)
const sprints = [], stories = []
let sprint = null, hu = null, section = null
for (let i = 0; i < lines.length; i++) {
  const l = lines[i]
  let m
  if ((m = l.match(/^# Sprint (\d+) — (.+)$/))) {
    sprint = { n: +m[1], title: m[2].trim(), goal: '' }; sprints.push(sprint); hu = null; continue
  }
  if (!sprint) continue
  if (/^## /.test(l)) { sprint = null; hu = null; continue }
  if (!hu && (m = l.match(/^\*\*Objetivo:\*\*\s*(.+)$/))) { sprint.goal = clean(m[1]); continue }
  if ((m = l.match(/^### (HU-\d+[a-z]?) — (.+)$/))) {
    hu = { code: m[1], title: m[2].trim(), sprint: sprint.n, story: '', ca: [], tasks: [], extra: [] }
    stories.push(hu); section = null; continue
  }
  if (/^### /.test(l)) { hu = null; continue }
  if (!hu) continue
  if ((m = l.match(/^\*\*Prioridad:\*\*\s*(\S+)\s*·\s*\*\*([\d.]+) PH\*\*\s*·\s*\*\*Responsable:\*\*\s*(.+?)\s*·\s*\*\*Estado/))) {
    hu.priority = PRIORITY[m[1]]; hu.points = +m[2]; hu.roles = roles(m[3]); continue
  }
  if (/^\*\*Como\*\*/.test(l)) { hu.story = clean(l); continue }
  if (/^\*\*Criterios de [^:]+:\*\*/.test(l)) { section = 'ca'; continue }
  if (/^\*\*Tareas:\*\*/.test(l)) { section = 'tasks'; continue }
  if ((m = l.match(/^\*\*(Pruebas asociadas|Entregable|Entregables|Nota[^:]*):\*\*\s*(.+)$/))) {
    hu.extra.push(`${m[1]}: ${clean(m[2])}`); section = null; continue
  }
  if (section === 'ca' && /^\d+\.\s/.test(l)) { hu.ca.push(clean(l)); continue }
  if (section === 'ca' && /^\s+\S/.test(l) && hu.ca.length) { hu.ca[hu.ca.length - 1] += '\n' + l.replace(/\*\*/g, '').trimEnd(); continue }
  if (section === 'tasks' && (m = l.match(/^\|\s*(TASK-[\d.]+[a-z]?(?:\.\d+)?)\s*\|/))) {
    const c = cells(l)
    hu.tasks.push({ code: c[0], desc: clean(c[1]), roles: roles(c[2]), hours: parseFloat(c[3]) })
  }
}

// --- Validaciones del parseo
for (const s of stories) {
  if (!s.priority || !s.roles?.length || !s.story || !s.ca.length || !s.tasks.length) throw new Error('Historia incompleta: ' + s.code)
  if (!HU_EPIC[s.code]) throw new Error('Historia sin épica: ' + s.code)
  for (const t of s.tasks) if (!t.roles.length || Number.isNaN(t.hours)) throw new Error('Tarea incompleta: ' + t.code)
}
const nTasks = stories.reduce((n, s) => n + s.tasks.length, 0)
if (epics.length !== 10 || sprints.length !== 7) throw new Error(`Épicas ${epics.length}, sprints ${sprints.length}`)

// --- SQL
const out = []
out.push(`-- =====================================================================
--  TeamTrack — reinicio del tablero para el proyecto "Trámites Migratorios"
--  Repo del proyecto: ${REPO_URL}
--  Fuente del backlog: Documentacion/05-backlog-siete-sprints.md
--
--  BORRA todos los ítems, comentarios, adjuntos, historial, avisos y sprints
--  (los miembros se conservan) y carga ${epics.length} épicas, ${stories.length} historias y ${nTasks} tareas.
--  La numeración vuelve a empezar en TT-1.
--
--  Archivo generado: no editar a mano. Ejecutar completo en
--  Supabase > SQL Editor > New query > Run. Es una sola transacción.
-- =====================================================================
begin;

-- Sin avisos durante la carga (nadie recibe ${stories.length + nTasks} notificaciones de asignación)
set local teamtrack.sin_avisos = 'on';

truncate table notifications, item_watchers, comments, attachments, history, work_items, sprints
  restart identity;

-- Los cinco miembros deben existir antes de asignar
do $$
declare
  p text;
begin
  foreach p in array array['Edgar%', 'Jonhatan%', 'Richard%', 'Kennet%', 'Vivian%'] loop
    if (select count(*) from members where full_name ilike p) <> 1 then
      raise exception 'Se esperaba exactamente un miembro que coincida con %', p;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Sprints (una semana cada uno)
-- ---------------------------------------------------------------------
insert into sprints (name, goal, start_date, end_date, status) values`)
out.push(sprints.map((s, i) =>
  `  (${q(`Sprint ${s.n} · ${SPRINT_SHORT[i]}`)}, ${q(s.goal)}, ${q(SPRINT_DATES[i][0])}, ${q(SPRINT_DATES[i][1])}, ${q(i === 0 ? 'activo' : 'planificado')})`
).join(',\n') + ';')

out.push(`
-- ---------------------------------------------------------------------
-- Épicas
-- ---------------------------------------------------------------------
insert into work_items (type, title, description, priority, tags) values`)
out.push(epics.map(e =>
  `  ('epica', ${q(`${e.code} · ${e.title}`)}, ${q(e.goal)}, ${q(e.priority)}, ${arr([e.code])})`
).join(',\n') + ';')

const sprintId = n => `(select id from sprints where name like ${q(`Sprint ${n} ·%`)})`
const parent = code => `(select id from work_items where title like ${q(code + ' ·%')})`
const status = (huCode, taskCode) => {
  const r = IN_REVIEW[huCode]
  return r && !(taskCode && r.skip?.includes(taskCode)) ? 'en_revision' : 'pendiente'
}
const withRoles = rs => rs.length > 1 ? `Responsables: ${rs[0]} (principal) con ${rs.slice(1).join(', ')}.` : `Responsable: ${rs[0]}.`

out.push(`
-- ---------------------------------------------------------------------
-- Historias de usuario (asignadas al rol principal)
-- ---------------------------------------------------------------------
insert into work_items (type, title, description, acceptance_criteria, status, priority, story_points, due_date, tags, parent_id, sprint_id, assignee_id) values`)
out.push(stories.map(s => {
  const desc = [s.story, withRoles(s.roles), ...s.extra].join('\n\n')
  return `  ('historia', ${q(`${s.code} · ${s.title}`)}, ${q(desc)}, ${q(s.ca.join('\n'))}, ${q(status(s.code))}, ${q(s.priority)}, ${s.points}, ` +
    `${q(SPRINT_DATES[s.sprint - 1][1])}, ${arr([s.code, HU_EPIC[s.code], ...s.roles])}, ${parent(HU_EPIC[s.code])}, ${sprintId(s.sprint)}, ${member(s.roles[0])})`
}).join(',\n') + ';')

out.push(`
-- ---------------------------------------------------------------------
-- Tareas (cuelgan de su historia; mismo sprint y prioridad)
-- ---------------------------------------------------------------------`)
for (const s of stories) {
  out.push(`-- ${s.code}
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values`)
  out.push(s.tasks.map(t =>
    `  ('tarea', ${q(shortTitle(t.code, t.desc))}, ${q(t.desc + '\n\n' + withRoles(t.roles))}, ${q(status(s.code, t.code))}, ${q(s.priority)}, ${t.hours}, ` +
    `${q(SPRINT_DATES[s.sprint - 1][1])}, ${arr([s.code, ...t.roles])}, ${parent(s.code)}, ${sprintId(s.sprint)}, ${member(t.roles[0])})`
  ).join(',\n') + ';')
}

out.push(`
-- ---------------------------------------------------------------------
-- Avance ya subido al repositorio (historias En revisión)
-- ---------------------------------------------------------------------
insert into comments (item_id, author_id, body, repository, branch, commit_url) values`)
out.push(Object.entries(IN_REVIEW).map(([code, r]) =>
  `  (${parent(code)}, ${member('BE')}, ${q(`Carga inicial del tablero: trabajo de ${r.who} ya subido al repositorio, pendiente de revisión. ${r.note}`)}, ` +
  `${q(REPO)}, ${q(r.branch)}, ${q(`${REPO_URL}/commit/${r.commit}`)})`
).join(',\n') + ';')

out.push(`
-- Los comentarios de carga no dejan seguidores ni avisos
truncate table notifications, item_watchers;

-- Comprobación: ${epics.length} épicas, ${stories.length} historias, ${nTasks} tareas, todas las historias y tareas asignadas
do $$
declare
  n_ep int; n_hu int; n_tk int; n_sin int;
begin
  select count(*) filter (where type = 'epica'), count(*) filter (where type = 'historia'),
         count(*) filter (where type = 'tarea'),
         count(*) filter (where type <> 'epica' and (assignee_id is null or parent_id is null or sprint_id is null))
    into n_ep, n_hu, n_tk, n_sin from work_items;
  if n_ep <> ${epics.length} or n_hu <> ${stories.length} or n_tk <> ${nTasks} or n_sin <> 0 then
    raise exception 'Carga incompleta: % épicas, % historias, % tareas, % sin asignar/padre/sprint', n_ep, n_hu, n_tk, n_sin;
  end if;
end $$;

commit;
`)

writeFileSync(outPath, out.join('\n'), 'utf8')

// Resumen para revisar
const per = {}
for (const s of stories) { per[s.roles[0]] ??= { hu: 0, tk: 0, h: 0 }; per[s.roles[0]].hu++ }
for (const s of stories) for (const t of s.tasks) { per[t.roles[0]] ??= { hu: 0, tk: 0, h: 0 }; per[t.roles[0]].tk++; per[t.roles[0]].h += t.hours }
console.log(`épicas ${epics.length} · historias ${stories.length} · tareas ${nTasks}`)
console.table(per)
console.log(stories.map(s => `${s.code} S${s.sprint} ${HU_EPIC[s.code]} ${s.roles.join('+')} ${s.points}PH ca=${s.ca.length} tk=${s.tasks.length}`).join('\n'))
console.log('max título:', Math.max(...stories.flatMap(s => s.tasks.map(t => shortTitle(t.code, t.desc).length))))
