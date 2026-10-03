-- Deshace comentarios_editar_eliminar.sql: vuelve a dejar los comentarios
-- inmutables (solo se pueden crear, no editar ni borrar).

begin;

drop policy if exists "miembros eliminan comentarios" on comments;
drop policy if exists "miembros editan comentarios" on comments;

drop trigger if exists comments_history_delete on comments;
drop function if exists trg_comments_history_delete();

drop trigger if exists comments_history_update on comments;
drop function if exists trg_comments_history_update();

drop trigger if exists comments_lock_fields on comments;
drop function if exists trg_comments_lock_fields();

alter table comments drop column if exists edited_by;
alter table comments drop column if exists updated_at;

commit;
