const test = require('node:test');
const assert = require('node:assert/strict');

process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = '60000';
process.env.AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS = '2';

const loginRateLimit = require('../src/middleware/loginRateLimit');

test('loginRateLimit bloquea cuando supera el máximo de intentos', () => {
  const req = { ip: '127.0.0.1', headers: {} };
  const res = {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    }
  };

  const nextCalls = [];
  const next = (err) => {
    nextCalls.push(err || null);
  };

  loginRateLimit(req, res, next);
  loginRateLimit(req, res, next);
  loginRateLimit(req, res, next);

  assert.equal(nextCalls[0], null);
  assert.equal(nextCalls[1], null);
  assert.ok(nextCalls[2]);
  assert.equal(nextCalls[2].statusCode, 429);
  assert.equal(nextCalls[2].code, 'LOGIN_RATE_LIMIT_EXCEEDED');
  assert.ok(Number(res.headers['Retry-After']) > 0);
});
