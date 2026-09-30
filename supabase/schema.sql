-- =====================================================================
--  TeamTrack — esquema completo para Supabase (PostgreSQL)
--  Ejecutar TODO el archivo en: Supabase > SQL Editor > New query > Run
--  ANTES de ejecutar: cambia los correos de la sección "Datos iniciales"
--  (al final) por los correos reales de cada integrante.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type item_type     as enum ('epica', 'historia', 'tarea', 'bug');
create type item_status   as enum ('pendiente', 'en_progreso', 'en_revision', 'qa', 'cerrada', 'cancelada');
create type item_priority as enum ('critica', 'alta', 'media', 'baja');
create type bug_severity  as enum ('bloqueante', 'mayor', 'menor', 'trivial');
create type sprint_status as enum ('planificado', 'activo', 'cerrado');

-- ---------------------------------------------------------------------
-- Miembros del equipo (lista blanca: solo estos correos pueden registrarse)
-- ---------------------------------------------------------------------
create table members (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique references auth.users(id) on delete set null,
  full_name  text not null check (length(trim(full_name)) > 0),
  email      text not null unique check (email = lower(email)),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function current_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from members where user_id = auth.uid() and active limit 1;
$$;

create or replace function is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where user_id = auth.uid() and active);
$$;

-- Bloquea el registro de correos que no están en members (o están inactivos)
create or replace function trg_auth_whitelist() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.members where email = lower(new.email) and active) then
    raise exception 'El correo % no pertenece al equipo', new.email;
  end if;
  return new;
end $$;

create trigger auth_whitelist before insert on auth.users
for each row execute function trg_auth_whitelist();

-- Vincula la cuenta recién creada con su fila en members
create or replace function trg_auth_link_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.members set user_id = new.id where email = lower(new.email);
  return new;
end $$;

create trigger auth_link_member after insert on auth.users
for each row execute function trg_auth_link_member();

-- ---------------------------------------------------------------------
-- Sprints
-- ---------------------------------------------------------------------
create table sprints (
  id         bigint generated always as identity primary key,
  name       text not null check (length(trim(name)) > 0),
  goal       text,
  start_date date not null,
  end_date   date not null,
  status     sprint_status not null default 'planificado',
  created_at timestamptz not null default now(),
  constraint sprint_dates check (end_date >= start_date)
);
-- Solo puede haber un sprint activo a la vez
create unique index one_active_sprint on sprints (status) where status = 'activo';

-- ---------------------------------------------------------------------
-- Ítems de trabajo (épicas, historias, tareas, bugs)
-- sprint_id NULL = el ítem está en el backlog
-- ---------------------------------------------------------------------
create table work_items (
  id                  bigint generated always as identity primary key,
  type                item_type not null,
  title               text not null check (length(trim(title)) > 0),
  description         text,
  acceptance_criteria text,
  status              item_status not null default 'pendiente',
  priority            item_priority not null default 'media',
  severity            bug_severity,
  story_points        numeric(5,1) check (story_points >= 0),
  estimate_hours      numeric(6,1) check (estimate_hours >= 0),
  due_date            date,
  tags                text[] not null default '{}',
  parent_id           bigint references work_items(id) on delete set null,
  sprint_id           bigint references sprints(id) on delete set null,
  assignee_id         uuid references members(id) on delete set null,
  created_by          uuid references members(id) on delete set null default current_member_id(),
  cancel_reason       text,
  closed_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint cancel_needs_reason check (status <> 'cancelada' or length(trim(coalesce(cancel_reason, ''))) > 0),
  constraint severity_only_bugs  check (type = 'bug' or severity is null)
);
create index work_items_parent on work_items (parent_id);
create index work_items_sprint on work_items (sprint_id);
create index work_items_assignee on work_items (assignee_id);

-- Reglas de jerarquía y campos automáticos
create or replace function trg_work_items_validate() returns trigger
language plpgsql set search_path = public as $$
declare
  p_type item_type;
