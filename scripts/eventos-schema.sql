-- ============================================================
-- Sivar Music — Plataforma de Eventos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Secuencia para códigos de orden (SM-0001, SM-0002, ...)
CREATE SEQUENCE IF NOT EXISTS event_order_seq START 1;

-- Tabla de eventos
CREATE TABLE IF NOT EXISTS events (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         text UNIQUE NOT NULL,
  nombre       text NOT NULL,
  descripcion  text,
  fecha        timestamptz NOT NULL,
  venue        text NOT NULL,
  direccion    text NOT NULL,
  lat          numeric(10, 7),
  lng          numeric(10, 7),
  imagen_url   text,
  precio       numeric(10, 2) NOT NULL DEFAULT 10,
  artistas     text[] DEFAULT '{}',
  visible      boolean DEFAULT false,
  max_entradas int,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Tabla de órdenes de eventos
CREATE TABLE IF NOT EXISTS event_orders (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id         uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  order_code       text UNIQUE NOT NULL DEFAULT ('SM-' || lpad(nextval('event_order_seq')::text, 4, '0')),
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre           text NOT NULL,
  telefono         text NOT NULL,
  email            text NOT NULL,
  cantidad         int NOT NULL DEFAULT 1 CHECK (cantidad >= 1 AND cantidad <= 20),
  status           text NOT NULL DEFAULT 'pendiente_comprobante'
                   CHECK (status IN ('pendiente_comprobante','en_revision','confirmado','rechazado')),
  comprobante_path text,
  rechazo_motivo   text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
ALTER TABLE event_orders ENABLE ROW LEVEL SECURITY;

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_event_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_orders_updated_at ON event_orders;
CREATE TRIGGER trg_event_orders_updated_at
  BEFORE UPDATE ON event_orders
  FOR EACH ROW EXECUTE FUNCTION update_event_orders_updated_at();

-- Índice único: un solo pedido activo por teléfono por evento
CREATE UNIQUE INDEX IF NOT EXISTS event_orders_telefono_event_active
  ON event_orders (event_id, telefono)
  WHERE status IN ('pendiente_comprobante', 'en_revision');

-- Tabla de tickets (QR individuales)
CREATE TABLE IF NOT EXISTS event_tickets (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      uuid REFERENCES event_orders(id) ON DELETE CASCADE NOT NULL,
  order_code    text NOT NULL,
  ticket_number int NOT NULL,
  qr_token      text UNIQUE NOT NULL,
  check_in_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;

-- Perfiles de asistentes (vinculados a Supabase Auth)
CREATE TABLE IF NOT EXISTS attendee_profiles (
  id        uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre    text,
  telefono  text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE attendee_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: asistentes ven sus propias órdenes
CREATE POLICY "attendees_own_orders" ON event_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "attendees_own_profile" ON attendee_profiles
  FOR ALL USING (auth.uid() = id);
