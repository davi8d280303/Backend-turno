-- ======================================================
-- Esquema base RBAC + áreas para sistema de préstamos
-- Proyecto: Backend-turno
-- Motor: PostgreSQL (Supabase)
-- ======================================================

create extension if not exists "pgcrypto";

-- Enum de roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'usuario');
  END IF;
END$$;

-- Áreas
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Usuarios de dominio
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  role user_role not null default 'usuario',
  area_id uuid references public.areas(id),
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_format_chk check (position('@' in email) > 1)
);

-- Recursos
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  area_id uuid not null references public.areas(id),
  status text not null default 'disponible',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Préstamos
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id),
  requester_id uuid not null references public.users(id),
  approved_by uuid references public.users(id),
  status text not null default 'pendiente',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  due_at timestamptz,
  returned_at timestamptz,
  notes text
);

-- Auditoría
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Índices clave
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_area_id on public.users(area_id);
create index if not exists idx_resources_area_id on public.resources(area_id);
create index if not exists idx_loans_status on public.loans(status);
create index if not exists idx_loans_resource_id on public.loans(resource_id);

-- Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_areas_updated_at on public.areas;
create trigger trg_areas_updated_at
before update on public.areas
for each row execute function public.set_updated_at();

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_resources_updated_at on public.resources;
create trigger trg_resources_updated_at
before update on public.resources
for each row execute function public.set_updated_at();

-- Seeds mínimos
insert into public.areas (name, description)
values
  ('Direccion', 'Área global para supervisión'),
  ('Computo', 'Área de cómputo e infraestructura'),
  ('Laboratorio', 'Área de laboratorio')
on conflict (name) do nothing;
