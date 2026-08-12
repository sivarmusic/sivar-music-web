-- ============================================================
-- Voces — esquema consolidado (portal de casting/talentos)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- Idempotente: seguro de correr más de una vez.
-- ============================================================

-- ===== voces_clients =====
-- Clientes/usuarios de la plataforma (login con bcrypt, admin via is_admin).
CREATE TABLE IF NOT EXISTS voces_clients (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_voces_clients_email ON voces_clients (lower(email));

ALTER TABLE voces_clients ENABLE ROW LEVEL SECURITY;

-- ===== voces_talents =====
-- Locutores. Reconstruida desde el uso real en app/api/registro y
-- app/api/admin/locutores del original (no había CREATE TABLE dedicado —
-- se creó a mano en el dashboard de Supabase). No incluye legacy_hash_id
-- (era para la sincronización con Google Sheets, que se elimina).
CREATE TABLE IF NOT EXISTS voces_talents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  full_name        TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  country          TEXT,
  gender           TEXT,

  languages        TEXT[],
  styles           TEXT[],
  ages             TEXT[],

  visible          BOOLEAN NOT NULL DEFAULT FALSE,

  home_studio      BOOLEAN NOT NULL DEFAULT FALSE,
  online_sessions  BOOLEAN NOT NULL DEFAULT FALSE,
  social_url       TEXT,
  studio_equipment TEXT,
  real_age         INTEGER,
  is_singer        BOOLEAN NOT NULL DEFAULT FALSE,

  -- Id numérico corto para mostrar en el panel de admin.
  code             INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1001) UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_voces_talents_email   ON voces_talents (lower(email));
CREATE INDEX IF NOT EXISTS idx_voces_talents_visible ON voces_talents (visible);

ALTER TABLE voces_talents ENABLE ROW LEVEL SECURITY;

