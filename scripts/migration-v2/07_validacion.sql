-- ============================================================================
-- FASE 7 (validación) — Solo lectura. Correr después de 05_migracion_datos.sql
-- y ANTES de tocar el código de la app o correr 11_cleanup.
-- ============================================================================
-- Cada fila debe leerse como "esperado" vs "migrado". Donde dice
-- "esperado == migrado" tiene que dar 0 de diferencia; donde se aclara que
-- puede haber delta (follows huérfanos, etc.) es esperado y se investiga
-- aparte, no bloquea el corte.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. Conteos 1:1 — cualquier diferencia acá es una señal real de que algo
--    no migró y hay que investigar antes de seguir.
-- ----------------------------------------------------------------------------
select 'profiles vs auth.users' as check_name,
  (select count(*) from auth.users) as esperado,
  (select count(*) from public.profiles) as migrado
union all
select 'artist_details vs artist_profiles',
  (select count(*) from artist_profiles),
  (select count(*) from public.artist_details)
union all
select 'artist_gallery_v2 vs artist_gallery',
  (select count(*) from artist_gallery),
  (select count(*) from public.artist_gallery_v2)
union all
select 'artist_applications_v2 vs artist_applications',
  (select count(*) from artist_applications),
  (select count(*) from public.artist_applications_v2)
union all
select 'events_v2 vs events+artist_events+pinkfest(1)',
  (select count(*) from events) + (select count(*) from artist_events) + 1,
  (select count(*) from public.events_v2)
union all
select 'orders vs event_orders+pinkfest_orders',
  (select count(*) from event_orders) + (select count(*) from pinkfest_orders),
  (select count(*) from public.orders)
union all
select 'tickets vs event_tickets+pinkfest_tickets',
  (select count(*) from event_tickets) + (select count(*) from pinkfest_tickets),
  (select count(*) from public.tickets)
union all
select 'event_visits vs pinkfest_visits',
  (select count(*) from pinkfest_visits),
  (select count(*) from public.event_visits);

-- ----------------------------------------------------------------------------
-- B. Conteos con delta esperable — reportan el hueco para revisión manual,
--    no representan un bug del script.
-- ----------------------------------------------------------------------------
select 'artist_follows_v2 vs artist_follows (delta = slugs huérfanos)' as check_name,
  (select count(*) from artist_follows) as viejo,
  (select count(*) from public.artist_follows_v2) as migrado,
  (select count(*) from artist_follows) - (select count(*) from public.artist_follows_v2) as huerfanos;

-- Follows que NO migraron, para revisar a mano cuáles artistas cambiaron de slug
select af.user_id, af.artist_slug, af.created_at
from artist_follows af
left join artist_profiles ap on ap.slug = af.artist_slug
where ap.id is null;

-- ----------------------------------------------------------------------------
-- C. Sumas agregadas — deben coincidir EXACTO. Si no coinciden, hay
--    filas que se migraron con valores distintos (no solo faltantes).
-- ----------------------------------------------------------------------------
select 'suma cantidad ordenes' as check_name,
  (
    (select coalesce(sum(cantidad), 0) from event_orders) +
    (select coalesce(sum(cantidad), 0) from pinkfest_orders)
  ) as esperado,
  (select coalesce(sum(cantidad), 0) from public.orders) as migrado
union all
select 'tickets con check-in',
  (
    (select count(*) from event_tickets where check_in_at is not null) +
    (select count(*) from pinkfest_tickets where check_in_at is not null)
  ),
  (select count(*) from public.tickets where check_in_at is not null);

-- ----------------------------------------------------------------------------
-- D. Integridad referencial — TIENEN que devolver 0 filas.
-- ----------------------------------------------------------------------------

-- Eventos sin ticketing que sí tienen órdenes (no debería ser posible)
select o.id as order_id, o.event_id
from public.orders o
left join public.event_ticketing et on et.event_id = o.event_id
where et.event_id is null;

-- Tickets sin orden válida
select t.id as ticket_id
from public.tickets t
left join public.orders o on o.id = t.order_id
where o.id is null;

-- event_lineup sin display_name NI artist_id (violaría el CHECK, pero se
-- verifica igual como red de seguridad)
select *
from public.event_lineup
where artist_id is null and display_name is null;

-- Eventos migrados de `events`/`artist_events` que quedaron sin venue
-- (indicaría que el join por nombre+dirección no encontró match — no
-- debería pasar nunca, ya que venues se derivó de las mismas filas)
select e.id, e.nombre
from events e
left join public.events_v2 ev2 on ev2.id = e.id
where ev2.id is null
union all
select ae.id, ae.nombre
from artist_events ae
left join public.events_v2 ev2 on ev2.id = ae.id
where ev2.id is null;

-- ----------------------------------------------------------------------------
-- E. Recordatorio manual — no es una query de validación, es un chequeo
--    de que alguien corrigió el placeholder de la Fase 5.
-- ----------------------------------------------------------------------------
select 'Pink Fest: confirmar que la fecha ya NO es el placeholder de la migración' as recordatorio,
  fecha
from public.events_v2
where slug = 'pink-fest';
