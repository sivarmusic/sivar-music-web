-- ============================================================================
-- FASE 4 — Nueva estructura de base de datos (sivar-music-web)
-- ============================================================================
-- Crea TODAS las tablas nuevas. No toca ni una sola tabla vieja.
-- Reversible sin riesgo: si algo falla acá, se dropean estos objetos nuevos
-- (vacíos todavía) y la app sigue funcionando exactamente igual sobre el
-- esquema viejo.
--
-- Orden de creación respeta dependencias de FK (no se puede referenciar una
-- tabla que todavía no existe).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Identidad de negocio (extiende auth.users)
-- ----------------------------------------------------------------------------

create table profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  nombre                   text,
  telefono                 text,
  onboarding_completed_at  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
comment on table profiles is 'Extensión 1:1 de auth.users con datos de negocio. Todo usuario autenticado tiene una fila acá (ver trigger handle_new_user).';

-- ----------------------------------------------------------------------------
-- RBAC — roles y permisos administrables sin tocar código
-- ----------------------------------------------------------------------------

create table roles (
  id           smallserial primary key,
  slug         text not null unique,
  nombre       text not null,
  descripcion  text,
  created_at   timestamptz not null default now()
);
comment on table roles is 'Catálogo de roles. Alta de un rol nuevo = un INSERT, sin deploy.';

create table permissions (
  id           smallserial primary key,
  slug         text not null unique, -- convención "recurso.accion", ej. events.approve
  descripcion  text,
  created_at   timestamptz not null default now()
);
comment on table permissions is 'Catálogo de permisos atómicos, referenciados por slug desde authorize().';

create table role_permissions (
  role_id        smallint not null references roles(id) on delete cascade,
  permission_id  smallint not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);
comment on table role_permissions is 'Qué permisos otorga cada rol.';

create table user_roles (
  user_id     uuid not null references auth.users(id) on delete cascade,
  role_id     smallint not null references roles(id) on delete cascade,
  granted_by  uuid references auth.users(id) on delete set null,
  granted_at  timestamptz not null default now(),
  primary key (user_id, role_id)
);
comment on table user_roles is 'Roles otorgados por usuario. Un usuario puede tener varias filas = varios roles simultáneos.';

-- ----------------------------------------------------------------------------
-- Catálogo de géneros musicales (normaliza texto libre repetido)
-- ----------------------------------------------------------------------------

