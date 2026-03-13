const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SCHEMA = process.env.SUPABASE_SCHEMA || 'public';

const hasServiceCredentials = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const hasAnonCredentials = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function buildClient(key) {
  return {
    url: SUPABASE_URL,
    key,
    schema: SUPABASE_SCHEMA,
    async restSelect(table, select = '*', { limit = 1, signal } = {}) {
      const endpoint = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
      endpoint.searchParams.set('select', select);
      endpoint.searchParams.set('limit', String(limit));

      const response = await fetch(endpoint.toString(), {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
          Prefer: 'count=exact',
        },
        signal,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const error = new Error(payload?.message || `Supabase error ${response.status}`);
        error.statusCode = response.status;
        throw error;
      }

      return payload;
    },
  };
}

function getSupabaseAdmin() {
  if (!hasServiceCredentials) {
    const error = new Error(
      'Supabase admin client no configurado. Revisa SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.'
    );
    error.statusCode = 500;
    throw error;
  }

  return buildClient(SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabasePublic() {
  if (!hasAnonCredentials) {
    const error = new Error(
      'Supabase public client no configurado. Revisa SUPABASE_URL y SUPABASE_ANON_KEY.'
    );
    error.statusCode = 500;
    throw error;
  }

  return buildClient(SUPABASE_ANON_KEY);
}

function getSupabaseConfigStatus() {
  return {
    urlConfigured: Boolean(SUPABASE_URL),
    serviceRoleConfigured: Boolean(SUPABASE_SERVICE_ROLE_KEY),
    anonKeyConfigured: Boolean(SUPABASE_ANON_KEY),
    schema: SUPABASE_SCHEMA,
  };
}

module.exports = {
  getSupabaseAdmin,
  getSupabasePublic,
  getSupabaseConfigStatus,
};
