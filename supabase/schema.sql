-- =====================================================================
--  Sistema de Tarjetas de Lealtad para Cafeterías
--  Esquema MVP para Supabase (PostgreSQL)
-- =====================================================================

-- ---------------------------------------------------------------------
--  1. TIPOS (ENUMS)
-- ---------------------------------------------------------------------
create type public.rol_staff as enum ('dueno', 'barista');
create type public.plataforma_wallet as enum ('apple', 'google');
create type public.tipo_movimiento as enum ('sello', 'canje', 'ajuste');
create type public.estado_suscripcion as enum ('prueba', 'activa', 'vencida', 'cancelada');


-- ---------------------------------------------------------------------
--  2. TABLAS
-- ---------------------------------------------------------------------

-- Super administradores (tú)
create table public.super_admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  creado_en   timestamptz not null default now()
);

-- Cafeterías (cada una es un "tenant")
create table public.cafeterias (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null,
  slug                text not null unique,                 -- tusistema.com/c/<slug>
  logo_url            text,
  color_fondo         text not null default '#3E2723',
  color_texto         text not null default '#FFFFFF',
  color_etiquetas     text not null default '#D7CCC8',
  zona_horaria        text not null default 'America/Mexico_City',
  plan                text not null default 'basico',
  estado_suscripcion  public.estado_suscripcion not null default 'prueba',
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  constraint slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- Sucursales
create table public.sucursales (
  id            uuid primary key default gen_random_uuid(),
  cafeteria_id  uuid not null references public.cafeterias(id) on delete cascade,
  nombre        text not null,
  direccion     text,
  activa        boolean not null default true,
  creado_en     timestamptz not null default now()
);

-- Personal (dueños y baristas). El id es el mismo del usuario de Supabase Auth
create table public.staff (
  id            uuid primary key references auth.users(id) on delete cascade,
  cafeteria_id  uuid not null references public.cafeterias(id) on delete cascade,
  sucursal_id   uuid references public.sucursales(id) on delete set null,
  nombre        text not null,
  rol           public.rol_staff not null default 'barista',
  activo        boolean not null default true,
  creado_en     timestamptz not null default now()
);

-- Programas de lealtad (ej. "Compra 9, el 10 es gratis")
create table public.programas (
  id                  uuid primary key default gen_random_uuid(),
  cafeteria_id        uuid not null references public.cafeterias(id) on delete cascade,
  nombre              text not null,
  descripcion         text,
  sellos_requeridos   int not null check (sellos_requeridos between 1 and 50),
  premio              text not null,
  max_sellos_por_dia  int not null default 1 check (max_sellos_por_dia >= 1),
  google_class_id     text unique,                          -- Loyalty Class en Google Wallet
  activo              boolean not null default true,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now()
);

-- Clientes finales (uno por cafetería; cada negocio es dueño de su lista)
create table public.clientes (
  id                  uuid primary key default gen_random_uuid(),
  cafeteria_id        uuid not null references public.cafeterias(id) on delete cascade,
  nombre              text not null,
  telefono            text,
  correo              text,
  acepta_privacidad   boolean not null default false,
  creado_en           timestamptz not null default now(),
  constraint contacto_requerido check (telefono is not null or correo is not null),
  constraint cliente_telefono_unico unique (cafeteria_id, telefono),
  constraint cliente_correo_unico unique (cafeteria_id, correo)
);

-- Tarjetas (la que vive en la cartera del cliente)
create table public.tarjetas (
  id                  uuid primary key default gen_random_uuid(),
  cafeteria_id        uuid not null references public.cafeterias(id) on delete cascade,
  cliente_id          uuid not null references public.clientes(id) on delete cascade,
  programa_id         uuid not null references public.programas(id) on delete cascade,
  codigo              text not null unique default replace(gen_random_uuid()::text, '-', ''),  -- va en el QR
  plataforma          public.plataforma_wallet,
  serial_apple        text not null unique default gen_random_uuid()::text,                   -- serialNumber del .pkpass
  token_apple         text not null default replace(gen_random_uuid()::text, '-', ''),         -- authenticationToken del .pkpass
  google_object_id    text unique,                                                            -- Loyalty Object en Google Wallet
  sellos_actuales     int not null default 0 check (sellos_actuales >= 0),
  premios_canjeados   int not null default 0 check (premios_canjeados >= 0),
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  constraint tarjeta_unica_por_programa unique (cliente_id, programa_id)
);

-- Historial de sellos y canjes
create table public.movimientos (
  id            bigint generated always as identity primary key,
  cafeteria_id  uuid not null references public.cafeterias(id) on delete cascade,
  tarjeta_id    uuid not null references public.tarjetas(id) on delete cascade,
  sucursal_id   uuid references public.sucursales(id) on delete set null,
  staff_id      uuid references public.staff(id) on delete set null,
  tipo          public.tipo_movimiento not null,
  cantidad      int not null default 1,
  creado_en     timestamptz not null default now()
);

-- Dispositivos Apple registrados (los manda Apple a tu web service)
create table public.apple_dispositivos (
  device_library_id  text primary key,
  push_token         text not null,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now()
);

-- Relación dispositivo <-> tarjeta (para saber a quién mandar push)
create table public.apple_registros (
  device_library_id  text not null references public.apple_dispositivos(device_library_id) on delete cascade,
  pass_type_id       text not null,
  serial_apple       text not null references public.tarjetas(serial_apple) on delete cascade,
  creado_en          timestamptz not null default now(),
  primary key (device_library_id, pass_type_id, serial_apple)
);


-- ---------------------------------------------------------------------
--  3. ÍNDICES
-- ---------------------------------------------------------------------
create index idx_sucursales_cafeteria   on public.sucursales (cafeteria_id);
create index idx_staff_cafeteria        on public.staff (cafeteria_id);
create index idx_programas_cafeteria    on public.programas (cafeteria_id);
create index idx_clientes_cafeteria     on public.clientes (cafeteria_id);
create index idx_tarjetas_cafeteria     on public.tarjetas (cafeteria_id);
create index idx_tarjetas_programa      on public.tarjetas (programa_id);
create index idx_tarjetas_actualizado   on public.tarjetas (actualizado_en);
create index idx_movimientos_cafeteria  on public.movimientos (cafeteria_id, creado_en desc);
create index idx_movimientos_tarjeta    on public.movimientos (tarjeta_id, tipo, creado_en desc);
create index idx_apple_reg_serial       on public.apple_registros (serial_apple);


-- ---------------------------------------------------------------------
--  4. TRIGGER: actualizado_en automático
--     (Apple lo usa para saber qué tarjetas cambiaron)
-- ---------------------------------------------------------------------
create or replace function public.tg_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger trg_cafeterias_actualizado before update on public.cafeterias
  for each row execute function public.tg_actualizado_en();

create trigger trg_programas_actualizado before update on public.programas
  for each row execute function public.tg_actualizado_en();

create trigger trg_tarjetas_actualizado before update on public.tarjetas
  for each row execute function public.tg_actualizado_en();

create trigger trg_apple_disp_actualizado before update on public.apple_dispositivos
  for each row execute function public.tg_actualizado_en();


-- ---------------------------------------------------------------------
--  5. FUNCIONES AUXILIARES PARA SEGURIDAD
-- ---------------------------------------------------------------------
create or replace function public.mi_cafeteria_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cafeteria_id from public.staff
  where id = auth.uid() and activo
  limit 1;
$$;

create or replace function public.es_dueno()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where id = auth.uid() and activo and rol = 'dueno'
  );
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.super_admins where user_id = auth.uid());
$$;