-- ===== voces_talent_media =====
CREATE TABLE IF NOT EXISTS voces_talent_media (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id  UUID NOT NULL REFERENCES voces_talents(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,   -- 'voice_demo', 'voice_demo_2', 'singer_demo', 'photo'
  url        TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voces_talent_media_talent_id ON voces_talent_media (talent_id);

ALTER TABLE voces_talent_media ENABLE ROW LEVEL SECURITY;

-- ===== voces_cantantes =====
-- Tabla separada para cantantes (distinta de los locutores en voces_talents).
CREATE TABLE IF NOT EXISTS voces_cantantes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  full_name  TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  country    TEXT,

  languages  TEXT[],          -- idiomas / acentos
  styles     TEXT[],          -- categoría (Cantante, Cantante Tango, etc.)
  notes      TEXT,            -- comentarios de voz (JAZZ, SOUL, CLASE A, etc.)
  gender     TEXT,
  voice_type TEXT,            -- Soprano, Mezzosoprano, Contralto, Tenor, Barítono, Bajo

  visible    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_voces_cantantes_full_name ON voces_cantantes (full_name);
CREATE INDEX IF NOT EXISTS idx_voces_cantantes_visible   ON voces_cantantes (visible);

ALTER TABLE voces_cantantes ENABLE ROW LEVEL SECURITY;

-- ===== voces_cantante_media =====
CREATE TABLE IF NOT EXISTS voces_cantante_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantante_id UUID NOT NULL REFERENCES voces_cantantes(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,   -- 'voice_demo', 'photo', 'music_demo'
  url         TEXT NOT NULL,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_voces_cantante_media_unique
  ON voces_cantante_media (cantante_id, kind, url);
CREATE INDEX IF NOT EXISTS idx_voces_cantante_media_cantante_id
  ON voces_cantante_media (cantante_id);

ALTER TABLE voces_cantante_media ENABLE ROW LEVEL SECURITY;

-- ===== voces_castings =====
-- Castings de locutores.
CREATE TABLE IF NOT EXISTS voces_castings (
  id            TEXT PRIMARY KEY,
  title         TEXT,
  brief         TEXT,
  video_url     TEXT,
  script_url    TEXT,
  reference_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  share_id      TEXT NOT NULL UNIQUE,
  criteria      JSONB,
  deadline      TIMESTAMPTZ,

  budget        NUMERIC,
  currency      TEXT,                    -- 'ARS' | 'USD'
  status        TEXT DEFAULT 'open',     -- open | in_selection | closed | finished
  client        TEXT,
  media_type    TEXT                     -- TV | Digital | Radio | TV+Digital | Otro
);

CREATE INDEX IF NOT EXISTS idx_voces_castings_share_id ON voces_castings (share_id);
CREATE INDEX IF NOT EXISTS idx_voces_castings_status   ON voces_castings (status);
CREATE INDEX IF NOT EXISTS idx_voces_castings_client   ON voces_castings (client);

-- Fix: la tabla original de BDS tenía esta columna creada a mano en el
-- dashboard (sin script), se nos había pasado al reconstruir el esquema.
-- ADD COLUMN IF NOT EXISTS para no romper si ya corriste este script antes.
ALTER TABLE voces_castings ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

ALTER TABLE voces_castings ENABLE ROW LEVEL SECURITY;

-- ===== voces_casting_applications =====
-- Postulaciones a castings de locutores.
CREATE TABLE IF NOT EXISTS voces_casting_applications (
  id                   TEXT PRIMARY KEY,
  casting_id           TEXT NOT NULL REFERENCES voces_castings(id) ON DELETE CASCADE,
  share_id             TEXT NOT NULL,
  first_name           TEXT NOT NULL,
  last_name            TEXT NOT NULL,
  phone                TEXT,
  email                TEXT,
  country              TEXT,
  gender               TEXT,
  home_studio          BOOLEAN NOT NULL DEFAULT FALSE,
  online_sessions      BOOLEAN NOT NULL DEFAULT FALSE,
  audio_url            TEXT,
  audio_link_original  TEXT,
  selected             BOOLEAN NOT NULL DEFAULT FALSE,
  selected_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voces_casting_apps_casting_id ON voces_casting_applications (casting_id);
CREATE INDEX IF NOT EXISTS idx_voces_casting_apps_share_id   ON voces_casting_applications (share_id);
CREATE INDEX IF NOT EXISTS idx_voces_casting_apps_email      ON voces_casting_applications (share_id, email);

ALTER TABLE voces_casting_applications ENABLE ROW LEVEL SECURITY;

-- ===== voces_castings_cantantes =====
-- Castings de cantantes (análogo a voces_castings).
CREATE TABLE IF NOT EXISTS voces_castings_cantantes (
  id            TEXT PRIMARY KEY,
  title         TEXT,
  brief         TEXT,
  video_url     TEXT,
  script_url    TEXT,
  reference_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  share_id      TEXT NOT NULL UNIQUE,
  criteria      JSONB,          -- { styles, country, gender, vocalRange }
  deadline      TIMESTAMPTZ,

  budget        NUMERIC,
  currency      TEXT,
  status        TEXT DEFAULT 'open',
  client        TEXT,
  media_type    TEXT,
  attachments   JSONB           -- [{ label, url }]
);

CREATE INDEX IF NOT EXISTS idx_voces_castings_cantantes_share_id ON voces_castings_cantantes (share_id);
CREATE INDEX IF NOT EXISTS idx_voces_castings_cantantes_status   ON voces_castings_cantantes (status);
CREATE INDEX IF NOT EXISTS idx_voces_castings_cantantes_client   ON voces_castings_cantantes (client);

ALTER TABLE voces_castings_cantantes ENABLE ROW LEVEL SECURITY;

-- ===== voces_casting_cantante_applications =====
-- Postulaciones a castings de cantantes (análogo a voces_casting_applications).
CREATE TABLE IF NOT EXISTS voces_casting_cantante_applications (
  id                   TEXT PRIMARY KEY,
  casting_id           TEXT NOT NULL REFERENCES voces_castings_cantantes(id) ON DELETE CASCADE,
  share_id             TEXT NOT NULL,
  first_name           TEXT NOT NULL,
  last_name            TEXT NOT NULL,
  phone                TEXT,
  email                TEXT,
  country              TEXT,
  gender               TEXT,
  home_studio          BOOLEAN NOT NULL DEFAULT FALSE,
  online_sessions      BOOLEAN NOT NULL DEFAULT FALSE,
  audio_url            TEXT,
  audio_link_original  TEXT,
  selected             BOOLEAN DEFAULT FALSE,
  selected_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voces_casting_cantante_apps_casting_id ON voces_casting_cantante_applications (casting_id);
CREATE INDEX IF NOT EXISTS idx_voces_casting_cantante_apps_share_id   ON voces_casting_cantante_applications (share_id);
CREATE INDEX IF NOT EXISTS idx_voces_casting_cantante_apps_email      ON voces_casting_cantante_applications (share_id, email);

ALTER TABLE voces_casting_cantante_applications ENABLE ROW LEVEL SECURITY;

-- ===== voces_playlists =====
-- Proyectos/listas armadas por los clientes. Columnas reconstruidas desde
-- app/api/playlist/* (no había CREATE TABLE dedicado en el original).
CREATE TABLE IF NOT EXISTS voces_playlists (
  id         TEXT PRIMARY KEY,
  client_id  TEXT NOT NULL REFERENCES voces_clients(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  category   TEXT NOT NULL DEFAULT 'locutor',   -- 'locutor' | 'cantante'
  share_id   TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voces_playlists_client_category ON voces_playlists (client_id, category);
CREATE INDEX IF NOT EXISTS idx_voces_playlists_share_id        ON voces_playlists (share_id);

ALTER TABLE voces_playlists ENABLE ROW LEVEL SECURITY;

-- ===== voces_reel_update_requests =====
CREATE TABLE IF NOT EXISTS voces_reel_update_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status             TEXT NOT NULL DEFAULT 'pending',

  talent_id          UUID NOT NULL REFERENCES voces_talents(id) ON DELETE CASCADE,
  email              TEXT NOT NULL,

  mode               TEXT NOT NULL,
  target_kind        TEXT,
  target_media_id    UUID,

  new_audio_url      TEXT NOT NULL,
  new_audio_filename TEXT,

  reviewed_at        TIMESTAMPTZ,
  reviewed_by        TEXT,
  review_notes       TEXT
);

CREATE INDEX IF NOT EXISTS idx_voces_reel_update_requests_status ON voces_reel_update_requests (status);
CREATE INDEX IF NOT EXISTS idx_voces_reel_update_requests_talent ON voces_reel_update_requests (talent_id);

ALTER TABLE voces_reel_update_requests ENABLE ROW LEVEL SECURITY;

-- ===== voces_user_notification_prefs =====
-- Preferencias de notificación por cliente. Columnas reconstruidas desde
-- lib/email.ts, app/api/user/notification-prefs y app/api/cron/notifications.
CREATE TABLE IF NOT EXISTS voces_user_notification_prefs (
  client_id         TEXT PRIMARY KEY REFERENCES voces_clients(id) ON DELETE CASCADE,
  casting_cantante  BOOLEAN NOT NULL DEFAULT FALSE,
  casting_locutor   BOOLEAN NOT NULL DEFAULT FALSE,
  new_client        BOOLEAN NOT NULL DEFAULT FALSE,
  reel_request_freq TEXT NOT NULL DEFAULT 'off',   -- off | daily | weekly | monthly
  new_locutor_freq  TEXT NOT NULL DEFAULT 'off',   -- off | daily | weekly | monthly
  last_daily        TIMESTAMPTZ,
  last_weekly       TIMESTAMPTZ,
  last_monthly      TIMESTAMPTZ
);

ALTER TABLE voces_user_notification_prefs ENABLE ROW LEVEL SECURITY;

-- ===== voces_notification_queue =====
-- Cola de eventos para los resúmenes por email (daily/weekly/monthly digest).
CREATE TABLE IF NOT EXISTS voces_notification_queue (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,   -- 'reel_request' | 'new_locutor'
  payload    JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voces_notification_queue_type_created
  ON voces_notification_queue (event_type, created_at);

ALTER TABLE voces_notification_queue ENABLE ROW LEVEL SECURITY;

-- ===== voces_trash =====
-- Papelera genérica para elementos eliminados con posibilidad de restaurar
-- (hoy: castings de locutor eliminados con sus postulaciones). Reconstruida
-- desde la forma de store.json's `trash` array del original (que en la
-- práctica ya estaba muerta ahí: /api/admin/casting/delete borraba directo
-- en Supabase sin pasar por la papelera). Ningún flujo de este batch escribe
-- todavía en esta tabla — queda lista para que el batch de gestión de
-- casting (admin/casting) inserte una fila acá en lugar de un DELETE directo
-- cuando implemente "eliminar casting", usando esta forma:
--   { id, type: 'casting', casting: <jsonb del casting>,
--     applications: <jsonb[] de sus postulaciones>, files: <jsonb[] opcional> }
CREATE TABLE IF NOT EXISTS voces_trash (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,   -- 'casting' | 'application'
  casting      JSONB,           -- type = 'casting': snapshot del casting
  applications JSONB,           -- type = 'casting': snapshot de sus postulaciones
  application  JSONB,           -- type = 'application': snapshot de una única postulación
  files        JSONB,           -- rutas de archivos relacionados, para purgar al eliminar definitivo
  deleted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voces_trash_deleted_at ON voces_trash (deleted_at);

ALTER TABLE voces_trash ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Storage: buckets públicos para archivos de talentos y castings
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('voces-talent-files', 'voces-talent-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('voces-casting-files', 'voces-casting-files', true)
ON CONFLICT (id) DO NOTHING;
