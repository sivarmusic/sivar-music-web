-- ============================================
-- Pink Fest — Agregar tabla de tickets individuales
-- Correr en: Supabase Dashboard → SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS pinkfest_tickets (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id       uuid REFERENCES pinkfest_orders(id) ON DELETE CASCADE NOT NULL,
  order_code     text NOT NULL,
  ticket_number  int NOT NULL,  -- 1, 2, 3... (entrada #N de la orden)
  qr_token       text UNIQUE NOT NULL,
  check_in_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE pinkfest_tickets ENABLE ROW LEVEL SECURITY;
