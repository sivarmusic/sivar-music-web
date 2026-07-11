-- ============================================================
-- Pink Fest — Ajustes editables (venue, descripción, imagen)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS pinkfest_settings (
  id          int PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- fila única
  venue       text,
  descripcion text,
  imagen_url  text,
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE pinkfest_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_pinkfest_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pinkfest_settings_updated_at ON pinkfest_settings;
CREATE TRIGGER trg_pinkfest_settings_updated_at
  BEFORE UPDATE ON pinkfest_settings
  FOR EACH ROW EXECUTE FUNCTION update_pinkfest_settings_updated_at();