-- ---------------------------------------------------------------------
--  6. ROW LEVEL SECURITY (cada cafetería solo ve lo suyo)
--     Nota: el backend (API routes de Next) usa la service_role key,
--     que se salta RLS. Eso se usa para el registro público de clientes,
--     generar tarjetas y el web service de Apple.
-- ---------------------------------------------------------------------
alter table public.super_admins        enable row level security;
alter table public.cafeterias          enable row level security;
alter table public.sucursales          enable row level security;
alter table public.staff               enable row level security;
alter table public.programas           enable row level security;
alter table public.clientes            enable row level security;
alter table public.tarjetas            enable row level security;
alter table public.movimientos         enable row level security;
alter table public.apple_dispositivos  enable row level security;   -- sin políticas: solo backend
alter table public.apple_registros     enable row level security;   -- sin políticas: solo backend

-- Super admins: solo ven su propio registro
create policy "admin_ver_propio" on public.super_admins
  for select to authenticated
  using (user_id = auth.uid());

-- Cafeterías
create policy "cafeteria_ver" on public.cafeterias
  for select to authenticated
  using (id = public.mi_cafeteria_id() or public.es_admin());

create policy "cafeteria_editar_dueno" on public.cafeterias
  for update to authenticated
  using (public.es_dueno() and id = public.mi_cafeteria_id())
  with check (id = public.mi_cafeteria_id());

