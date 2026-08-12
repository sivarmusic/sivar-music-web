-- ============================================================================
-- FASE 9 — Constraints adicionales
-- ============================================================================
-- Las FK/UNIQUE/CHECK de forma de cada columna ya están en 04_schema.sql.
-- Acá van las reglas de integridad que cruzan MÁS DE UNA columna de la misma
-- fila — se separan porque son reglas de consistencia de negocio, no de
-- forma. Se agregan como ALTER TABLE para que quede explícito qué se sumó
-- en esta fase. Como las tablas están recién creadas (Fase 5 corre después),
-- no hace falta NOT VALID/VALIDATE — no hay filas viejas que puedan violarla.
-- ============================================================================

begin;

-- Un evento rechazado siempre debe tener motivo — si no, es un rechazo sin
-- trazabilidad para quien apeló o para futura auditoría.
alter table public.events_v2
  add constraint chk_events_rejection_reason
  check (status <> 'rejected' or rejection_reason is not null);

-- cortesia_categoria solo tiene sentido si la orden es efectivamente una
-- cortesía — evita el estado inconsistente "compra con categoría de cortesía".
alter table public.orders
  add constraint chk_orders_cortesia_categoria
  check (order_type = 'cortesia' or cortesia_categoria is null);

-- Una compra real necesita algún dato de contacto para poder entregar la
-- entrada; una cortesía interna puede no necesitarlo.
alter table public.orders
  add constraint chk_orders_contacto
  check (order_type = 'cortesia' or telefono is not null or email is not null);

-- Coordenadas de venue: ambas o ninguna, nunca una sola a medias.
alter table public.venues
  add constraint chk_venues_lat_lng_pair
  check ((lat is null) = (lng is null));

-- Orden de aparición en el lineup no puede ser negativo.
alter table public.event_lineup
  add constraint chk_event_lineup_orden
  check (orden >= 0);

-- Número de entrada dentro de una orden siempre positivo.
alter table public.tickets
  add constraint chk_tickets_ticket_number
  check (ticket_number > 0);

commit;
