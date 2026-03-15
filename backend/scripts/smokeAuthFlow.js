#!/usr/bin/env node
/*
 * Smoke test de flujo auth:
 * 1) login
 * 2) me
 * 3) refresh
 */

const API_BASE = process.env.SMOKE_API_BASE || 'http://localhost:5000/api';

function printUsage() {
  console.log('Uso: npm run smoke:auth -- <email> <password>');
  console.log('Opcional: SMOKE_API_BASE=http://localhost:5000/api');
}

async function run() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password || email === '--help' || email === '-h') {
    printUsage();
    process.exit(email ? 0 : 1);
  }

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const loginPayload = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok || !loginPayload?.data?.accessToken || !loginPayload?.data?.refreshToken) {
    throw new Error(`Login falló (${loginRes.status}): ${JSON.stringify(loginPayload)}`);
  }

  const accessToken = loginPayload.data.accessToken;
  const refreshToken = loginPayload.data.refreshToken;

  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const mePayload = await meRes.json().catch(() => ({}));
  if (!meRes.ok || !mePayload?.data?.id) {
    throw new Error(`/auth/me falló (${meRes.status}): ${JSON.stringify(mePayload)}`);
  }

  const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const refreshPayload = await refreshRes.json().catch(() => ({}));
  if (!refreshRes.ok || !refreshPayload?.data?.accessToken || !refreshPayload?.data?.refreshToken) {
    throw new Error(`Refresh falló (${refreshRes.status}): ${JSON.stringify(refreshPayload)}`);
  }

  console.log('✅ Smoke auth OK');
  console.log(`Usuario: ${mePayload.data.email} (${mePayload.data.role})`);
}

run().catch((error) => {
  console.error('❌ Smoke auth falló:', error.message);
  process.exit(1);
});
