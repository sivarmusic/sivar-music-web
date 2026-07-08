-- ============================================================
-- Sivar Events for Artists
-- Ejecutar en Supabase SQL Editor (después de eventos-schema.sql)
-- ============================================================

-- Solicitudes públicas para unirse como artista (solo se escriben/leen
-- desde rutas de API con service role — no hay policy de INSERT/SELECT
-- pública a propósito).
CREATE TABLE IF NOT EXISTS artist_applications (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_artistico text NOT NULL,
  nombre_contacto  text NOT NULL,
  email            text NOT NULL,
  telefono         text,
  genero           text,
  bio              text,
  instagram        text,
  spotify          text,
  tiktok           text,
  youtube          text,
  otro_link        text,
  status           text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
  created_at       timestamptz DEFAULT now(),
  reviewed_at      timestamptz
);
ALTER TABLE artist_applications ENABLE ROW LEVEL SECURITY;

-- Perfil público del artista, una vez aprobado (id = auth.users.id creado
-- vía invitación al aprobar la solicitud).
CREATE TABLE IF NOT EXISTS artist_profiles (
  id               uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  slug             text UNIQUE NOT NULL,
  nombre_artistico text NOT NULL,
  genero           text,
  bio              text,
  foto_url         text,
  instagram        text,
  spotify          text,
  tiktok           text,
  youtube          text,
  apple_music      text,
  otro_link        text,
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_artist_profile" ON artist_profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "public_read_artist_profiles" ON artist_profiles
  FOR SELECT USING (true);

-- Fotos de shows anteriores
CREATE TABLE IF NOT EXISTS artist_gallery (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id  uuid REFERENCES artist_profiles(id) ON DELETE CASCADE NOT NULL,
  image_url  text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE artist_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_gallery_write" ON artist_gallery
  FOR ALL USING (auth.uid() = artist_id);
CREATE POLICY "public_read_gallery" ON artist_gallery
  FOR SELECT USING (true);

-- Eventos informativos del artista (sin venta de entradas)
CREATE TABLE IF NOT EXISTS artist_events (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id    uuid REFERENCES artist_profiles(id) ON DELETE CASCADE NOT NULL,
  nombre       text NOT NULL,
  descripcion  text,
  fecha        timestamptz NOT NULL,
  venue        text NOT NULL,
  direccion    text,
  imagen_url   text,
  link_externo text,
  visible      boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE artist_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_artist_events_write" ON artist_events
  FOR ALL USING (auth.uid() = artist_id);
CREATE POLICY "public_read_artist_events" ON artist_events
  FOR SELECT USING (visible = true);
