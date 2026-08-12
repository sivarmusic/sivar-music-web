-- ============================================================================
-- FASE 6 + 7 — Funciones y triggers
-- ============================================================================
-- Se listan en un solo archivo porque el orden de EJECUCIÓN real es
-- funciones -> triggers (un trigger no puede referenciar una función que
-- todavía no existe), aunque el pedido original las liste en fases separadas.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- set_updated_at() — UNA sola función genérica, reemplaza las 4 funciones
-- idénticas del esquema viejo (update_event_orders_updated_at,
-- update_pinkfest_updated_at, update_pinkfest_settings_updated_at,
-- update_headcounts_updated_at).
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_artist_details_updated_at
  before update on public.artist_details
  for each row execute function public.set_updated_at();

create trigger trg_events_updated_at
  before update on public.events_v2
  for each row execute function public.set_updated_at();

create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- generate_order_code() — UN solo mecanismo de generación de order_code para
-- TODAS las órdenes (antes había dos: un DEFAULT expression para event_orders
-- y un trigger separado para pinkfest_orders, con dos secuencias distintas).
-- ----------------------------------------------------------------------------

create or replace function public.generate_order_code()
returns trigger
language plpgsql
as $$
begin
  if new.order_code is null or new.order_code = '' then
    new.order_code := 'SM-' || lpad(nextval('order_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger trg_orders_generate_code
  before insert on public.orders
  for each row execute function public.generate_order_code();

-- ----------------------------------------------------------------------------
-- handle_new_user() — crea automáticamente la fila de profiles cuando se
-- registra un usuario nuevo en auth.users. Copia raw_user_meta_data UNA sola
-- vez (al momento de creación); después de esto, profiles.nombre es la única
-- fuente de verdad y no se vuelve a leer raw_user_meta_data.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, new.raw_user_meta_data->>'nombre')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- authorize() — punto único de chequeo de permisos, usado desde las policies
-- RLS (Fase 10) en vez de repetir la misma subquery en cada policy.
-- SIEMPRE consulta la tabla en vivo (user_roles/role_permissions), nunca el
-- JWT — la tabla es la fuente de verdad, el JWT es solo un cache para UI.
-- ----------------------------------------------------------------------------

create or replace function public.authorize(requested_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  has_perm boolean;
begin
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and p.slug = requested_permission
  ) into has_perm;

  return coalesce(has_perm, false);
end;
$$;

-- ----------------------------------------------------------------------------
-- custom_access_token_hook() — Auth Hook que inyecta los slugs de rol del
-- usuario dentro del JWT (app_metadata.roles) en cada emisión/refresh de
-- token. Es un CACHE de lectura rápida para middleware/UI — nunca se usa
-- para autorizar una acción real (eso siempre pasa por authorize()).
--
-- IMPORTANTE: después de correr este script hay que registrar esta función
-- como "Access Token Hook" en Supabase Dashboard -> Authentication -> Hooks
-- (o en config.toml si es self-hosted). Eso NO se puede hacer por SQL.
-- ----------------------------------------------------------------------------

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  role_slugs jsonb;
begin
  select coalesce(jsonb_agg(r.slug), '[]'::jsonb)
  into role_slugs
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{app_metadata,roles}', role_slugs);
  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on public.user_roles to supabase_auth_admin;
grant select on public.roles to supabase_auth_admin;

commit;
