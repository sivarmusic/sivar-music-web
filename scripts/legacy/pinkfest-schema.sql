-- ============================================
-- Pink Fest — Schema Supabase
-- Correr en: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Secuencia para códigos de orden (PF-0001, PF-0002...)
create sequence if not exists pinkfest_order_seq start 1;

-- 2. Tabla principal de órdenes
create table if not exists pinkfest_orders (
  id               uuid default gen_random_uuid() primary key,
  order_code       text unique not null default '',
  nombre           text not null,
  telefono         text not null,
  email            text not null,
  cantidad         integer not null default 1
                     check (cantidad >= 1 and cantidad <= 20),
  status           text not null default 'pendiente_comprobante'
                     check (status in (
                       'pendiente_comprobante',
                       'en_revision',
                       'confirmado',
                       'rechazado'
                     )),
  comprobante_path text,
  rechazo_motivo   text,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

-- 3. Función + trigger: auto-genera order_code antes del INSERT
create or replace function set_pinkfest_order_code()
returns trigger language plpgsql as $$
begin
  new.order_code := 'PF-' || lpad(nextval('pinkfest_order_seq')::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_pinkfest_order_code on pinkfest_orders;
create trigger trg_pinkfest_order_code
  before insert on pinkfest_orders
  for each row execute function set_pinkfest_order_code();

-- 4. Función + trigger: auto-actualiza updated_at
create or replace function update_pinkfest_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_pinkfest_updated_at on pinkfest_orders;
create trigger trg_pinkfest_updated_at
  before update on pinkfest_orders
  for each row execute function update_pinkfest_updated_at();

-- 5. Índice parcial: máximo 1 orden activa por número de teléfono
create unique index if not exists pinkfest_orders_phone_active
  on pinkfest_orders (telefono)
  where status in ('pendiente_comprobante', 'en_revision');

-- 6. Habilitar RLS sin políticas (solo service_role puede acceder)
alter table pinkfest_orders enable row level security;
