-- RLS de artist_profiles (etapa 3, E-06).
-- NO lo ejecuta la app: correrlo a mano en el SQL Editor de Supabase.
-- Idempotente: se puede correr más de una vez.
--
-- Problema: la política "own_artist_profile" es FOR ALL con USING (auth.uid() = id).
-- Para INSERT, USING hace de WITH CHECK, así que cualquier usuario autenticado
-- (el registro público confirma el email sin verificar) podía crearse su propio
-- perfil de artista y saltarse la aprobación de solicitudes.
--
-- Flujo legítimo (leído del código):
--   * La fila se crea SOLO en el servidor con service role, al aprobar la solicitud
--     (app/api/eventos/artistas/aplicaciones/[id]/route.ts).
--   * El artista edita desde el navegador (supabaseBrowser) únicamente: bio, genero,
--     instagram, spotify, tiktok, youtube, apple_music, otro_link y foto_url
--     (app/eventos/artistas/panel/page.tsx). Slug y nombre los edita el admin por API.

-- 0) PREFLIGHT (descomentar y revisar antes de aplicar).
-- select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr,
--        pg_get_expr(polwithcheck, polrelid) as check_expr
--   from pg_policy where polrelid = 'public.artist_profiles'::regclass;
--
-- Perfiles que no corresponden a ninguna solicitud aprobada (posibles auto-creados):
-- select p.id, p.slug, p.nombre_artistico, p.created_at
--   from artist_profiles p
--  where not exists (
--    select 1 from artist_applications a
--     where lower(a.email) = (select lower(email) from auth.users u where u.id = p.id)
--       and a.status = 'aprobado'
--  );

alter table artist_profiles enable row level security;

-- 1) Quitar la política FOR ALL (y las que vamos a recrear, para que sea idempotente).
drop policy if exists "own_artist_profile" on artist_profiles;
drop policy if exists "public_read_artist_profiles" on artist_profiles;
drop policy if exists "own_artist_profile_update" on artist_profiles;

-- 2) Lectura pública: las páginas públicas de artistas la necesitan.
create policy "public_read_artist_profiles" on artist_profiles
  for select using (true);

-- 3) Cada artista puede actualizar SOLO su propia fila. Sin políticas de
--    INSERT ni DELETE: crear/borrar perfiles queda reservado al service role.
create policy "own_artist_profile_update" on artist_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4) Las policies no restringen columnas: un trigger bloquea que un usuario
--    final cambie campos de identidad. El service role (servidor) no se ve afectado.
create or replace function artist_profiles_lock_identity()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), 'service_role') <> 'service_role' then
    if new.id is distinct from old.id
       or new.slug is distinct from old.slug
       or new.nombre_artistico is distinct from old.nombre_artistico
       or new.created_at is distinct from old.created_at then
      raise exception 'No podés modificar la identidad del perfil (id, slug, nombre artístico).'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_artist_profiles_lock_identity on artist_profiles;
create trigger trg_artist_profiles_lock_identity
  before update on artist_profiles
  for each row execute function artist_profiles_lock_identity();

-- 5) Nota: artist_gallery y artist_events ya cuelgan de artist_profiles por FK,
--    así que sin fila de perfil (ahora imposible de crear por el usuario) no se
--    puede insertar en ellas. artist_events solo permite SELECT/DELETE propios;
--    las altas pasan por la API con service role.
