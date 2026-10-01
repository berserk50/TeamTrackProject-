-- =====================================================================
--  TeamTrack — Notificaciones, menciones (@) y seguidores (como Jira)
--  Ejecutar en: Supabase > SQL Editor > New query > Run
--
--  Es una migración ADITIVA sobre schema.sql: crea tablas, una columna con
--  valor por defecto, funciones y triggers nuevos. No modifica ni borra nada
--  existente, así que la versión actual de la app sigue funcionando.
--  Se puede ejecutar varias veces. Para deshacerla: notificaciones_rollback.sql
--
--  Quién recibe avisos (nunca de lo que hace uno mismo):
--    · Te asignan un ítem (al crearlo o al reasignarlo) ......... el nuevo responsable
--    · Te mencionan con @ en un comentario ...................... el mencionado
--    · Comentario nuevo ......................................... responsable, creador y seguidores
--    · Cualquier otro cambio (estado, prioridad, sprint,
--      adjuntos, cancelación, eliminación, etc.) ................ responsable, creador y seguidores
--  Quien comenta un ítem pasa a seguirlo automáticamente (como en Jira).
--
--  Cargas masivas sin avisos: antes del script ejecuta
--      set teamtrack.sin_avisos = 'on';
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Seguidores de un ítem (botón "Seguir")
-- ---------------------------------------------------------------------
create table if not exists item_watchers (
  item_id    bigint not null references work_items(id) on delete cascade,
  member_id  uuid   not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, member_id)
);
create index if not exists item_watchers_member on item_watchers (member_id);

alter table item_watchers enable row level security;
drop policy if exists "lectura publica" on item_watchers;
create policy "lectura publica" on item_watchers for select to anon, authenticated using (true);
drop policy if exists "miembros siguen" on item_watchers;
create policy "miembros siguen" on item_watchers for insert to authenticated
  with check (is_member() and member_id = current_member_id());
drop policy if exists "miembros dejan de seguir" on item_watchers;
create policy "miembros dejan de seguir" on item_watchers for delete to authenticated
  using (member_id = current_member_id());

-- ---------------------------------------------------------------------
-- Menciones: ids de los miembros etiquetados con @ en el comentario
-- ---------------------------------------------------------------------
alter table comments add column if not exists mentions uuid[] not null default '{}';

-- ---------------------------------------------------------------------
-- Notificaciones (las llenan SOLO los triggers; cada quien ve las suyas)
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id           bigint generated always as identity primary key,
  recipient_id uuid not null references members(id) on delete cascade,
  item_id      bigint,          -- sin FK: el aviso se conserva aunque el ítem se elimine
  item_label   text not null,
  kind         text not null check (kind in ('asignacion', 'mencion', 'comentario', 'cambio')),
  action       text,            -- misma acción que en history (modificado, cancelado, adjunto, ...)
  field        text,
  old_value    text,
  new_value    text,            -- en comentarios y menciones: extracto del comentario
  actor_id     uuid references members(id) on delete set null,
  actor_name   text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists notifications_recipient on notifications (recipient_id, created_at desc);
create index if not exists notifications_unread on notifications (recipient_id) where read_at is null;

alter table notifications enable row level security;
drop policy if exists "cada quien ve las suyas" on notifications;
create policy "cada quien ve las suyas" on notifications for select to authenticated
  using (recipient_id = current_member_id());
drop policy if exists "cada quien marca las suyas" on notifications;
create policy "cada quien marca las suyas" on notifications for update to authenticated
  using (recipient_id = current_member_id()) with check (recipient_id = current_member_id());
drop policy if exists "cada quien borra las suyas" on notifications;
create policy "cada quien borra las suyas" on notifications for delete to authenticated
  using (recipient_id = current_member_id());

-- Visitantes: nada. Miembros: leer, borrar y solo cambiar read_at.
revoke all on notifications from anon, authenticated;
grant select, delete on notifications to authenticated;
grant update (read_at) on notifications to authenticated;

-- ---------------------------------------------------------------------
-- Funciones de apoyo
-- ---------------------------------------------------------------------

-- Responsable, creador y seguidores de un ítem
create or replace function item_followers(p_item bigint) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select assignee_id as x from work_items where id = p_item
    union select created_by from work_items where id = p_item
    union select member_id from item_watchers where item_id = p_item
  ) s where x is not null;
$$;

