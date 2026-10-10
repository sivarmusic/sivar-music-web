-- Endurecimiento etapa 5: límite de intentos y auditoría de órdenes.
-- NO lo ejecuta la app: correrlo a mano en el SQL Editor de Supabase.
-- Idempotente. Mientras no se corra, la app sigue funcionando: el rate limit
-- falla abierto (permite) y la auditoría es best-effort (solo console.error).

-- 1) Límite de intentos ---------------------------------------------------
create table if not exists rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  count        int         not null default 0,
  primary key (key, window_start)
);

-- RLS activado y SIN políticas: solo el service role accede.
alter table rate_limits enable row level security;

-- Devuelve true si la petición está permitida y false si superó el límite.
-- Contador atómico por ventana fija: INSERT ... ON CONFLICT DO UPDATE.
create or replace function check_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_count  int;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into rate_limits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start)
  do update set count = r.count + 1
  returning r.count into v_count;

  -- Limpieza oportunista (≈1% de las llamadas): borra ventanas de hace más de 1 día.
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_limit;
end;
$$;

-- Solo el service role (servidor) puede ejecutarla.
revoke all on function check_rate_limit(text, int, int) from public;
revoke execute on function check_rate_limit(text, int, int) from anon, authenticated;
grant execute on function check_rate_limit(text, int, int) to service_role;

-- 2) Auditoría de órdenes (tabla event_orders) ----------------------------
alter table event_orders add column if not exists reviewed_by  text;        -- email del staff que confirmó/rechazó
alter table event_orders add column if not exists reviewed_at  timestamptz; -- cuándo se tomó la decisión
alter table event_orders add column if not exists confirmed_by text;        -- email del staff que confirmó el pago
alter table event_orders add column if not exists confirmed_at timestamptz; -- cuándo se confirmó
alter table event_orders add column if not exists created_by   text;        -- email del admin que emitió una cortesía

-- ROLLBACK (solo si hiciera falta):
--   drop function if exists check_rate_limit(text, int, int);
--   drop table if exists rate_limits;
--   alter table event_orders drop column if exists reviewed_by, drop column if exists reviewed_at,
--     drop column if exists confirmed_by, drop column if exists confirmed_at, drop column if exists created_by;
