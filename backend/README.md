# Backend - Sistema de Préstamos

## 📁 Estructura

```
backend/
├── src/
│   ├── config/
│   │   └── supabaseClient.js
│   ├── middleware/
│   │   ├── corsConfig.js
│   │   ├── errorHandler.js
│   │   ├── isAuth.js
│   │   ├── checkRole.js
│   │   ├── checkAreaAccess.js
│   │   └── loginRateLimit.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.js
│   │   └── usuarios.js
│   ├── services/
│   │   ├── authService.js
│   │   └── supabaseHealthService.js
│   ├── utils/
│   │   ├── appError.js
│   │   ├── jwt.js
│   │   ├── password.js
│   │   └── base64url.js
│   └── index.js
├── supabase/
│   └── schema.sql
├── tests/
│   ├── supabase-config.test.js
│   ├── auth-utils.test.js
│   └── rbac-middleware.test.js
├── .env.example
└── package.json
```

## 🚀 Instalación y Uso

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

## 🛣️ Rutas Disponibles

- `GET /api` - Información general
- `GET /api/health` - Health check API
- `GET /api/health/supabase` - Health check Supabase
- `POST /api/auth/login` - Login con Bearer + refresh token
- `POST /api/auth/refresh` - Rotación de refresh token
- `GET /api/auth/me` - Perfil autenticado
- `GET /api/usuarios` - Lista usuarios (scope por rol)
- `GET /api/usuarios/:id` - Usuario por ID (scope por rol)

## 🔐 RBAC implementado

- `super_admin`: alcance global
- `admin`: alcance por área (`area_id`)
- `usuario`: acceso restringido (según rutas protegidas)

## ⚙️ Variables de entorno

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_SCHEMA=public

ACCESS_TOKEN_SECRET=change-this-access-secret
REFRESH_TOKEN_SECRET=change-this-refresh-secret
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d

LOGIN_RATE_LIMIT_WINDOW_MS=60000
LOGIN_RATE_LIMIT_MAX=8
```

## 🗄️ Supabase: arranque

1. Crear proyecto en Supabase.
2. Ejecutar `backend/supabase/schema.sql` en SQL Editor.
3. Generar hashes de contraseña en formato `scrypt$...`:

```bash
npm run hash:password -- "TuPassword123!"
```

4. Editar `backend/supabase/seed.sql` reemplazando `REPLACE_WITH_SCRYPT_HASH_*`.
5. Ejecutar `backend/supabase/seed.sql` en SQL Editor.
6. Probar conexión: `GET /api/health/supabase`.

## ✅ Checks

```bash
npm test
npm run check
```

## 🧪 Smoke test del flujo auth (paso siguiente)

Con backend levantado y usuarios seed cargados:

```bash
npm run smoke:auth -- "superadmin@demo.com" "TuPassword123!"
```

Esto valida de punta a punta:
1. `POST /api/auth/login`
2. `GET /api/auth/me`
3. `POST /api/auth/refresh`
