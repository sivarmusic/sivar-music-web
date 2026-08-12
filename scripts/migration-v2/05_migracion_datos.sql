-- ============================================================================
-- FASE 5 — Migración de datos
-- ============================================================================
-- Correr DESPUÉS de 04_schema.sql, 06_funciones_triggers.sql, 08_indices.sql,
-- 09_constraints.sql y 10_rls.sql (necesita que roles/permissions ya estén
-- seedeados y que existan todas las tablas destino).
--
-- Todo en UNA transacción: si algo falla a mitad de camino, se revierte
-- completo y ninguna tabla vieja se ve afectada (esto es solo INSERT hacia
-- las tablas nuevas).
--
-- Reutiliza los UUID originales como PK en todas las tablas 1:1 — crítico
-- para no invalidar QR ya impresos/enviados ni códigos de orden ya
-- comunicados por email.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. profiles — TODOS los auth.users, no solo los que ya tenían fila en
--    attendee_profiles o artist_profiles (un admin/verificador puede no
--    tener ninguna de las dos y necesita su fila igual).
-- ----------------------------------------------------------------------------
insert into public.profiles (id, nombre, telefono, onboarding_completed_at, created_at)
select
  u.id,
  coalesce(ap.nombre, art.nombre_artistico),
  ap.telefono,
  ap.onboarding_completed_at,
  u.created_at
from auth.users u
left join attendee_profiles ap on ap.id = u.id
left join artist_profiles art on art.id = u.id
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 1b. user_roles — migra admin/verificador desde auth.users.raw_app_meta_data
--     (fuente actual de roles) hacia la tabla real. Requiere que roles/
--     permissions ya estén seedeados por 10_rls.sql — por eso el orden de
--     EJECUCIÓN real es 10 antes que 05, aunque el número de fase diga lo
--     contrario (ver aclaración en el mensaje de la Fase 10).
-- ----------------------------------------------------------------------------
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from auth.users u
join public.roles r on r.slug = u.raw_app_meta_data->>'role'
where u.raw_app_meta_data->>'role' in ('admin', 'verificador')
on conflict do nothing;

-- El backdoor por email (lib/constants.ts ADMIN_EMAIL) le daba admin a esta
-- cuenta puntual sin pasar por app_metadata — se asegura explícitamente acá
-- para no perder ese acceso al cortar sobre el sistema de roles real.
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from auth.users u
join public.roles r on r.slug = 'admin'
where lower(u.email) = lower('admin@sivarmusic.com')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 2. genres — extrae valores distintos de dos fuentes de texto libre:
--    artist_profiles.genero (un valor) y attendee_profiles.generos_favoritos
--    (array). Esto es lo que corrige la inconsistencia de escritura
--    ("Reggaetón" vs "reggaeton") detectada en la segunda revisión.
-- ----------------------------------------------------------------------------
insert into public.genres (nombre)
select distinct trim(g)
from (
  select genero as g from artist_profiles where genero is not null and trim(genero) <> ''
  union
  select unnest(generos_favoritos) as g from attendee_profiles where generos_favoritos is not null
) src
where trim(g) <> ''
on conflict (nombre) do nothing;

-- ----------------------------------------------------------------------------
-- 3. artist_details
-- ----------------------------------------------------------------------------
insert into public.artist_details (
  profile_id, slug, nombre_artistico, bio, foto_url,
  instagram, spotify, tiktok, youtube, apple_music, otro_link, created_at
)
select
  id, slug, nombre_artistico, bio, foto_url,
  instagram, spotify, tiktok, youtube, apple_music, otro_link, created_at
from artist_profiles
on conflict (profile_id) do nothing;