begin
  new.updated_at := now();

  if new.status = 'cerrada' then
    if tg_op = 'INSERT' or old.status <> 'cerrada' then new.closed_at := now(); end if;
  else
    new.closed_at := null;
  end if;
  if new.status <> 'cancelada' then new.cancel_reason := null; end if;

  if tg_op = 'UPDATE' and new.type is distinct from old.type
     and exists (select 1 from work_items where parent_id = new.id) then
    raise exception 'No se puede cambiar el tipo de un ítem que tiene hijos';
  end if;

  if new.parent_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.parent_id = new.id then
    raise exception 'Un ítem no puede ser su propio padre';
  end if;

  select type into p_type from work_items where id = new.parent_id;
  if new.type = 'epica' then
    raise exception 'Una épica no puede tener padre';
  elsif new.type = 'historia' and p_type <> 'epica' then
    raise exception 'Una historia de usuario solo puede colgar de una épica';
  elsif new.type in ('tarea', 'bug') and p_type not in ('epica', 'historia') then
    raise exception 'Las tareas y bugs cuelgan de una historia o de una épica';
  end if;
  return new;
end $$;

create trigger work_items_validate before insert or update on work_items
for each row execute function trg_work_items_validate();

-- ---------------------------------------------------------------------
-- Comentarios (texto libre + vínculo opcional a GitHub)
-- ---------------------------------------------------------------------
create table comments (
  id         bigint generated always as identity primary key,
  item_id    bigint not null references work_items(id) on delete cascade,
  author_id  uuid references members(id) on delete set null default current_member_id(),
  body       text,
  repository text,
  branch     text,
  commit_url text,
  pr_url     text,
  created_at timestamptz not null default now(),
  constraint comment_not_empty check (
    length(trim(coalesce(body, '') || coalesce(repository, '') || coalesce(branch, '')
                || coalesce(commit_url, '') || coalesce(pr_url, ''))) > 0)
);
create index comments_item on comments (item_id);

-- ---------------------------------------------------------------------
-- Adjuntos (capturas de pantalla). El archivo vive en Storage (bucket "adjuntos")
-- ---------------------------------------------------------------------
create table attachments (
  id           bigint generated always as identity primary key,
  item_id      bigint not null references work_items(id) on delete cascade,
  storage_path text not null unique,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  uuid references members(id) on delete set null default current_member_id(),
  created_at   timestamptz not null default now()
);
create index attachments_item on attachments (item_id);

-- ---------------------------------------------------------------------
-- Historial (se llena SOLO con triggers; nadie puede editarlo ni borrarlo)
-- ---------------------------------------------------------------------
create table history (
  id         bigint generated always as identity primary key,
  item_id    bigint,          -- sin FK: el historial se conserva aunque el ítem se elimine
  item_label text not null,
  action     text not null,   -- creado | modificado | cancelado | reabierto | comentario | adjunto | adjunto eliminado | eliminado
  field      text,
  old_value  text,
  new_value  text,
  reason     text,
  snapshot   jsonb,           -- copia completa del ítem cuando se elimina
  actor_id   uuid references members(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now()
);
create index history_item on history (item_id);
create index history_created on history (created_at desc);

create or replace function log_history(
  p_item_id bigint, p_label text, p_action text, p_field text,
  p_old text, p_new text, p_reason text default null, p_snapshot jsonb default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  m members;
begin
  select * into m from members where user_id = auth.uid();
  insert into history (item_id, item_label, action, field, old_value, new_value, reason, snapshot, actor_id, actor_name)
  values (p_item_id, coalesce(p_label, '#' || p_item_id), p_action, p_field, p_old, p_new, p_reason, p_snapshot,
          m.id, coalesce(m.full_name, 'Sistema'));
end $$;

create or replace function item_ref(p bigint) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select '#' || id || ' ' || title from work_items where id = p), '#' || p) where p is not null;
$$;
create or replace function sprint_ref(p bigint) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select name from sprints where id = p), 'Sprint ' || p) where p is not null;
$$;
create or replace function member_ref(p uuid) returns text
language sql stable security definer set search_path = public as $$
  select (select full_name from members where id = p) where p is not null;
$$;

