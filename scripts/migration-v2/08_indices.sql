-- ============================================================================
-- FASE 8 — Índices
-- ============================================================================
-- Los UNIQUE/PK ya declarados en 04_schema.sql crean su índice automáticamente
-- (ej. events.slug, orders.order_code, tickets.qr_token). Acá solo van los
-- índices que NO surgen implícitamente de una constraint — cada uno con su
-- motivo. Se corre con las tablas nuevas todavía vacías, por eso no hace
-- falta CONCURRENTLY (solo importaría si se agregaran a tablas ya grandes).
-- ============================================================================

begin;

-- RBAC: lookups inversos que la PK compuesta no cubre
-- (role_permissions/user_roles ya indexan su primera columna vía la PK)
create index idx_role_permissions_permission on public.role_permissions (permission_id);
create index idx_user_roles_role on public.user_roles (role_id);

-- artist_details: reverse lookups (tablas _v2, ver nota en 04_schema.sql)
create index idx_artist_gallery_artist on public.artist_gallery_v2 (artist_id);
create index idx_artist_follows_artist on public.artist_follows_v2 (artist_id); -- contador de seguidores por artista
create index idx_artist_genres_genre on public.artist_genres (genre_id);        -- "artistas de este género"

-- artist_applications: cola de revisión del admin
create index idx_artist_applications_status on public.artist_applications_v2 (status);

-- events: los queries públicos más frecuentes son "eventos publicados
-- ordenados por fecha" — índice parcial porque ese es el subconjunto que
-- realmente se lee en el 90% de los casos.
create index idx_events_published_fecha on public.events_v2 (fecha)
  where status = 'published';
create index idx_events_venue on public.events_v2 (venue_id);
create index idx_events_created_by on public.events_v2 (created_by);

-- event_lineup: página de evento (lineup) y dashboard de artista (próximos shows)
create index idx_event_lineup_artist on public.event_lineup (artist_id);

-- event_collaborators: "en qué eventos trabaja este usuario"
create index idx_event_collaborators_user on public.event_collaborators (user_id);

-- orders: FKs de alta cardinalidad, Postgres no las indexa solo
create index idx_orders_event on public.orders (event_id);
create index idx_orders_user on public.orders (user_id);

-- una reserva activa por teléfono por evento (idéntico al esquema viejo,
-- ahora unificado en una sola tabla en vez de repetido en event_orders y
-- pinkfest_orders)
create unique index idx_orders_telefono_activo on public.orders (event_id, telefono)
  where status in ('pendiente_comprobante', 'en_revision');

-- tickets: fetch de entradas por orden, y el índice parcial que hace rápida
-- la vista event_headcounts (Fase 4) al agregar solo los check-ins reales
create index idx_tickets_order on public.tickets (order_id);
create index idx_tickets_checked_in on public.tickets (check_in_at)
  where check_in_at is not null;

commit;
