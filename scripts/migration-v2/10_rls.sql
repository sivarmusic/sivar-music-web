-- ============================================================================
-- FASE 10 — Row Level Security
-- ============================================================================
-- Convención: toda policy de "acceso administrativo" pasa por authorize()
-- (Fase 6/7) contra un permiso concreto, nunca por un chequeo de rol
-- hardcodeado. Se seedean acá los permisos/roles mínimos porque sin esto
-- authorize() no tiene nada contra qué evaluar.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Seed de permisos y roles base (admin / verificador — los dos que existen
-- hoy). Roles futuros (Organizador, Staff, Fotógrafo, etc.) se agregan
-- después con INSERTs simples, sin tocar este script ni el código.
-- ----------------------------------------------------------------------------

insert into public.permissions (slug, descripcion) values
  ('profiles.manage',  'Ver y administrar perfiles de cualquier usuario'),
  ('roles.manage',     'Otorgar/revocar roles y administrar el catálogo de roles y permisos'),
  ('artists.manage',   'Administrar perfiles de artista de cualquier usuario'),
  ('events.manage',    'Crear, editar, aprobar, rechazar y eliminar eventos, venues y lineup'),
  ('orders.manage',    'Revisar, confirmar y rechazar órdenes'),
  ('tickets.checkin',  'Escanear y validar entradas en puerta'),
  ('catalog.manage',   'Administrar catálogos de referencia (géneros, venues)');

insert into public.roles (slug, nombre, descripcion) values
  ('admin',       'Administrador',  'Control total de la plataforma'),
  ('verificador', 'Verificador',    'Solo validación de entradas en puerta');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.slug = 'admin'; -- admin tiene todos los permisos existentes

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.slug = 'tickets.checkin'
where r.slug = 'verificador'; -- verificador solo puede hacer check-in

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.authorize('profiles.manage'));

create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.authorize('profiles.manage'));
-- Sin policy de INSERT/DELETE: la fila la crea únicamente el trigger
-- handle_new_user (SECURITY DEFINER, bypassea RLS) y se borra solo en
-- cascada desde auth.users.

-- ----------------------------------------------------------------------------
-- RBAC: catálogos de lectura pública, escritura solo admin con roles.manage
-- ----------------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

create policy "roles_read_all" on public.roles for select using (true);
create policy "roles_manage" on public.roles for all
  using (public.authorize('roles.manage')) with check (public.authorize('roles.manage'));

create policy "permissions_read_all" on public.permissions for select using (true);
create policy "permissions_manage" on public.permissions for all
  using (public.authorize('roles.manage')) with check (public.authorize('roles.manage'));

create policy "role_permissions_read_all" on public.role_permissions for select using (true);
create policy "role_permissions_manage" on public.role_permissions for all
  using (public.authorize('roles.manage')) with check (public.authorize('roles.manage'));

-- user_roles NO es de lectura pública: cada quien ve sus propios roles,
-- solo un admin con roles.manage ve/otorga/revoca los de terceros.
create policy "user_roles_select_own_or_admin" on public.user_roles
  for select using (auth.uid() = user_id or public.authorize('roles.manage'));
create policy "user_roles_manage" on public.user_roles
  for insert with check (public.authorize('roles.manage'));
create policy "user_roles_delete" on public.user_roles
  for delete using (public.authorize('roles.manage'));

-- ----------------------------------------------------------------------------
-- genres — catálogo, lectura pública, edición admin
-- ----------------------------------------------------------------------------
alter table public.genres enable row level security;
create policy "genres_read_all" on public.genres for select using (true);
create policy "genres_manage" on public.genres for all
  using (public.authorize('catalog.manage')) with check (public.authorize('catalog.manage'));

-- ----------------------------------------------------------------------------
-- artist_details / artist_genres / artist_gallery — perfil público, edición
-- propia o de admin. Presencia de fila NO otorga permisos (eso es RBAC) —
-- estas policies solo controlan quién puede LEER/ESCRIBIR el contenido.
-- ----------------------------------------------------------------------------
alter table public.artist_details enable row level security;
alter table public.artist_genres enable row level security;
alter table public.artist_gallery_v2 enable row level security;
alter table public.profile_genre_preferences enable row level security;
alter table public.artist_follows_v2 enable row level security;

create policy "artist_details_read_all" on public.artist_details for select using (true);
create policy "artist_details_manage_own_or_admin" on public.artist_details
  for all using (auth.uid() = profile_id or public.authorize('artists.manage'))
  with check (auth.uid() = profile_id or public.authorize('artists.manage'));

create policy "artist_genres_read_all" on public.artist_genres for select using (true);
create policy "artist_genres_manage_own_or_admin" on public.artist_genres
  for all using (auth.uid() = artist_id or public.authorize('artists.manage'))
  with check (auth.uid() = artist_id or public.authorize('artists.manage'));