create or replace function trg_work_items_history() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  lbl text := '#' || new.id || ' ' || new.title;
begin
  if tg_op = 'INSERT' then
    perform log_history(new.id, lbl, 'creado', 'tipo', null, new.type::text);
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'cancelada' then
      perform log_history(new.id, lbl, 'cancelado', 'estado', old.status::text, new.status::text, new.cancel_reason);
    elsif old.status = 'cancelada' then
      perform log_history(new.id, lbl, 'reabierto', 'estado', old.status::text, new.status::text);
    else
      perform log_history(new.id, lbl, 'modificado', 'estado', old.status::text, new.status::text);
    end if;
  end if;
  if new.type is distinct from old.type then
    perform log_history(new.id, lbl, 'modificado', 'tipo', old.type::text, new.type::text);
  end if;
  if new.title is distinct from old.title then
    perform log_history(new.id, lbl, 'modificado', 'titulo', old.title, new.title);
  end if;
  if new.description is distinct from old.description then
    perform log_history(new.id, lbl, 'modificado', 'descripcion', left(old.description, 300), left(new.description, 300));
  end if;
  if new.acceptance_criteria is distinct from old.acceptance_criteria then
    perform log_history(new.id, lbl, 'modificado', 'criterios de aceptacion',
                        left(old.acceptance_criteria, 300), left(new.acceptance_criteria, 300));
  end if;
  if new.priority is distinct from old.priority then
    perform log_history(new.id, lbl, 'modificado', 'prioridad', old.priority::text, new.priority::text);
  end if;
  if new.severity is distinct from old.severity then
    perform log_history(new.id, lbl, 'modificado', 'severidad', old.severity::text, new.severity::text);
  end if;
  if new.story_points is distinct from old.story_points then
    perform log_history(new.id, lbl, 'modificado', 'story points', old.story_points::text, new.story_points::text);
  end if;
  if new.estimate_hours is distinct from old.estimate_hours then
    perform log_history(new.id, lbl, 'modificado', 'estimacion (h)', old.estimate_hours::text, new.estimate_hours::text);
  end if;
  if new.due_date is distinct from old.due_date then
    perform log_history(new.id, lbl, 'modificado', 'fecha limite', old.due_date::text, new.due_date::text);
  end if;
  if new.tags is distinct from old.tags then
    perform log_history(new.id, lbl, 'modificado', 'etiquetas', array_to_string(old.tags, ', '), array_to_string(new.tags, ', '));
  end if;
  if new.parent_id is distinct from old.parent_id then
    perform log_history(new.id, lbl, 'modificado', 'padre', item_ref(old.parent_id), item_ref(new.parent_id));
  end if;
  if new.sprint_id is distinct from old.sprint_id then
    perform log_history(new.id, lbl, 'modificado', 'sprint',
                        coalesce(sprint_ref(old.sprint_id), 'Backlog'), coalesce(sprint_ref(new.sprint_id), 'Backlog'));
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    perform log_history(new.id, lbl, 'modificado', 'asignado', member_ref(old.assignee_id), member_ref(new.assignee_id));
  end if;
  return new;
end $$;

create trigger work_items_history after insert or update on work_items
for each row execute function trg_work_items_history();

create or replace function trg_comments_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform log_history(new.item_id, item_ref(new.item_id), 'comentario', 'comentario', null,
    concat_ws(' | ',
      nullif(left(new.body, 300), ''),
      'repo: '   || nullif(new.repository, ''),
      'rama: '   || nullif(new.branch, ''),
      'commit: ' || nullif(new.commit_url, ''),
      'PR: '     || nullif(new.pr_url, '')));
  return new;
end $$;

create trigger comments_history after insert on comments
for each row execute function trg_comments_history();

create or replace function trg_attachments_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform log_history(new.item_id, item_ref(new.item_id), 'adjunto', 'adjunto', null, new.file_name);
    return new;
  end if;
  perform log_history(old.item_id, item_ref(old.item_id), 'adjunto eliminado', 'adjunto', old.file_name, null);
  return old;
end $$;

create trigger attachments_history after insert or delete on attachments
for each row execute function trg_attachments_history();

