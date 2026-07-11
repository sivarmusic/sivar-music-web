-- ============================================================
-- Sivar Music — Contador de personas por evento
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS headcounts (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_key  text UNIQUE NOT NULL, -- 'pinkfest' o el id del evento en "events"
  count      int NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE headcounts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_headcounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_headcounts_updated_at ON headcounts;
CREATE TRIGGER trg_headcounts_updated_at
  BEFORE UPDATE ON headcounts
  FOR EACH ROW EXECUTE FUNCTION update_headcounts_updated_at();
