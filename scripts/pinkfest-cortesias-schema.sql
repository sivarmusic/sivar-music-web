-- ============================================================
-- Pink Fest — Entradas de cortesía
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE pinkfest_orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'compra'
    CHECK (order_type IN ('compra','cortesia')),
  ADD COLUMN IF NOT EXISTS cortesia_categoria text
    CHECK (cortesia_categoria IN ('staff','organizacion','vip','musicos')),
  ALTER COLUMN telefono DROP NOT NULL;