-- ---------------------------------------------------------------------
-- Eliminación definitiva (solo por esta función, exige motivo y deja rastro)
-- ---------------------------------------------------------------------
create or replace function delete_work_item(p_id bigint, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  w work_items;
begin
  if not is_member() then
    raise exception 'Solo los miembros del equipo pueden eliminar ítems';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Debes indicar el motivo de la eliminación';
  end if;
  select * into w from work_items where id = p_id;
  if not found then
    raise exception 'El ítem #% no existe', p_id;
  end if;

  delete from attachments where item_id = p_id;  -- deja registro de cada adjunto
  perform log_history(w.id, '#' || w.id || ' ' || w.title, 'eliminado', 'tipo', w.type::text, null,
                      p_reason, to_jsonb(w));
  delete from work_items where id = p_id;        -- hijos quedan sin padre; comentarios se borran
end $$;

-- ---------------------------------------------------------------------
-- Seguridad (RLS): visitantes leen todo, solo miembros activos escriben
-- ---------------------------------------------------------------------
alter table members     enable row level security;
alter table sprints     enable row level security;
alter table work_items  enable row level security;
alter table comments    enable row level security;
alter table attachments enable row level security;
alter table history     enable row level security;

-- Lectura pública (modo visitante)
create policy "lectura publica" on members     for select to anon, authenticated using (true);
create policy "lectura publica" on sprints     for select to anon, authenticated using (true);
create policy "lectura publica" on work_items  for select to anon, authenticated using (true);
create policy "lectura publica" on comments    for select to anon, authenticated using (true);
create policy "lectura publica" on attachments for select to anon, authenticated using (true);
create policy "lectura publica" on history     for select to anon, authenticated using (true);

-- Los visitantes no ven los correos del equipo
revoke all on members from anon;
grant select (id, full_name, active, user_id, created_at) on members to anon;

-- Escritura solo para miembros activos
create policy "miembros agregan"   on members for insert to authenticated with check (is_member());
create policy "miembros actualizan" on members for update to authenticated using (is_member()) with check (is_member());

create policy "miembros crean"      on sprints for insert to authenticated with check (is_member());
create policy "miembros actualizan" on sprints for update to authenticated using (is_member()) with check (is_member());
create policy "miembros eliminan"   on sprints for delete to authenticated using (is_member() and status = 'planificado');

create policy "miembros crean"      on work_items for insert to authenticated with check (is_member());
create policy "miembros actualizan" on work_items for update to authenticated using (is_member()) with check (is_member());
-- Sin política DELETE en work_items: se elimina solo con delete_work_item()

create policy "miembros comentan" on comments for insert to authenticated
  with check (is_member() and author_id = current_member_id());
-- Los comentarios no se editan ni se borran: forman parte del historial

create policy "miembros adjuntan" on attachments for insert to authenticated with check (is_member());
create policy "miembros quitan"   on attachments for delete to authenticated using (is_member());
-- history: sin políticas de escritura (solo triggers)

revoke execute on function log_history(bigint, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function delete_work_item(bigint, text) from public, anon;
grant  execute on function delete_work_item(bigint, text) to authenticated;

-- ---------------------------------------------------------------------
-- Storage: bucket público de lectura para capturas (máx. 10 MB por archivo)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('adjuntos', 'adjuntos', true, 10485760)
on conflict (id) do nothing;

create policy "miembros suben adjuntos" on storage.objects for insert to authenticated
  with check (bucket_id = 'adjuntos' and public.is_member());
create policy "miembros borran adjuntos" on storage.objects for delete to authenticated
  using (bucket_id = 'adjuntos' and public.is_member());

-- ---------------------------------------------------------------------
-- Tiempo real (la app se actualiza sola cuando otro miembro cambia algo)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table work_items, sprints, comments, attachments, history;

-- ---------------------------------------------------------------------
-- Datos iniciales — CAMBIA LOS CORREOS antes de ejecutar (en minúsculas)
-- ---------------------------------------------------------------------
insert into members (full_name, email) values
  ('Edgar Rosario',     'edgar.rosario@cambiar.com'),
  ('Kennet Karter',     'kennet.karter@cambiar.com'),
  ('Richard Rodriguez', 'richard.rodriguez@cambiar.com'),
  ('Vivian Paris',      'vivian.paris@cambiar.com'),
  ('Jonhatan (Jonas)',  'jonhatan@cambiar.com');