create policy "artist_gallery_read_all" on public.artist_gallery_v2 for select using (true);
create policy "artist_gallery_manage_own_or_admin" on public.artist_gallery_v2
  for all using (auth.uid() = artist_id or public.authorize('artists.manage'))
  with check (auth.uid() = artist_id or public.authorize('artists.manage'));

-- Preferencias de género del oyente: privadas, no públicas
create policy "profile_genre_preferences_own" on public.profile_genre_preferences
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Follows: privados, igual que el esquema viejo (own_artist_follows)
create policy "artist_follows_own" on public.artist_follows_v2
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- artist_applications: sin policies (acceso solo vía service role, igual
-- que en el esquema viejo — es una bandeja de entrada, no un recurso
-- propiedad de un usuario autenticado todavía).
alter table public.artist_applications_v2 enable row level security;

-- ----------------------------------------------------------------------------
-- venues
-- ----------------------------------------------------------------------------
alter table public.venues enable row level security;
create policy "venues_read_all" on public.venues for select using (true);
create policy "venues_manage" on public.venues for all
  using (public.authorize('catalog.manage')) with check (public.authorize('catalog.manage'));

-- ----------------------------------------------------------------------------
-- events
-- ----------------------------------------------------------------------------
alter table public.events_v2 enable row level security;

create policy "events_read_published_or_owner_or_admin" on public.events_v2
  for select using (
    status = 'published'
    or auth.uid() = created_by
    or public.authorize('events.manage')
  );

-- Un no-admin solo puede crear su propio evento y SOLO en estado
-- pending_approval — no puede auto-publicarse saltando la revisión.
create policy "events_insert" on public.events_v2
  for insert with check (
    auth.uid() = created_by
    and (public.authorize('events.manage') or status = 'pending_approval')
  );

-- El creador puede seguir editando mientras no haya salido de revisión;
-- una vez publicado o rechazado, solo el admin puede tocarlo.
create policy "events_update_owner_pending_or_admin" on public.events_v2
  for update using (
    (auth.uid() = created_by and status in ('draft', 'pending_approval'))
    or public.authorize('events.manage')
  );

create policy "events_delete" on public.events_v2
  for delete using (
    (auth.uid() = created_by and status in ('draft', 'pending_approval'))
    or public.authorize('events.manage')
  );

-- ----------------------------------------------------------------------------
-- event_ticketing / event_lineup / event_collaborators / event_visits
-- ----------------------------------------------------------------------------
alter table public.event_ticketing enable row level security;
alter table public.event_lineup enable row level security;
alter table public.event_collaborators enable row level security;
alter table public.event_visits enable row level security;

create policy "event_ticketing_read_published_or_admin" on public.event_ticketing
  for select using (
    exists (select 1 from public.events_v2 e where e.id = event_id and e.status = 'published')
    or public.authorize('events.manage')
  );
create policy "event_ticketing_manage" on public.event_ticketing for all
  using (public.authorize('events.manage')) with check (public.authorize('events.manage'));

create policy "event_lineup_read_all" on public.event_lineup for select using (true);
create policy "event_lineup_manage" on public.event_lineup for all
  using (public.authorize('events.manage')) with check (public.authorize('events.manage'));

create policy "event_collaborators_select_own_or_admin" on public.event_collaborators
  for select using (auth.uid() = user_id or public.authorize('events.manage'));
create policy "event_collaborators_manage" on public.event_collaborators for all
  using (public.authorize('events.manage')) with check (public.authorize('events.manage'));

-- event_visits: sin policies de cliente, se escribe/lee vía API con service
-- role (analítica), igual que pinkfest_visits en el esquema viejo.

-- ----------------------------------------------------------------------------
-- orders / tickets
-- ----------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.tickets enable row level security;

create policy "orders_select_own_or_admin" on public.orders
  for select using (auth.uid() = user_id or public.authorize('orders.manage'));

-- Compra de invitado permitida (user_id nullable) pero nadie puede crear
-- una orden a nombre de otro usuario autenticado.
create policy "orders_insert" on public.orders
  for insert with check (user_id is null or user_id = auth.uid());

create policy "orders_update_admin_only" on public.orders
  for update using (public.authorize('orders.manage'));
-- Sin policy de DELETE: las órdenes son registro histórico/financiero.

create policy "tickets_select_owner_or_staff" on public.tickets
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
    or public.authorize('tickets.checkin')
  );

create policy "tickets_checkin_update" on public.tickets
  for update using (public.authorize('tickets.checkin'));
-- Sin policy de INSERT/DELETE: las entradas se generan server-side (service
-- role) tras confirmar el pago, nunca directamente por el cliente.

-- ----------------------------------------------------------------------------
-- event_headcounts (view): por defecto una vista corre con los privilegios
-- de quien la creó, lo que puede saltarse el RLS de tickets/orders. Con
-- security_invoker, respeta el RLS del usuario que consulta — un
-- verificador/admin (con tickets.checkin/orders.manage) ve el conteo real;
-- cualquier otro usuario solo agregaría sus propias filas visibles.
-- ----------------------------------------------------------------------------
alter view public.event_headcounts set (security_invoker = true);

commit;
