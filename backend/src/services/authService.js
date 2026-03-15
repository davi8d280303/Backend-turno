const crypto = require('crypto');
const { getSupabaseAdmin } = require('../config/supabaseClient');
const { signJwt, verifyJwt, parseExpiresIn } = require('../utils/jwt');
const { verifyPassword, sha256 } = require('../utils/password');
const AppError = require('../utils/appError');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev-access-secret-change-me';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret-change-me';
const ACCESS_TOKEN_EXPIRES = parseExpiresIn(process.env.ACCESS_TOKEN_EXPIRES, 900);
const REFRESH_TOKEN_EXPIRES = parseExpiresIn(process.env.REFRESH_TOKEN_EXPIRES, 604800);

async function findUserByEmail(email) {
  const db = getSupabaseAdmin();
  const users = await db.restSelect('users', {
    select: 'id,email,full_name,role,area_id,password_hash,is_active',
    limit: 1,
    filters: { email: `eq.${email.toLowerCase()}` },
  });

  return Array.isArray(users) ? users[0] : null;
}

async function findUserById(id) {
  const db = getSupabaseAdmin();
  const users = await db.restSelect('users', {
    select: 'id,email,full_name,role,area_id,is_active,last_login_at',
    limit: 1,
    filters: { id: `eq.${id}` },
  });

  return Array.isArray(users) ? users[0] : null;
}

function buildTokenPayload(user) {
  return {
    sub: user.id,
    role: user.role,
    area_id: user.area_id,
  };
}

async function issueRefreshToken(userId) {
  const db = getSupabaseAdmin();
  const tokenId = crypto.randomUUID();
  const token = signJwt({ sub: userId, typ: 'refresh', jti: tokenId }, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRES);
  const tokenHash = sha256(token);

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES * 1000).toISOString();
  await db.restInsert('auth_refresh_tokens', {
    id: tokenId,
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  return token;
}

async function issueAccessToken(user) {
  return signJwt({ ...buildTokenPayload(user), typ: 'access' }, ACCESS_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES);
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new AppError('Email y contraseña son requeridos.', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      fields: {
        ...(email ? {} : { email: 'Email requerido' }),
        ...(password ? {} : { password: 'Contraseña requerida' }),
      },
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
    throw new AppError('Credenciales inválidas.', {
      statusCode: 401,
      code: 'AUTH_INVALID_CREDENTIALS',
    });
  }

  const db = getSupabaseAdmin();
  await db.restUpdate('users', { last_login_at: new Date().toISOString() }, {
    filters: { id: `eq.${user.id}` },
  });

  const accessToken = await issueAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_EXPIRES,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      area_id: user.area_id,
    },
  };
}

async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw new AppError('Refresh token requerido.', {
      statusCode: 400,
      code: 'REFRESH_TOKEN_REQUIRED',
    });
  }

  let payload;
  try {
    payload = verifyJwt(refreshToken, REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new AppError('Refresh token inválido.', {
      statusCode: 401,
      code: 'REFRESH_TOKEN_INVALID',
    });
  }

  if (payload.typ !== 'refresh' || !payload.jti) {
    throw new AppError('Refresh token inválido.', {
      statusCode: 401,
      code: 'REFRESH_TOKEN_INVALID',
    });
  }

  const db = getSupabaseAdmin();
  const records = await db.restSelect('auth_refresh_tokens', {
    select: 'id,user_id,token_hash,expires_at,revoked_at',
    limit: 1,
    filters: { id: `eq.${payload.jti}` },
  });

  const record = Array.isArray(records) ? records[0] : null;
  if (!record || record.revoked_at || new Date(record.expires_at) <= new Date()) {
    throw new AppError('Refresh token expirado o revocado.', {
      statusCode: 401,
      code: 'REFRESH_TOKEN_REVOKED',
    });
  }

  if (record.token_hash !== sha256(refreshToken)) {
    throw new AppError('Refresh token inválido.', {
      statusCode: 401,
      code: 'REFRESH_TOKEN_INVALID',
    });
  }

  await db.restUpdate('auth_refresh_tokens', { revoked_at: new Date().toISOString() }, {
    filters: { id: `eq.${record.id}` },
  });

  const user = await findUserById(record.user_id);
  if (!user || !user.is_active) {
    throw new AppError('Usuario no disponible.', {
      statusCode: 401,
      code: 'USER_INACTIVE',
    });
  }

  return {
    accessToken: await issueAccessToken(user),
    refreshToken: await issueRefreshToken(user.id),
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_EXPIRES,
  };
}

async function getProfile(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError('Usuario no encontrado.', {
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  }

  return user;
}

module.exports = {
  login,
  refreshSession,
  getProfile,
  verifyAccessToken(token) {
    return verifyJwt(token, ACCESS_TOKEN_SECRET);
  },
};
