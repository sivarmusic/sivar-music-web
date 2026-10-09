-- Integridad de la ticketera de eventos (etapa 1c).
-- NO se ejecuta desde la app: correrlo a mano en el SQL Editor de Supabase.
-- Idempotente: se puede correr más de una vez.

-- 1) PREFLIGHT (descomentar y correr ANTES de crear los índices).
--    Si devuelven filas, hay duplicados que hay que limpiar a mano primero.
--
-- select order_id, ticket_number, count(*) as n
--   from event_tickets
--  group by order_id, ticket_number
-- having count(*) > 1;
--
-- select qr_token, count(*) as n
--   from event_tickets
--  group by qr_token
-- having count(*) > 1;

-- 2) Unicidad de tickets. (qr_token ya es UNIQUE en eventos-schema.sql; el
--    índice es un cinturón por si la tabla se creó sin esa constraint.)
create unique index if not exists event_tickets_order_number_uniq
  on event_tickets (order_id, ticket_number);

create unique index if not exists event_tickets_qr_token_uniq
  on event_tickets (qr_token);

-- 3) Reserva atómica de cupo (opcional; la app todavía NO la llama).
--    Bloquea la fila del evento, suma las órdenes activas (pendiente_comprobante,
--    en_revision, confirmado) y recién ahí inserta, cerrando la carrera de
--    check-then-insert de checkEventCapacity. max_entradas null/0 = sin límite.
create or replace function reserve_event_order(
  p_event_id uuid,
  p_user_id  uuid,
  p_nombre   text,
  p_telefono text,
  p_email    text,
  p_cantidad int
) returns event_orders
language plpgsql
as $$
declare
  v_max  int;
  v_sold int;
  v_order event_orders;
begin
  select max_entradas into v_max from events where id = p_event_id for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_max is not null and v_max > 0 then
    select coalesce(sum(cantidad), 0) into v_sold
      from event_orders
     where event_id = p_event_id
       and status in ('pendiente_comprobante', 'en_revision', 'confirmado');

    if v_sold + p_cantidad > v_max then
      raise exception 'SOLD_OUT:%', greatest(v_max - v_sold, 0) using errcode = 'P0001';
    end if;
  end if;

  insert into event_orders (event_id, user_id, nombre, telefono, email, cantidad)
  values (p_event_id, p_user_id, p_nombre, p_telefono, p_email, p_cantidad)
  returning * into v_order;

  return v_order;
end;
$$;
