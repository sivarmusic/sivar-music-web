-- ============================================================
-- Sivar Events for Artists — aprobación de eventos + más campos
-- Ejecutar en Supabase SQL Editor (después de artists-platform-schema.sql)
-- ============================================================

ALTER TABLE artist_events ADD COLUMN IF NOT EXISTS lat numeric;
ALTER TABLE artist_events ADD COLUMN IF NOT EXISTS lng numeric;
ALTER TABLE artist_events ADD COLUMN IF NOT EXISTS precio numeric;
ALTER TABLE artist_events ADD COLUMN IF NOT EXISTS max_entradas integer;
ALTER TABLE artist_events ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado'));

-- Los eventos ya existentes creados antes de este cambio quedan aprobados
-- (para no ocultar de golpe algo que el artista ya había visto publicado).
UPDATE artist_events SET status = 'aprobado' WHERE visible = true;

-- El artista ya no puede escribir/actualizar directo (solo ve y borra sus
-- propios eventos) — crear/aprobar pasa por rutas de API con service role,
-- así no puede autopublicarse saltándose la revisión.
DROP POLICY IF EXISTS "own_artist_events_write" ON artist_events;
DROP POLICY IF EXISTS "public_read_artist_events" ON artist_events;

CREATE POLICY "own_artist_events_select" ON artist_events
  FOR SELECT USING (auth.uid() = artist_id);
CREATE POLICY "own_artist_events_delete" ON artist_events
  FOR DELETE USING (auth.uid() = artist_id);
CREATE POLICY "public_read_approved_artist_events" ON artist_events
  FOR SELECT USING (status = 'aprobado');
