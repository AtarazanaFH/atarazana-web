-- El Mercado: perfiles de la gente que ha venido a las mareas.
-- Se ejecuta entero en Supabase → SQL Editor. Se puede volver a ejecutar sin romper nada.
--
-- Reglas:
-- · Solo puede existir una cuenta con un correo de la lista de asistentes o de admins
--   (disparador en auth.users), aunque alguien consiga un enlace o llame a la API.
-- · Para ver a los demás hay que tener el perfil relleno y visible: quien no lo tiene
--   solo sabe cuántas personas hay en sus mareas.
-- · Cada persona ve los perfiles visibles de quien coincidió con ella en alguna marea.
-- · Quien no ha rellenado su perfil sale "de incógnita": solo se sabe a qué mareas fue.
-- · Los admins (tabla mercado_admins) ven todos los perfiles visibles y todas las mareas.
-- · Las tablas no se leen directamente: todo pasa por las funciones de abajo.

-- ---------- Tablas ----------

-- Quién fue a cada marea. La rellena el script de importación con la service key.
create table if not exists public.mercado_attendance (
  email text not null check (email = lower(email)),
  marea text not null check (marea ~ '^[0-9]{3}$'),
  primary key (email, marea)
);

create table if not exists public.mercado_admins (
  email text primary key check (email = lower(email))
);

create table if not exists public.mercado_profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  role text check (char_length(role) <= 80),
  company text check (char_length(company) <= 80),
  building text check (char_length(building) <= 280),
  website text check (website ~ '^https://' and char_length(website) <= 200),
  linkedin text check (linkedin ~ '^https://' and char_length(linkedin) <= 200),
  x text check (x ~ '^https://' and char_length(x) <= 200),
  github text check (github ~ '^https://' and char_length(github) <= 200),
  photo text check (photo ~ '^[0-9a-f-]{36}/[0-9a-z-]+\.(jpg|webp)$'),
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Nombre (arriba) y al menos un enlace para que te puedan escribir.
alter table public.mercado_profiles drop constraint if exists mercado_profiles_contact;
alter table public.mercado_profiles add constraint mercado_profiles_contact
  check (coalesce(website, linkedin, x, github) is not null);

alter table public.mercado_attendance enable row level security;
alter table public.mercado_admins enable row level security;
alter table public.mercado_profiles enable row level security;

-- Asistencia y admins: sin políticas, así que solo los toca la service key.
-- Perfil: cada uno lee, crea, edita y borra solo el suyo.
drop policy if exists "own profile read" on public.mercado_profiles;
drop policy if exists "own profile insert" on public.mercado_profiles;
drop policy if exists "own profile update" on public.mercado_profiles;
drop policy if exists "own profile delete" on public.mercado_profiles;
create policy "own profile read" on public.mercado_profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.mercado_profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.mercado_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own profile delete" on public.mercado_profiles for delete to authenticated using (id = auth.uid());

-- ---------- Funciones (lo único que llama la web) ----------

create or replace function public.mercado_my_email() returns text
language sql stable security definer set search_path = '' as $$
  select lower(email) from auth.users where id = auth.uid()
$$;

create or replace function public.mercado_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mercado_admins where email = public.mercado_my_email())
$$;

-- Puede ver a los demás: admin, o con su propio perfil relleno y visible.
create or replace function public.mercado_can_see() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.mercado_is_admin()
      or exists (select 1 from public.mercado_profiles where id = auth.uid() and visible)
$$;

-- Mis mareas, si soy admin y el directorio: perfiles visibles e incógnitas de mis mareas.
-- Sin perfil visible, solo cuántas personas hay (`total`), sin nadie dentro.
create or replace function public.mercado_directory() returns json
language sql stable security definer set search_path = '' as $$
  with me as (
    select public.mercado_my_email() as email, public.mercado_is_admin() as admin, public.mercado_can_see() as can_see
  ),
  mine as (
    select distinct a.marea from public.mercado_attendance a, me
    where a.email = me.email or me.admin
  ),
  -- todas las personas que coincidieron conmigo, con las mareas que compartimos
  others as (
    select a.email, array_agg(a.marea order by a.marea desc) as mareas
    from public.mercado_attendance a, me
    where a.marea in (select marea from mine) and a.email <> me.email
    group by a.email
  ),
  people as (
    select o.mareas, p.*
    from others o
    left join auth.users u on lower(u.email) = o.email
    left join public.mercado_profiles p on p.id = u.id and p.visible
    where (select can_see from me)
  )
  select json_build_object(
    'admin', (select admin from me),
    'canSee', (select can_see from me),
    'total', (select count(*) from others),
    'member', exists (select 1 from public.mercado_attendance a, me where a.email = me.email),
    'mareas', (select coalesce(json_agg(marea order by marea desc), '[]'::json) from mine),
    'people', (
      select coalesce(json_agg(json_build_object(
        'id', id, 'name', name, 'role', role, 'company', company,
        'building', building, 'photo', photo, 'mareas', mareas
      ) order by name), '[]'::json)
      from people where id is not null
    ),
    -- de incógnita: solo sus mareas, ni nombre ni correo
    'hidden', (select coalesce(json_agg(mareas), '[]'::json) from people where id is null)
  )
  where auth.uid() is not null
