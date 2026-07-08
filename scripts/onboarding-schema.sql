-- ============================================================
-- Sivar Music — Onboarding de nuevos usuarios
-- Ejecutar en Supabase SQL Editor (después de eventos-schema.sql)
-- ============================================================

ALTER TABLE attendee_profiles ADD COLUMN IF NOT EXISTS generos_favoritos text[] DEFAULT '{}';
ALTER TABLE attendee_profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

CREATE TABLE IF NOT EXISTS artist_follows (
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_slug  text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, artist_slug)
);
ALTER TABLE artist_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_artist_follows" ON artist_follows
  FOR ALL USING (auth.uid() = user_id);
