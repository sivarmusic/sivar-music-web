-- ============================================================
-- Sound for Films — Catálogo de videos (mini-CMS admin)
-- Ejecutar a mano en el Supabase SQL Editor
-- ============================================================
-- Reemplaza el array hardcodeado `soundForFilmsCatalog` de
-- app/data/soundForFilmsProjects.ts como fuente de verdad. El slug de cada
-- fila se generó con la misma función slugify() de ese archivo (kebab-case,
-- sin tildes) para no romper los slugs que ya usan los componentes del
-- showcase.

CREATE TABLE IF NOT EXISTS sound_for_films_videos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text UNIQUE NOT NULL,
  filename          text NOT NULL,
  preview_filename  text,
  title             text NOT NULL,
  description       text NOT NULL DEFAULT '',
  partner_credit    text NOT NULL DEFAULT '',
  visible           boolean NOT NULL DEFAULT true,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Sin políticas: solo el service role (server-side) puede leer o escribir.
ALTER TABLE sound_for_films_videos ENABLE ROW LEVEL SECURITY;

INSERT INTO sound_for_films_videos
  (slug, filename, preview_filename, title, description, partner_credit, sort_order)
VALUES
  ('binter', 'BINTER.mp4', NULL, 'BINTER', 'SOUND DESIGN/MIX', '', 0),
  ('corona-100-anos', 'CORONA 100 AÑOS.mp4', NULL, 'CORONA 100 AÑOS', 'SOUND DESIGN/MIX', 'in partnership with BDS creative studio.', 1),
  ('jean-paul-gaultier', 'JEAN PAUL GAULTIER.mp4', NULL, 'JEAN PAUL GAULTIER', 'SOUND DESIGN/MIX', 'in partnership with BDS creative studio.', 2),
  ('don-julio', 'DON JULIO.mp4', NULL, 'DON JULIO', 'SOUND DESIGN/MIX', '', 3),
  ('google-pixel', 'GOOGLE PIXEL.mp4', NULL, 'GOOGLE PIXEL', 'SOUND DESIGN/MIX', 'in partnership with BDS creative studio.', 4),
  ('aeromexico', 'AEROMEXICO.mp4', NULL, 'AEROMEXICO', 'MUSIC/SOUND DESIGN/MIX', 'in partnership with BDS creative studio.', 5),
  ('arredo', 'ARREDO.mp4', NULL, 'ARREDO', 'SOUND DESIGN/MIX', '', 6),
  ('buho-film', 'BUHO FILM.mp4', NULL, 'BUHO FILM', 'MUSIC/SOUND DESIGN/MIX', 'in partnership with BDS creative studio.', 7),
  ('chevrolet', 'CHEVROLET.mp4', NULL, 'CHEVROLET', 'SOUND DESIGN/MIX', 'in partnership with BDS creative studio.', 8),
  ('hbo-max', 'HBO MAX.mp4', NULL, 'HBO MAX', 'SOUND DESIGN/MIX', '', 9),
  ('kfc-caribe', 'KFC CARIBE.mp4', NULL, 'KFC CARIBE', 'MUSIC/SOUND DESIGN/MIX', 'in partnership with BDS creative studio.', 10),
  ('kfc-latam', 'KFC LATAM.mp4', NULL, 'KFC LATAM', 'MUSIC/SOUND DESIGN/MIX', 'in partnership with BDS creative studio.', 11),
  ('montelobos', 'MONTELOBOS.mp4', NULL, 'MONTELOBOS', 'MUSIC/SOUND DESIGN/MIX', 'in partnership with BDS creative studio.', 12),
  ('nissan', 'NISSAN.mp4', NULL, 'NISSAN', 'SOUND DESIGN/MIX', 'in partnership with BDS creative studio.', 13),
  ('olympics', 'OLYMPICS.mp4', NULL, 'OLYMPICS', 'MUSIC/SOUND DESIGN/MIX', 'in partnership with BDS creative studio.', 14),
  ('sports-direct', 'SPORTS DIRECT.mp4', NULL, 'SPORTS DIRECT', 'MUSIC/SOUND DESIGN/MIX', 'in partnership with BDS creative studio.', 15),
  ('tecate', 'TECATE.mp4', NULL, 'TECATE', 'MUSIC/SOUND DESIGN/MIX', 'in partnership with BDS creative studio.', 16)
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION update_sound_for_films_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sound_for_films_videos_updated_at ON sound_for_films_videos;
CREATE TRIGGER trg_sound_for_films_videos_updated_at
  BEFORE UPDATE ON sound_for_films_videos
  FOR EACH ROW EXECUTE FUNCTION update_sound_for_films_videos_updated_at();