-- El dueño solo puede editar datos visuales, no su plan ni su suscripción
revoke update on public.cafeterias from authenticated;
grant update (nombre, logo_url, color_fondo, color_texto, color_etiquetas, zona_horaria)
  on public.cafeterias to authenticated;

-- Sucursales
create policy "sucursal_ver" on public.sucursales
  for select to authenticated
  using (cafeteria_id = public.mi_cafeteria_id() or public.es_admin());

create policy "sucursal_crear_dueno" on public.sucursales
  for insert to authenticated
  with check (public.es_dueno() and cafeteria_id = public.mi_cafeteria_id());

create policy "sucursal_editar_dueno" on public.sucursales
  for update to authenticated
  using (public.es_dueno() and cafeteria_id = public.mi_cafeteria_id())
  with check (cafeteria_id = public.mi_cafeteria_id());

create policy "sucursal_borrar_dueno" on public.sucursales
  for delete to authenticated
  using (public.es_dueno() and cafeteria_id = public.mi_cafeteria_id());

-- Staff (las altas se hacen desde el backend al invitar al usuario)
create policy "staff_ver" on public.staff
  for select to authenticated
  using (cafeteria_id = public.mi_cafeteria_id() or public.es_admin());

create policy "staff_editar_dueno" on public.staff
  for update to authenticated
  using (public.es_dueno() and cafeteria_id = public.mi_cafeteria_id())
  with check (cafeteria_id = public.mi_cafeteria_id());

-- Programas
create policy "programa_ver" on public.programas
  for select to authenticated
  using (cafeteria_id = public.mi_cafeteria_id() or public.es_admin());

create policy "programa_crear_dueno" on public.programas
  for insert to authenticated
  with check (public.es_dueno() and cafeteria_id = public.mi_cafeteria_id());

create policy "programa_editar_dueno" on public.programas
  for update to authenticated
  using (public.es_dueno() and cafeteria_id = public.mi_cafeteria_id())
  with check (cafeteria_id = public.mi_cafeteria_id());

-- Clientes, tarjetas y movimientos: solo lectura para el staff
-- (los cambios pasan por el backend o por las funciones de sellar/canjear)
create policy "cliente_ver" on public.clientes
  for select to authenticated
  using (cafeteria_id = public.mi_cafeteria_id() or public.es_admin());

create policy "tarjeta_ver" on public.tarjetas
  for select to authenticated
  using (cafeteria_id = public.mi_cafeteria_id() or public.es_admin());

create policy "movimiento_ver" on public.movimientos
  for select to authenticated
  using (cafeteria_id = public.mi_cafeteria_id() or public.es_admin());


-- ---------------------------------------------------------------------
--  7. FUNCIONES DE NEGOCIO (las llama la app del barista)
-- ---------------------------------------------------------------------

-- Registrar un sello escaneando el QR de la tarjeta
create or replace function public.registrar_sello(p_codigo text, p_sucursal_id uuid default null)
returns public.tarjetas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff     public.staff;
  v_tarjeta   public.tarjetas;
  v_programa  public.programas;
  v_cafeteria public.cafeterias;
  v_hoy       int;
  v_sucursal  uuid;