-- Inserta un aviso por destinatario activo, sin repetir y sin avisar al autor
create or replace function notify_members(
  p_recipients uuid[], p_item_id bigint, p_label text, p_kind text, p_action text,
  p_field text, p_old text, p_new text, p_actor uuid, p_actor_name text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('teamtrack.sin_avisos', true), '') = 'on' then return; end if;
  insert into notifications (recipient_id, item_id, item_label, kind, action, field, old_value, new_value, actor_id, actor_name)
  select r, p_item_id, coalesce(p_label, '#' || p_item_id), p_kind, p_action, p_field, p_old, p_new,
         p_actor, coalesce(p_actor_name, 'Sistema')
  from (select distinct unnest(p_recipients) as r) d
  join members m on m.id = d.r and m.active
  where d.r is distinct from p_actor;
end $$;

revoke execute on function notify_members(uuid[], bigint, text, text, text, text, text, text, uuid, text) from public, anon, authenticated;
revoke execute on function item_followers(bigint) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Cambios del ítem: cada fila del historial avisa a responsable, creador y seguidores.
-- Creación, asignación y comentarios tienen su propio trigger (abajo).
-- ---------------------------------------------------------------------
create or replace function trg_history_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.item_id is null or new.action in ('creado', 'comentario') or new.field = 'asignado' then
    return new;
  end if;
  perform notify_members(item_followers(new.item_id), new.item_id, new.item_label, 'cambio',
                         new.action, new.field, new.old_value, new.new_value, new.actor_id, new.actor_name);
  return new;
end $$;

drop trigger if exists history_notify on history;
create trigger history_notify after insert on history
for each row execute function trg_history_notify();

-- ---------------------------------------------------------------------
-- Asignación: el nuevo responsable recibe "te asignó"; el anterior,
-- el creador y los seguidores reciben el cambio de responsable.
-- ---------------------------------------------------------------------
create or replace function trg_work_items_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  lbl        text := '#' || new.id || ' ' || new.title;
  v_actor    uuid := current_member_id();
  v_name     text := coalesce(member_ref(v_actor), 'Sistema');
  v_old      uuid;
begin
  if tg_op = 'UPDATE' then
    v_old := old.assignee_id;
    if new.assignee_id is not distinct from v_old then return new; end if;
  end if;

  if new.assignee_id is not null then
    perform notify_members(array[new.assignee_id], new.id, lbl, 'asignacion',
                           case when tg_op = 'INSERT' then 'creado' else 'modificado' end, 'asignado',
                           member_ref(v_old), member_ref(new.assignee_id), v_actor, v_name);
  end if;

  if tg_op = 'UPDATE' then
    perform notify_members(array_remove(array_append(item_followers(new.id), v_old), new.assignee_id),
                           new.id, lbl, 'cambio', 'modificado', 'asignado',
                           member_ref(v_old), member_ref(new.assignee_id), v_actor, v_name);
  end if;
  return new;
end $$;

drop trigger if exists work_items_notify on work_items;
create trigger work_items_notify after insert or update of assignee_id on work_items
for each row execute function trg_work_items_notify();

-- ---------------------------------------------------------------------
-- Comentarios: menciones + aviso a responsable, creador y seguidores.
-- Quien comenta pasa a seguir el ítem.
-- ---------------------------------------------------------------------
create or replace function trg_comments_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  lbl       text := item_ref(new.item_id);
  v_name    text := coalesce(member_ref(new.author_id), 'Sistema');
  v_excerpt text := left(coalesce(nullif(trim(new.body), ''),
                     concat_ws(' · ', new.repository, new.branch, new.commit_url, new.pr_url)), 200);
  v_ment    uuid[];
begin
  if new.author_id is not null then
    insert into item_watchers (item_id, member_id) values (new.item_id, new.author_id)
    on conflict do nothing;
  end if;

  select coalesce(array_agg(id), '{}') into v_ment
  from members where id = any(coalesce(new.mentions, '{}')) and active;

  perform notify_members(v_ment, new.item_id, lbl, 'mencion', 'comentario', 'comentario',
                         null, v_excerpt, new.author_id, v_name);

  -- Los mencionados ya recibieron su aviso: no se les duplica
  perform notify_members(array(select unnest(item_followers(new.item_id)) except select unnest(v_ment)),
                         new.item_id, lbl, 'comentario', 'comentario', 'comentario',
                         null, v_excerpt, new.author_id, v_name);
  return new;
end $$;

drop trigger if exists comments_notify on comments;
create trigger comments_notify after insert on comments
for each row execute function trg_comments_notify();

-- ---------------------------------------------------------------------
-- Tiempo real: la campana se actualiza sola (respeta RLS: cada quien recibe las suyas)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table notifications;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'item_watchers') then
    alter publication supabase_realtime add table item_watchers;
  end if;
end $$;

commit;
