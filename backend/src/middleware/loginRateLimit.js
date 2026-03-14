const AppError = require('../utils/AppError');

const windowMs = Number(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const maxAttempts = Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 5);

const attemptsByIp = new Map();

const clearExpiredEntry = (ip, entry, now) => {
  if (entry.resetAt <= now) {
    attemptsByIp.delete(ip);
    return true;
  }
  return false;
};

const loginRateLimit = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();

  const currentEntry = attemptsByIp.get(ip);
  if (currentEntry && clearExpiredEntry(ip, currentEntry, now)) {
    // No-op: entrada expirada limpiada
  }

  const entry = attemptsByIp.get(ip) || {
    count: 0,
    resetAt: now + windowMs
  };

  entry.count += 1;
  attemptsByIp.set(ip, entry);

  if (entry.count > maxAttempts) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));

    return next(new AppError('Demasiados intentos de login. Intenta nuevamente más tarde.', {
      statusCode: 429,
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      fields: {
        max_attempts: maxAttempts,
        window_ms: windowMs
      }
    }));
  }

  return next();
};

module.exports = loginRateLimit;
