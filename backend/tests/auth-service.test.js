const test = require('node:test');
const assert = require('node:assert/strict');

const authService = require('../src/services/authService');

test('login retorna tokens y payload esperado en access token', () => {
  const login = authService.login({ email: 'admin.sistemas@turno.local', password: 'admin123' });

  assert.equal(login.user.username, 'admin_sistemas');
  assert.equal(login.user.email, 'admin.sistemas@turno.local');
  assert.ok(login.access_token);
  assert.ok(login.refresh_token);

  const me = authService.getUserFromAccessToken(login.access_token);

  assert.equal(me.token_payload.user_id, 1);
  assert.equal(me.token_payload.role, 'admin');
  assert.equal(me.token_payload.area_id, 'sistemas');
});

test('login valida campos por separado', () => {
  assert.throws(
    () => authService.login({ email: '', password: '' }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.fields.email, 'El email es obligatorio');
      assert.equal(error.fields.password, 'La contraseña es obligatoria');
      return true;
    }
  );
});

test('login responde con error seguro para credenciales inválidas', () => {
  assert.throws(
    () => authService.login({ email: 'noexiste@turno.local', password: 'incorrecta' }),
    (error) => {
      assert.equal(error.message, 'Credenciales inválidas');
      assert.equal(error.code, 'INVALID_CREDENTIALS');
      assert.equal(error.fields.email, 'Email o contraseña incorrectos');
      assert.equal(error.fields.password, 'Email o contraseña incorrectos');
      return true;
    }
  );
});

test('refresh rota el refresh token anterior', () => {
  const login = authService.login({ email: 'operador@turno.local', password: 'operador123' });

  const rotated = authService.rotateRefreshToken(login.refresh_token);
  assert.ok(rotated.refresh_token);

  assert.throws(
    () => authService.rotateRefreshToken(login.refresh_token),
    /Refresh token revocado o expirado/
  );
});
