-- ============================================================
-- Sivar Music — Recordatorio de compra pendiente
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE event_orders
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

ALTER TABLE pinkfest_orders
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
