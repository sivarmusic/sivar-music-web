-- ============================================================================
-- FASE 11 — Limpieza final (DESTRUCTIVO, correr manualmente y a propósito)
-- ============================================================================
-- ⚠️ NO correr esto como parte del resto de la migración.
--
-- Requisitos ANTES de ejecutar este archivo:
--   1. 07_validacion.sql corrió limpio (todos los conteos cuadran, 0 filas
--      en las queries de integridad de la sección D).
--   2. La app ya está deployada leyendo/escribiendo las tablas NUEVAS.
--   3. Pasó el período de gracia acordado (mínimo 1-2 semanas) sin
--      necesidad de rollback.
--   4. Hay un backup/snapshot reciente tomado independientemente de esto.
--
-- Después de este script las tablas viejas ya no existen — el rollback deja
-- de ser posible sin restaurar desde backup.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Tablas viejas, en orden hijo -> padre para respetar FKs
-- ----------------------------------------------------------------------------
drop table if exists event_tickets;
drop table if exists event_orders;
drop table if exists artist_gallery;
drop table if exists artist_follows;
drop table if exists artist_events;
drop table if exists events;
drop table if exists attendee_profiles;
drop table if exists artist_profiles;
drop table if exists pinkfest_tickets;
drop table if exists pinkfest_orders;
drop table if exists pinkfest_visits;
drop table if exists pinkfest_settings;
drop table if exists headcounts;
drop table if exists artist_applications;

-- ----------------------------------------------------------------------------
-- 2. Secuencias y funciones viejas, ya reemplazadas en 06_funciones_triggers.sql
-- ----------------------------------------------------------------------------
drop sequence if exists event_order_seq;
drop sequence if exists pinkfest_order_seq;

drop function if exists update_event_orders_updated_at();
drop function if exists set_pinkfest_order_code();
drop function if exists update_pinkfest_updated_at();
drop function if exists update_pinkfest_settings_updated_at();
drop function if exists update_headcounts_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Ahora que el nombre viejo quedó libre, las tablas _v2 pasan a ser las
--    definitivas. Los FKs/índices/policies ya creados contra el nombre
--    _v2 se actualizan solos (Postgres los referencia por OID, no por
--    nombre) — no hace falta tocar nada más después de este rename.
-- ----------------------------------------------------------------------------
alter table artist_gallery_v2 rename to artist_gallery;
alter table artist_follows_v2 rename to artist_follows;
alter table artist_applications_v2 rename to artist_applications;
alter table events_v2 rename to events;

commit;

-- ----------------------------------------------------------------------------
-- Recordatorio: después de este script, cualquier código de la app que
-- todavía apunte a los nombres viejos de columnas/tablas (ej. el
-- "sistema aparte" de Pink Fest, o event_orders/pinkfest_orders) va a
-- romper. Confirmar que el deploy de la app nueva ya está en producción
-- ANTES de correr este archivo, no después.
-- ----------------------------------------------------------------------------