$$;

-- Un perfil completo, solo si es visible y hemos coincidido (o soy admin).
create or replace function public.mercado_person(target uuid) returns json
language sql stable security definer set search_path = '' as $$
  with me as (
    select public.mercado_my_email() as email, public.mercado_is_admin() as admin
  ),
  them as (
    select p.*, lower(u.email) as email
    from public.mercado_profiles p join auth.users u on u.id = p.id
    where p.id = target and p.visible
  ),
  shared as (
    select a.marea from public.mercado_attendance a, them, me
    where a.email = them.email
      and (me.admin or a.marea in (select marea from public.mercado_attendance where email = me.email))
  )
  select json_build_object(
    'id', id, 'name', name, 'role', role, 'company', company, 'building', building,
    'website', website, 'linkedin', linkedin, 'x', x, 'github', github, 'photo', photo,
    'mareas', (select json_agg(marea order by marea desc) from shared),
    -- el correo solo lo ven los admins
    'email', case when (select admin from me) then them.email end
  )
  from them
  where auth.uid() is not null and public.mercado_can_see() and exists (select 1 from shared)
$$;

-- Para el admin: todos los perfiles rellenados (visibles u ocultos) con correo y mareas.
create or replace function public.mercado_admin_export() returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(json_build_object(
    'email', lower(u.email), 'name', p.name, 'role', p.role, 'company', p.company,
    'building', p.building, 'website', p.website, 'linkedin', p.linkedin, 'x', p.x,
    'github', p.github, 'visible', p.visible,
    'mareas', (select json_agg(a.marea order by a.marea desc) from public.mercado_attendance a where a.email = lower(u.email))
  ) order by p.name), '[]'::json)
  from public.mercado_profiles p join auth.users u on u.id = p.id
  where public.mercado_is_admin()
$$;

-- Para el admin: borra el perfil de alguien (sin borrar su cuenta ni su asistencia).
-- Esa persona puede volver a entrar, pero tiene que rellenarlo otra vez para ver a nadie.
create or replace function public.mercado_admin_delete_profile(target uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.mercado_is_admin() then raise exception 'Solo admins'; end if;
  delete from public.mercado_profiles where id = target;
  return found;
end
$$;

revoke all on function public.mercado_my_email() from public, anon;
revoke all on function public.mercado_is_admin() from public, anon;
revoke all on function public.mercado_can_see() from public, anon;
revoke all on function public.mercado_directory() from public, anon;
revoke all on function public.mercado_person(uuid) from public, anon;
revoke all on function public.mercado_admin_export() from public, anon;
revoke all on function public.mercado_admin_delete_profile(uuid) from public, anon;
grant execute on function public.mercado_is_admin() to authenticated;
grant execute on function public.mercado_directory() to authenticated;
grant execute on function public.mercado_person(uuid) to authenticated;
grant execute on function public.mercado_admin_export() to authenticated;
grant execute on function public.mercado_admin_delete_profile(uuid) to authenticated;

-- ---------- Solo asistentes ----------
-- Ninguna cuenta se crea (ni cambia de correo) si el correo no está en la lista de asistentes o de admins.
-- Por eso el script carga la asistencia antes de mandar las invitaciones.

create or replace function public.mercado_guard_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or not (
    exists (select 1 from public.mercado_attendance where email = lower(new.email))
    or exists (select 1 from public.mercado_admins where email = lower(new.email))
  ) then
    raise exception 'El Mercado: % no está en la lista de asistentes', coalesce(new.email, '(sin correo)');
  end if;
  return new;
end
$$;
revoke all on function public.mercado_guard_user() from public, anon, authenticated;

drop trigger if exists mercado_guard_user on auth.users;
create trigger mercado_guard_user
  before insert or update of email on auth.users
  for each row execute function public.mercado_guard_user();

-- ---------- Fotos ----------
-- Bucket privado: cada uno sube solo a su carpeta (su id). Una foto solo se lee si es tuya
-- o si puedes ver la ficha de su dueño (mismas reglas que mercado_person). Los admins leen y borran todas.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mercado-fotos', 'mercado-fotos', false, 1048576, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/webp'];

drop policy if exists "mercado fotos read" on storage.objects;
drop policy if exists "mercado fotos insert" on storage.objects;
drop policy if exists "mercado fotos update" on storage.objects;
drop policy if exists "mercado fotos delete" on storage.objects;
create policy "mercado fotos read" on storage.objects for select to authenticated
  using (bucket_id = 'mercado-fotos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.mercado_is_admin()
    or public.mercado_person(((storage.foldername(name))[1])::uuid) is not null
  ));
create policy "mercado fotos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'mercado-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "mercado fotos update" on storage.objects for update to authenticated
  using (bucket_id = 'mercado-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "mercado fotos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'mercado-fotos' and ((storage.foldername(name))[1] = auth.uid()::text or public.mercado_is_admin()));