-- ----------------------------------------------------------------------------
-- 4. artist_genres — une artist_profiles.genero (texto) contra el catálogo
--    ya poblado en el paso 2.
-- ----------------------------------------------------------------------------
insert into public.artist_genres (artist_id, genre_id)
select ap.id, g.id
from artist_profiles ap
join public.genres g on g.nombre = trim(ap.genero)
where ap.genero is not null and trim(ap.genero) <> ''
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 5. profile_genre_preferences — desanida attendee_profiles.generos_favoritos
-- ----------------------------------------------------------------------------
insert into public.profile_genre_preferences (profile_id, genre_id)
select ap.id, g.id
from attendee_profiles ap
cross join lateral unnest(ap.generos_favoritos) as fav(genero)
join public.genres g on g.nombre = trim(fav.genero)
where ap.generos_favoritos is not null
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 6. artist_gallery_v2 (copia directa, sin cambios de forma)
-- ----------------------------------------------------------------------------
insert into public.artist_gallery_v2 (id, artist_id, image_url, created_at)
select id, artist_id, image_url, created_at
from artist_gallery
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 7. artist_follows_v2 — corrige artist_slug (texto libre, sin FK) a
--    artist_id real. Las filas cuyo slug no matchee ningún artist_profiles
--    quedan afuera — se cuentan en la Fase 7 (validación) para revisión
--    manual, no se inventan datos.
-- ----------------------------------------------------------------------------
insert into public.artist_follows_v2 (user_id, artist_id, created_at)
select af.user_id, ap.id, af.created_at
from artist_follows af
join artist_profiles ap on ap.slug = af.artist_slug
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 8. artist_applications_v2 — approved_profile_id es heurístico (match por
--    email contra una cuenta que además tenga artist_profiles), porque el
--    esquema viejo no guardaba esa relación explícitamente.
-- ----------------------------------------------------------------------------
insert into public.artist_applications_v2 (
  id, nombre_artistico, nombre_contacto, email, telefono, genero, bio,
  instagram, spotify, tiktok, youtube, otro_link, status, created_at, reviewed_at,
  approved_profile_id
)
select
  aa.id, aa.nombre_artistico, aa.nombre_contacto, aa.email, aa.telefono, aa.genero, aa.bio,
  aa.instagram, aa.spotify, aa.tiktok, aa.youtube, aa.otro_link, aa.status, aa.created_at, aa.reviewed_at,
  (
    select u.id
    from auth.users u
    join artist_profiles ap on ap.id = u.id
    where lower(u.email) = lower(aa.email)
    limit 1
  )
from artist_applications aa
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 9. venues — extrae venue/direccion/lat/lng distintos de events y
--    artist_events. ADVERTENCIA: esto no detecta duplicados por typo
--    ("Teatro X" vs "teatro x"); correr una revisión manual post-migración
--    si se sospecha de venues casi-idénticos.
-- ----------------------------------------------------------------------------
insert into public.venues (nombre, direccion, lat, lng)
select distinct on (nombre, direccion)
  venue as nombre, direccion, lat, lng
from (
  select venue, direccion, lat, lng, created_at from events
  union all
  select venue, direccion, lat, lng, created_at from artist_events
) src
order by nombre, direccion, created_at desc nulls last
on conflict (nombre, direccion) do nothing;

-- ----------------------------------------------------------------------------
-- 10. events_v2 desde `events` (admin, siempre con ticketing)
-- ----------------------------------------------------------------------------
insert into public.events_v2 (
  id, slug, nombre, descripcion, fecha, venue_id, imagen_url, status, created_by, created_at
)
select
  e.id, e.slug, e.nombre, e.descripcion, e.fecha,
  v.id,
  e.imagen_url,
  case when e.visible then 'published' else 'draft' end,
  null, -- el esquema viejo no guardaba quién creó el evento admin
  e.created_at
