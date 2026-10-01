-- =====================================================================
--  TeamTrack — Deshace notificaciones.sql
--  Borra avisos, seguidores y menciones guardadas. El resto queda intacto.
--  Antes de correrlo, vuelve a desplegar la versión del frontend sin notificaciones.
-- =====================================================================

begin;

drop trigger if exists comments_notify   on comments;
drop trigger if exists work_items_notify on work_items;
drop trigger if exists history_notify    on history;

drop function if exists trg_comments_notify();
drop function if exists trg_work_items_notify();
drop function if exists trg_history_notify();
drop function if exists notify_members(uuid[], bigint, text, text, text, text, text, text, uuid, text);
drop function if exists item_followers(bigint);

drop table if exists notifications;   -- también la quita de supabase_realtime
drop table if exists item_watchers;

alter table comments drop column if exists mentions;

commit;
