const { getSupabaseAdmin } = require('../config/supabaseClient');

async function checkSupabaseConnection() {
  const supabase = getSupabaseAdmin();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const data = await supabase.restSelect('areas', 'id', {
      limit: 1,
      signal: controller.signal,
    });

    return {
      connected: true,
      checkedTable: 'areas',
      rowsRead: Array.isArray(data) ? data.length : 0,
      note: 'Conexión REST API válida.',
    };
  } catch (error) {
    const err = new Error(`Supabase no disponible: ${error.message}`);
    err.statusCode = error.statusCode || (error.name === 'AbortError' ? 504 : 503);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  checkSupabaseConnection,
};
