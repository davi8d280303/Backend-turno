const test = require('node:test');
const assert = require('node:assert/strict');

const authService = require('../src/services/authService');

test('login retorna tokens y payload esperado en access token', () => {
  const login = authService.login({ username: 'admin', password: 'admin123' });

  assert.equal(login.user.username, 'admin');
  assert.ok(login.access_token);
  assert.ok(login.refresh_token);

  const me = authService.getUserFromAccessToken(login.access_token);

  assert.equal(me.token_payload.user_id, 1);
  assert.equal(me.token_payload.role, 'admin');
  assert.equal(me.token_payload.area_id, 'sistemas');
});

test('refresh rota el refresh token anterior', () => {
  const login = authService.login({ username: 'operador', password: 'operador123' });

  const rotated = authService.rotateRefreshToken(login.refresh_token);
  assert.ok(rotated.refresh_token);

  assert.throws(
    () => authService.rotateRefreshToken(login.refresh_token),
    /Refresh token revocado o expirado/
  );
});
