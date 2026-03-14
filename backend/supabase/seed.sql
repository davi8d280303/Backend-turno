-- =========================================================
-- Seed inicial RBAC para entorno de desarrollo
-- Requiere: schema.sql ejecutado previamente
-- =========================================================

-- Áreas base
insert into public.areas (name, description)
values
  ('Direccion', 'Área global para supervisión'),
  ('Computo', 'Área de cómputo e infraestructura'),
  ('Laboratorio', 'Área de laboratorio')
on conflict (name) do update
set description = excluded.description;

-- Limpieza opcional de usuarios demo
delete from public.users
where email in (
  'superadmin@demo.com',
  'admin.computo@demo.com',
  'usuario.labo@demo.com'
);

-- IMPORTANTE:
-- Reemplaza los valores REPLACE_WITH_SCRYPT_HASH_* con hashes generados por:
-- npm run hash:password -- "TuPassword123!"

-- super_admin (scope global)
insert into public.users (
  email,
  password_hash,
  full_name,
  role,
  area_id,
  is_active
)
select
  'superadmin@demo.com',
  'REPLACE_WITH_SCRYPT_HASH_SUPER_ADMIN',
  'Super Administrador',
  'super_admin'::user_role,
  null,
  true
where not exists (
  select 1 from public.users u where u.email = 'superadmin@demo.com'
);

-- admin (scope área Computo)
insert into public.users (
  email,
  password_hash,
  full_name,
  role,
  area_id,
  is_active
)
select
  'admin.computo@demo.com',
  'REPLACE_WITH_SCRYPT_HASH_ADMIN',
  'Admin Cómputo',
  'admin'::user_role,
  a.id,
  true
from public.areas a
where a.name = 'Computo'
and not exists (
  select 1 from public.users u where u.email = 'admin.computo@demo.com'
);

-- usuario (scope área Laboratorio)
insert into public.users (
  email,
  password_hash,
  full_name,
  role,
  area_id,
  is_active
)
select
  'usuario.labo@demo.com',
  'REPLACE_WITH_SCRYPT_HASH_USUARIO',
  'Usuario Laboratorio',
  'usuario'::user_role,
  a.id,
  true
from public.areas a
where a.name = 'Laboratorio'
and not exists (
  select 1 from public.users u where u.email = 'usuario.labo@demo.com'
);

-- Validación rápida
select id, email, full_name, role, area_id, is_active
from public.users
where email in (
  'superadmin@demo.com',
  'admin.computo@demo.com',
  'usuario.labo@demo.com'
)
order by role, email;
