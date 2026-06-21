-- Tabla de visitas únicas a la página pública de Pink Fest
CREATE TABLE IF NOT EXISTS pinkfest_visits (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ip          text NOT NULL,
  user_agent  text,
  visited_at  timestamptz DEFAULT now(),
  visit_date  date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (ip, visit_date)   -- una visita por IP por día (sin duplicados)
);
ALTER TABLE pinkfest_visits ENABLE ROW LEVEL SECURITY;