create table genres (
  id          smallserial primary key,
  nombre      text not null unique,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Artistas — extensión 1:1 de profiles, solo datos exclusivos de artista.
-- Tener una fila acá NO es el mecanismo de autorización (eso es user_roles).
-- ----------------------------------------------------------------------------

create table artist_details (
  profile_id       uuid primary key references profiles(id) on delete cascade,
  slug             text not null unique,
  nombre_artistico text not null,
  bio              text,
  foto_url         text,
  instagram        text,
  spotify          text,
  tiktok           text,
  youtube          text,
  apple_music      text,
  otro_link        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table artist_details is 'Datos exclusivos de perfil de artista. La existencia de la fila no determina permisos — eso lo decide user_roles.';

create table profile_genre_preferences (
  profile_id  uuid not null references profiles(id) on delete cascade,
  genre_id    smallint not null references genres(id) on delete cascade,
  primary key (profile_id, genre_id)
);

create table artist_genres (
  artist_id  uuid not null references artist_details(profile_id) on delete cascade,
  genre_id   smallint not null references genres(id) on delete cascade,
  primary key (artist_id, genre_id)
);

-- NOTA: sufijo _v2 en esta tabla y en artist_follows/artist_applications/events
-- porque el esquema viejo YA tiene una tabla con ese nombre exacto — no se
-- puede crear otra igual mientras conviven ambas (fase aditiva). En la
-- Fase 11 se dropea la vieja y esta se renombra al nombre final.
create table artist_gallery_v2 (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references artist_details(profile_id) on delete cascade,
  image_url   text not null,
  created_at  timestamptz not null default now()
);

create table artist_follows_v2 (
  user_id     uuid not null references profiles(id) on delete cascade,
  artist_id   uuid not null references artist_details(profile_id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, artist_id)
);

create table artist_applications_v2 (
  id                    uuid primary key default gen_random_uuid(),
  nombre_artistico      text not null,
  nombre_contacto       text not null,
  email                 text not null,
  telefono              text,
  genero                text, -- snapshot libre al momento de la solicitud; no hay cuenta todavía para relacionar con genres
  bio                   text,
  instagram             text,
  spotify               text,
  tiktok                text,
  youtube               text,
  otro_link             text,
  status                text not null default 'pendiente' check (status in ('pendiente','aprobado','rechazado')),
  approved_profile_id   uuid references profiles(id) on delete set null,
  reviewed_by           uuid references auth.users(id) on delete set null,
  reviewed_at           timestamptz,
  created_at            timestamptz not null default now()
);
comment on column artist_applications_v2.approved_profile_id is 'Traza qué cuenta se creó a partir de esta solicitud, una vez aprobada.';

-- ----------------------------------------------------------------------------
-- Eventos — entidad única (fusiona events + artist_events del esquema viejo)
-- ----------------------------------------------------------------------------

create table venues (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  direccion   text, -- nullable: Pink Fest nunca tuvo una dirección estructurada, solo un campo "venue" libre
  lat         numeric(10,7),
  lng         numeric(10,7),
  created_at  timestamptz not null default now(),
  unique (nombre, direccion)
);
comment on table venues is 'Normaliza venue/dirección/coordenadas, antes duplicado en cada fila de evento.';

create table events_v2 (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  nombre            text not null,
  descripcion       text,
  fecha             timestamptz not null,
  venue_id          uuid not null references venues(id) on delete restrict,
  imagen_url        text,
  link_externo      text, -- ej. link de venta externa o página propia del artista (heredado de artist_events)
  status            text not null default 'draft' check (status in ('draft','pending_approval','published','rejected')),
  created_by        uuid references auth.users(id) on delete set null,
  reviewed_by       uuid references auth.users(id) on delete set null,
  reviewed_at       timestamptz,
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table events_v2 is 'Entidad única de evento. Ticketing es opcional (ver event_ticketing) — no todo evento vende entradas.';

create table event_ticketing (
  event_id      uuid primary key references events_v2(id) on delete cascade,
  precio        numeric(10,2) not null default 10,
  max_entradas  integer check (max_entradas is null or max_entradas > 0),
  created_at    timestamptz not null default now()
);
comment on table event_ticketing is 'Extensión 1:1 opcional. Su existencia = "este evento vende entradas".';

create table event_lineup (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events_v2(id) on delete cascade,
  artist_id     uuid references artist_details(profile_id) on delete set null,
  display_name  text,
  orden         smallint not null default 0,
  created_at    timestamptz not null default now(),
  check (artist_id is not null or display_name is not null),
  unique (event_id, artist_id)
);
comment on table event_lineup is 'Reemplaza events.artistas text[]. artist_id nullable para artistas invitados sin cuenta en la plataforma.';

create table event_collaborators (
  event_id    uuid not null references events_v2(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role_id     smallint not null references roles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id, role_id)
);
comment on table event_collaborators is 'Equipo de trabajo asignado a UN evento puntual (distinto del rol global en user_roles).';

create table event_visits (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events_v2(id) on delete cascade,
  ip          text not null,
  user_agent  text,
  visited_at  timestamptz not null default now(),
  visit_date  date not null default current_date,
  unique (event_id, ip, visit_date)
);

-- ----------------------------------------------------------------------------
-- Comercio — órdenes y entradas (fusiona event_orders + pinkfest_orders,
-- event_tickets + pinkfest_tickets)
-- ----------------------------------------------------------------------------

create sequence order_code_seq start 1;

create table orders (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references events_v2(id) on delete restrict,
  user_id             uuid references auth.users(id) on delete set null,
  order_code          text not null unique,
  nombre              text not null,
  telefono            text,
  email               text,
  cantidad            integer not null default 1 check (cantidad between 1 and 20),
  status              text not null default 'pendiente_comprobante'
                        check (status in ('pendiente_comprobante','en_revision','confirmado','rechazado')),
  order_type          text not null default 'compra' check (order_type in ('compra','cortesia')),
  cortesia_categoria  text check (cortesia_categoria in ('staff','organizacion','vip','musicos')),
  comprobante_path    text,
  rechazo_motivo      text,
  reminder_sent_at    timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on table orders is 'event_id siempre NOT NULL — Pink Fest deja de ser un sistema aparte, es una fila más de events.';

create table tickets (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  order_code     text not null,
  ticket_number  integer not null,
  qr_token       text not null unique,
  check_in_at    timestamptz,
  created_at     timestamptz not null default now(),
  unique (order_id, ticket_number)
);

-- ----------------------------------------------------------------------------
-- event_headcounts como VIEW, no tabla: el aforo se deriva de check-ins reales
-- de tickets, no se mantiene como contador separado (evita el mismo tipo de
-- duplicación que estamos eliminando en todo el resto del modelo).
-- ----------------------------------------------------------------------------

create view event_headcounts as
select
  o.event_id,
  count(*) as checked_in_count
from tickets t
join orders o on o.id = t.order_id
where t.check_in_at is not null
group by o.event_id;

commit;
