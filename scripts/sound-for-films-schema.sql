-- ============================================================
-- Sound for Films — Gate de acceso (on/off + contraseña)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS sound_for_films_settings (
  id            int PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- fila única
  gate_enabled  boolean NOT NULL DEFAULT true,
  password_hash text,                                     -- pbkdf2$iter$salt$hash
  updated_at    timestamptz DEFAULT now()
);

-- Sin políticas: solo el service role (server-side) puede leer o escribir.
ALTER TABLE sound_for_films_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO sound_for_films_settings (id, gate_enabled)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION update_sound_for_films_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sound_for_films_settings_updated_at ON sound_for_films_settings;
CREATE TRIGGER trg_sound_for_films_settings_updated_at
  BEFORE UPDATE ON sound_for_films_settings
  FOR EACH ROW EXECUTE FUNCTION update_sound_for_films_settings_updated_at();

-- ============================================================
-- Storage: bucket PRIVADO para los videos
-- ============================================================
-- Crear el bucket sin acceso público. Los videos se sirven únicamente
-- mediante signed URLs generadas server-side después de pasar el gate.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('sound-for-films', 'sound-for-films', false, 524288000) -- 500 MB
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit;

-- Sin políticas de storage: ningún rol anon/authenticated puede listar ni
-- descargar. El service role las omite y es el único que firma URLs.
