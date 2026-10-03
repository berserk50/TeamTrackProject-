-- =====================================================================
--  TeamTrack — Editar y eliminar comentarios
--  Ejecutar en: Supabase > SQL Editor > New query > Run
--
--  Es una migración ADITIVA sobre schema.sql: agrega columnas, políticas
--  y triggers nuevos. No borra nada existente. Se puede ejecutar varias
--  veces. Para deshacerla: comentarios_editar_eliminar_rollback.sql
--
--  Antes los comentarios eran inmutables (solo política INSERT) porque
--  se consideraban parte del historial. Ahora cualquier miembro activo
--  puede editar o eliminar cualquier comentario (igual que ya pasa con
--  los adjuntos); cada edición y cada eliminación quedan registradas en
--  el historial, así que no se pierde el rastro.
-- =====================================================================

begin;

alter table comments add column if not exists updated_at timestamptz;
alter table comments add column if not exists edited_by uuid references members(id) on delete set null;

-- Al editar, nadie puede cambiar a qué ítem o de quién es el comentario
create or replace function trg_comments_lock_fields() returns trigger
language plpgsql as $$
begin
  new.item_id    := old.item_id;
  new.author_id  := old.author_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.edited_by  := current_member_id();
  return new;
end $$;

drop trigger if exists comments_lock_fields on comments;
create trigger comments_lock_fields before update on comments
for each row execute function trg_comments_lock_fields();

-- Deja constancia en el historial de cada edición y cada eliminación
create or replace function trg_comments_history_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.body is distinct from old.body then
    perform log_history(new.item_id, item_ref(new.item_id), 'comentario editado', 'comentario',
      left(coalesce(old.body, ''), 300), left(coalesce(new.body, ''), 300));
  end if;
  return new;
end $$;

drop trigger if exists comments_history_update on comments;
create trigger comments_history_update after update on comments
for each row execute function trg_comments_history_update();

create or replace function trg_comments_history_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform log_history(old.item_id, item_ref(old.item_id), 'comentario eliminado', 'comentario',
    left(coalesce(old.body, ''), 300), null);
  return old;
end $$;

drop trigger if exists comments_history_delete on comments;
create trigger comments_history_delete after delete on comments
for each row execute function trg_comments_history_delete();

-- Cualquier miembro activo puede editar o eliminar cualquier comentario
drop policy if exists "miembros editan comentarios" on comments;
create policy "miembros editan comentarios" on comments for update to authenticated
  using (is_member()) with check (is_member());

drop policy if exists "miembros eliminan comentarios" on comments;
create policy "miembros eliminan comentarios" on comments for delete to authenticated
  using (is_member());

commit;
