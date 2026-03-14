const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

process.env.AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS = '50';

const authUsersFixture = require('../src/fixtures/authUsers');
const { startServer } = require('../src/index');

const byRole = (role, areaId) => authUsersFixture.find(
  (fixture) => fixture.role === role && (areaId ? fixture.area_id === areaId : true)
);

const adminSistemas = byRole('admin', 'sistemas');
const superAdmin = byRole('super_admin');

const toBase64Url = (input) => Buffer.from(input)
  .toString('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

const signExpiredRefreshToken = (payload = {}) => {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify({
    user_id: adminSistemas.id,
    token_id: 'expired-token-id',
    type: 'refresh',
    iat: 1,
    exp: 2,
    ...payload
  }));

  const content = `${header}.${body}`;
  const signature = crypto
    .createHmac('sha256', process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret_change_me')
    .update(content)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${content}.${signature}`;
};

const createApiClient = (baseUrl) => ({
  async post(path, body) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const payload = await response.json();
    return { status: response.status, payload };
  },
  async get(path, token) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    const payload = await response.json();
    return { status: response.status, payload };
  }
});

test('integración auth: login, refresh y autorización por roles/áreas', async (t) => {
  const server = startServer(0);
  const port = server.address().port;
  const api = createApiClient(`http://127.0.0.1:${port}/api`);

  t.after(() => {
    server.close();
  });

  await t.test('login válido e inválido', async () => {
    const validLogin = await api.post('/auth/login', {
      email: adminSistemas.email,
      password: adminSistemas.plain_password
    });

    assert.equal(validLogin.status, 200);
    assert.equal(validLogin.payload.success, true);
    assert.equal(validLogin.payload.user.role, 'admin');
    assert.ok(validLogin.payload.access_token);
    assert.ok(validLogin.payload.refresh_token);

    const invalidLogin = await api.post('/auth/login', {
      email: adminSistemas.email,
      password: 'password-incorrecto'
    });

    assert.equal(invalidLogin.status, 401);
    assert.equal(invalidLogin.payload.code, 'INVALID_CREDENTIALS');
  });

  await t.test('refresh token válido / revocado / expirado', async () => {
    const login = await api.post('/auth/login', {
      email: adminSistemas.email,
      password: adminSistemas.plain_password
    });

    const validRefresh = await api.post('/auth/refresh', {
      refresh_token: login.payload.refresh_token
    });

    assert.equal(validRefresh.status, 200);
    assert.equal(validRefresh.payload.success, true);
    assert.ok(validRefresh.payload.refresh_token);

    const revokedRefresh = await api.post('/auth/refresh', {
      refresh_token: login.payload.refresh_token
    });

    assert.equal(revokedRefresh.status, 401);
    assert.equal(revokedRefresh.payload.code, 'REVOKED_REFRESH_TOKEN');

    const expiredRefresh = await api.post('/auth/refresh', {
      refresh_token: signExpiredRefreshToken()
    });

    assert.equal(expiredRefresh.status, 401);
    assert.equal(expiredRefresh.payload.code, 'INVALID_REFRESH_TOKEN');
  });

  await t.test('acceso a ruta protegida con token inválido', async () => {
    const protectedResponse = await api.get('/areas/sistemas/reporte', 'token-invalido');

    assert.equal(protectedResponse.status, 401);
    assert.equal(protectedResponse.payload.code, 'INVALID_ACCESS_TOKEN');
  });

  await t.test('admin fuera de su área falla y super_admin accede a cualquier área', async () => {
    const adminLogin = await api.post('/auth/login', {
      email: adminSistemas.email,
      password: adminSistemas.plain_password
    });

    const adminForbidden = await api.get('/areas/biblioteca/reporte', adminLogin.payload.access_token);
    assert.equal(adminForbidden.status, 403);
    assert.equal(adminForbidden.payload.code, 'FORBIDDEN_AREA');

    const superAdminLogin = await api.post('/auth/login', {
      email: superAdmin.email,
      password: superAdmin.plain_password
    });

    const superAdminAllowed = await api.get('/areas/biblioteca/reporte', superAdminLogin.payload.access_token);
    assert.equal(superAdminAllowed.status, 200);
    assert.equal(superAdminAllowed.payload.success, true);
    assert.equal(superAdminAllowed.payload.data.requested_area, 'biblioteca');
  });
});
