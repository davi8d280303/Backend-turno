const { getSupabaseAdmin } = require('../config/supabaseClient');

const USERS_TABLE = 'users';
const USERS_SELECT_FIELDS = [
  'id',
  'email',
  'full_name',
  'role',
  'area_id',
  'is_active',
  'last_login_at',
  'created_at',
  'updated_at',
].join(',');

function buildHeaders(client) {
  const headers = {
    apikey: client.key,
    Authorization: `Bearer ${client.key}`,
    Accept: 'application/json',
  };

  if (client.schema) {
    headers['Accept-Profile'] = client.schema;
    headers['Content-Profile'] = client.schema;
  }

  return headers;
}

async function runQuery(url) {
  const client = getSupabaseAdmin();

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(client),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || `Supabase error ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

async function getUsers() {
  const client = getSupabaseAdmin();
  const endpoint = new URL(`${client.url}/rest/v1/${USERS_TABLE}`);

  endpoint.searchParams.set('select', USERS_SELECT_FIELDS);
  endpoint.searchParams.set('order', 'created_at.desc');

  return runQuery(endpoint);
}

async function getUserById(id) {
  const client = getSupabaseAdmin();
  const endpoint = new URL(`${client.url}/rest/v1/${USERS_TABLE}`);

  endpoint.searchParams.set('select', USERS_SELECT_FIELDS);
  endpoint.searchParams.set('id', `eq.${id}`);
  endpoint.searchParams.set('limit', '1');

  const rows = await runQuery(endpoint);
  return rows?.[0] || null;
}

module.exports = {
  getUsers,
  getUserById,
};