from events e
join public.venues v
  on v.nombre = e.venue and v.direccion is not distinct from e.direccion
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 11. events_v2 desde `artist_events` (submisión de artista, con aprobación)
-- ----------------------------------------------------------------------------
insert into public.events_v2 (
  id, slug, nombre, descripcion, fecha, venue_id, imagen_url, link_externo, status, created_by, created_at
)
select
  ae.id,
  -- artist_events nunca tuvo slug propio: se genera uno determinístico
  lower(regexp_replace(trim(ae.nombre), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(ae.id::text, 1, 8),
  ae.nombre, ae.descripcion, ae.fecha,
  v.id,
  ae.imagen_url,
  ae.link_externo,
  case ae.status
    when 'aprobado' then 'published'
    when 'rechazado' then 'rejected'
    else 'pending_approval'
  end,
  ae.artist_id,
  ae.created_at
from artist_events ae
join public.venues v
  on v.nombre = ae.venue and v.direccion is not distinct from ae.direccion
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 12. event_ticketing desde `events` — el viejo `events.precio` siempre
--     tenía valor (default 10), así que TODO evento admin tiene ticketing.
-- ----------------------------------------------------------------------------
insert into public.event_ticketing (event_id, precio, max_entradas, created_at)
select id, precio, max_entradas, created_at
from events
on conflict (event_id) do nothing;

-- ----------------------------------------------------------------------------
-- 13. event_ticketing desde `artist_events` — SOLO si de verdad tenía
--     precio/max_entradas cargado (la mayoría son informativos, sin ticketing).
-- ----------------------------------------------------------------------------
insert into public.event_ticketing (event_id, precio, max_entradas, created_at)
select id, coalesce(precio, 10), max_entradas, created_at
from artist_events
where precio is not null or max_entradas is not null
on conflict (event_id) do nothing;

-- ----------------------------------------------------------------------------
-- 14. event_lineup desde `events.artistas` (text[]) — intenta matchear cada
--     nombre contra un artista registrado; si no matchea, artist_id queda
--     NULL pero display_name preserva el texto original (no se pierde nada).
-- ----------------------------------------------------------------------------
insert into public.event_lineup (event_id, artist_id, display_name, orden, created_at)
select
  e.id,
  ap.id,
  a.artista,
  a.orden::smallint,
  e.created_at
from events e
cross join lateral unnest(e.artistas) with ordinality as a(artista, orden)
left join artist_profiles ap on lower(trim(ap.nombre_artistico)) = lower(trim(a.artista))
where e.artistas is not null and array_length(e.artistas, 1) > 0;

-- ----------------------------------------------------------------------------
-- 15. event_lineup desde `artist_events` — el propio artista es el único
--     performer de su evento informativo.
-- ----------------------------------------------------------------------------
insert into public.event_lineup (event_id, artist_id, display_name, orden, created_at)
select ae.id, ae.artist_id, null, 0, ae.created_at
from artist_events ae;

-- ----------------------------------------------------------------------------
-- 16. Pink Fest — NUNCA fue un evento real en el esquema viejo (vivía en
--     tablas aparte). Se sintetiza UNA fila de venue + evento acá para
--     poder unificar sus órdenes/entradas/visitas bajo el modelo único.
--
--     ⚠️ fecha queda en NOW() como placeholder — el sistema viejo jamás
--     guardó una fecha real de Pink Fest. Corregir a mano desde el panel de
--     admin apenas termine la migración, ANTES de confiar en el evento para
--     ordenar/mostrar por fecha.
-- ----------------------------------------------------------------------------
with pf_settings as (
  select * from pinkfest_settings where id = 1
),
pf_venue as (
  insert into public.venues (nombre, direccion)
  select coalesce((select venue from pf_settings), 'Pink Fest'), null
  on conflict (nombre, direccion) do nothing
  returning id
)
insert into public.events_v2 (slug, nombre, descripcion, fecha, venue_id, imagen_url, status, created_by)
select
  'pink-fest',
  'Pink Fest',
  (select descripcion from pf_settings),
  now(), -- PLACEHOLDER, ver advertencia arriba
  coalesce(
    (select id from pf_venue),
    (select id from public.venues
      where nombre = coalesce((select venue from pf_settings), 'Pink Fest')
        and direccion is null
      limit 1)
  ),
  (select imagen_url from pf_settings),
  'published',
  null
where not exists (select 1 from public.events_v2 where slug = 'pink-fest');

-- ----------------------------------------------------------------------------
-- 17. orders desde `event_orders` (ya tenía event_id propio)
-- ----------------------------------------------------------------------------
insert into public.orders (
  id, event_id, user_id, order_code, nombre, telefono, email, cantidad, status,
  order_type, cortesia_categoria, comprobante_path, rechazo_motivo, reminder_sent_at,
  created_at, updated_at
)
select
  id, event_id, user_id, order_code, nombre, telefono, email, cantidad, status,
  order_type, cortesia_categoria, comprobante_path, rechazo_motivo, reminder_sent_at,
  created_at, updated_at
from event_orders
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 18. orders desde `pinkfest_orders` (event_id = el Pink Fest sintetizado
--     en el paso 16; nunca tuvo user_id, siempre fue checkout de invitado)
-- ----------------------------------------------------------------------------
insert into public.orders (
  id, event_id, user_id, order_code, nombre, telefono, email, cantidad, status,
  order_type, cortesia_categoria, comprobante_path, rechazo_motivo, reminder_sent_at,
  created_at, updated_at
)
select
  po.id,
  (select id from public.events_v2 where slug = 'pink-fest'),
  null,
  po.order_code, po.nombre, po.telefono, po.email, po.cantidad, po.status,
  po.order_type, po.cortesia_categoria, po.comprobante_path, po.rechazo_motivo, po.reminder_sent_at,
  po.created_at, po.updated_at
from pinkfest_orders po
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 19-20. tickets desde `event_tickets` + `pinkfest_tickets`
-- ----------------------------------------------------------------------------
insert into public.tickets (id, order_id, order_code, ticket_number, qr_token, check_in_at, created_at)
select id, order_id, order_code, ticket_number, qr_token, check_in_at, created_at
from event_tickets
on conflict (id) do nothing;

insert into public.tickets (id, order_id, order_code, ticket_number, qr_token, check_in_at, created_at)
select id, order_id, order_code, ticket_number, qr_token, check_in_at, created_at
from pinkfest_tickets
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 21. event_visits desde `pinkfest_visits`
-- ----------------------------------------------------------------------------
insert into public.event_visits (id, event_id, ip, user_agent, visited_at, visit_date)
select
  id,
  (select id from public.events_v2 where slug = 'pink-fest'),
  ip, user_agent, visited_at, visit_date
from pinkfest_visits
on conflict (event_id, ip, visit_date) do nothing;

-- ----------------------------------------------------------------------------
-- headcounts: NO se migra. Ahora es la vista event_headcounts, calculada en
-- vivo desde tickets.check_in_at (que sí se migró en los pasos 19-20) — el
-- aforo del sistema viejo era redundante con eso, según confirmaste.
-- ----------------------------------------------------------------------------

commit;