begin
  select * into v_staff from public.staff where id = auth.uid() and activo;
  if not found then
    raise exception 'No autorizado';
  end if;

  select * into v_cafeteria from public.cafeterias where id = v_staff.cafeteria_id;
  if v_cafeteria.estado_suscripcion not in ('prueba', 'activa') then
    raise exception 'La suscripción de la cafetería no está activa';
  end if;

  v_sucursal := coalesce(p_sucursal_id, v_staff.sucursal_id);
  if v_sucursal is not null and not exists (
    select 1 from public.sucursales
    where id = v_sucursal and cafeteria_id = v_staff.cafeteria_id and activa
  ) then
    raise exception 'Sucursal no válida';
  end if;

  select * into v_tarjeta from public.tarjetas
  where codigo = p_codigo and cafeteria_id = v_staff.cafeteria_id
  for update;
  if not found then
    raise exception 'Tarjeta no encontrada';
  end if;

  select * into v_programa from public.programas where id = v_tarjeta.programa_id;
  if not v_programa.activo then
    raise exception 'El programa de esta tarjeta no está activo';
  end if;

  if v_tarjeta.sellos_actuales >= v_programa.sellos_requeridos then
    raise exception 'La tarjeta ya completó sus sellos, primero canjea el premio';
  end if;

  select count(*) into v_hoy
  from public.movimientos
  where tarjeta_id = v_tarjeta.id
    and tipo = 'sello'
    and creado_en >= (date_trunc('day', now() at time zone v_cafeteria.zona_horaria)
                      at time zone v_cafeteria.zona_horaria);

  if v_hoy >= v_programa.max_sellos_por_dia then
    raise exception 'Esta tarjeta ya alcanzó el límite de sellos de hoy';
  end if;

  update public.tarjetas
  set sellos_actuales = sellos_actuales + 1
  where id = v_tarjeta.id
  returning * into v_tarjeta;

  insert into public.movimientos (cafeteria_id, tarjeta_id, sucursal_id, staff_id, tipo, cantidad)
  values (v_staff.cafeteria_id, v_tarjeta.id, v_sucursal, v_staff.id, 'sello', 1);

  return v_tarjeta;
end;
$$;

-- Canjear el premio cuando la tarjeta está completa
create or replace function public.canjear_premio(p_codigo text, p_sucursal_id uuid default null)
returns public.tarjetas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff     public.staff;
  v_tarjeta   public.tarjetas;
  v_programa  public.programas;
  v_cafeteria public.cafeterias;
  v_sucursal  uuid;
begin
  select * into v_staff from public.staff where id = auth.uid() and activo;
  if not found then
    raise exception 'No autorizado';
  end if;

  select * into v_cafeteria from public.cafeterias where id = v_staff.cafeteria_id;
  if v_cafeteria.estado_suscripcion not in ('prueba', 'activa') then
    raise exception 'La suscripción de la cafetería no está activa';
  end if;

  v_sucursal := coalesce(p_sucursal_id, v_staff.sucursal_id);
  if v_sucursal is not null and not exists (
    select 1 from public.sucursales
    where id = v_sucursal and cafeteria_id = v_staff.cafeteria_id and activa
  ) then
    raise exception 'Sucursal no válida';
  end if;

  select * into v_tarjeta from public.tarjetas
  where codigo = p_codigo and cafeteria_id = v_staff.cafeteria_id
  for update;
  if not found then
    raise exception 'Tarjeta no encontrada';
  end if;

  select * into v_programa from public.programas where id = v_tarjeta.programa_id;

  if v_tarjeta.sellos_actuales < v_programa.sellos_requeridos then
    raise exception 'A la tarjeta le faltan % sellos para el premio',
      v_programa.sellos_requeridos - v_tarjeta.sellos_actuales;
  end if;

  update public.tarjetas
  set sellos_actuales   = sellos_actuales - v_programa.sellos_requeridos,
      premios_canjeados = premios_canjeados + 1
  where id = v_tarjeta.id
  returning * into v_tarjeta;

  insert into public.movimientos (cafeteria_id, tarjeta_id, sucursal_id, staff_id, tipo, cantidad)
  values (v_staff.cafeteria_id, v_tarjeta.id, v_sucursal, v_staff.id, 'canje', 1);

  return v_tarjeta;
end;
$$;

-- Permisos de ejecución: solo usuarios logueados (staff)
revoke all on function public.registrar_sello(text, uuid) from public, anon;
revoke all on function public.canjear_premio(text, uuid) from public, anon;
grant execute on function public.registrar_sello(text, uuid) to authenticated;
grant execute on function public.canjear_premio(text, uuid) to authenticated;
