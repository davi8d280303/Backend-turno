const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getSupabaseConfigStatus,
  getSupabaseAdmin,
  getSupabasePublic,
} = require('../src/config/supabaseClient');

test('getSupabaseConfigStatus returns shape', () => {
  const status = getSupabaseConfigStatus();

  assert.equal(typeof status.urlConfigured, 'boolean');
  assert.equal(typeof status.serviceRoleConfigured, 'boolean');
  assert.equal(typeof status.anonKeyConfigured, 'boolean');
  assert.equal(typeof status.schema, 'string');
});

test('getSupabaseAdmin throws without configured env', () => {
  const status = getSupabaseConfigStatus();

  if (status.urlConfigured && status.serviceRoleConfigured) {
    assert.ok(getSupabaseAdmin());
    return;
  }

  assert.throws(() => getSupabaseAdmin(), {
    message: /admin client no configurado/i,
  });
});

test('getSupabasePublic throws without configured env', () => {
  const status = getSupabaseConfigStatus();

  if (status.urlConfigured && status.anonKeyConfigured) {
    assert.ok(getSupabasePublic());
    return;
  }

  assert.throws(() => getSupabasePublic(), {
    message: /public client no configurado/i,
  });
});
