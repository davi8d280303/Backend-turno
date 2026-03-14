const crypto = require('crypto');
const AppError = require('../utils/AppError');
const authUsersFixture = require('../fixtures/authUsers');

let bcrypt = null;
try {
  // Dependencia opcional: si no está disponible, se usa fallback con scrypt.
  // eslint-disable-next-line global-require
  bcrypt = require('bcrypt');
} catch {
  bcrypt = null;
}

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret_change_me';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret_change_me';
const ACCESS_TOKEN_EXPIRES_IN = Number(process.env.ACCESS_TOKEN_EXPIRES_IN || 900); // 15 minutos
const REFRESH_TOKEN_EXPIRES_IN = Number(process.env.REFRESH_TOKEN_EXPIRES_IN || 604800); // 7 días
const PASSWORD_HASH_ROUNDS = Number(process.env.PASSWORD_HASH_ROUNDS || 10);

const hashPassword = (plainPassword) => {
  if (bcrypt) {
    return bcrypt.hashSync(plainPassword, PASSWORD_HASH_ROUNDS);
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

const verifyPassword = (plainPassword, storedHash) => {
  if (storedHash?.startsWith('scrypt$')) {
    const [, salt, hash] = storedHash.split('$');
    if (!salt || !hash) {
      return false;
    }
    const computedHash = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  }

  if (!bcrypt) {
    return false;
  }

  return bcrypt.compareSync(plainPassword, storedHash);
};

const users = authUsersFixture.map((user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  password_hash: hashPassword(user.plain_password),
  role: user.role,
  area_id: user.area_id,
  nombre: user.nombre
}));

const refreshTokenStore = new Map();

const hashRefreshToken = (refreshToken) => crypto
  .createHash('sha256')
  .update(refreshToken)
  .digest('hex');

const toBase64Url = (input) => Buffer.from(input)
  .toString('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

const fromBase64Url = (input) => {
  const base64 = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=');
  return Buffer.from(base64, 'base64').toString('utf8');
};

const signToken = (payload, secret, expiresInSeconds) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(fullPayload));
  const content = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(content)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${content}.${signature}`;
};

const verifyToken = (token, secret) => {
  const parts = token?.split('.');
  if (!parts || parts.length !== 3) {
    throw new Error('Token mal formado');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const content = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(content)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSignature) {
    throw new Error('Firma inválida');
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload));
  const now = Math.floor(Date.now() / 1000);

  if (!payload.exp || payload.exp <= now) {
    throw new Error('Token expirado');
  }

  return payload;
};

const buildAccessTokenPayload = (user) => ({
  user_id: user.id,
  role: user.role,
  area_id: user.area_id
});

const createAccessToken = (user) => signToken(
  buildAccessTokenPayload(user),
  ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES_IN
);

const createRefreshToken = (user, tokenId) => signToken(
  {
    user_id: user.id,
    token_id: tokenId,
    type: 'refresh'
  },
  REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES_IN
);

const generateTokenPair = (user) => {
  const tokenId = crypto.randomUUID();
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user, tokenId);

  refreshTokenStore.set(tokenId, {
    user_id: user.id,
    refresh_token_hash: hashRefreshToken(refreshToken),
    expires_at: Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    access_expires_in: ACCESS_TOKEN_EXPIRES_IN,
    refresh_expires_in: REFRESH_TOKEN_EXPIRES_IN
  };
};

const sanitizeUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  area_id: user.area_id,
  nombre: user.nombre
});

const findUserByCredentials = (email, password) => users.find(
  (user) => user.email === email && verifyPassword(password, user.password_hash)
);

const findUserById = (id) => users.find((user) => user.id === id);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildMissingFieldsErrors = ({ email, password }) => {
  const fields = {};

  if (!email) {
    fields.email = 'El email es obligatorio';
  } else if (!EMAIL_REGEX.test(String(email))) {
    fields.email = 'El email no es válido';
  }

  if (!password) {
    fields.password = 'La contraseña es obligatoria';
  }

  return fields;
};

const login = ({ email, password }) => {
  const fields = buildMissingFieldsErrors({ email, password });

  if (Object.keys(fields).length > 0) {
    throw new AppError('Revisa los campos marcados', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      fields
    });
  }

  const normalizedEmail = String(email).toLowerCase();
  const user = findUserByCredentials(normalizedEmail, password);

  if (!user) {
    throw new AppError('Credenciales inválidas', {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      fields: {
        email: 'Email o contraseña incorrectos',
        password: 'Email o contraseña incorrectos'
      }
    });
  }

  return {
    user: sanitizeUser(user),
    ...generateTokenPair(user)
  };
};

const rotateRefreshToken = (refreshToken) => {
  if (!refreshToken) {
    throw new AppError('Refresh token requerido', {
      statusCode: 400,
      code: 'REFRESH_TOKEN_REQUIRED'
    });
  }

  let decoded;
  try {
    decoded = verifyToken(refreshToken, REFRESH_TOKEN_SECRET);
  } catch {
    throw new AppError('Refresh token inválido o expirado', {
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN'
    });
  }

  if (decoded.type !== 'refresh' || !decoded.token_id) {
    throw new AppError('Refresh token inválido', {
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN'
    });
  }

  const storedToken = refreshTokenStore.get(decoded.token_id);
  const refreshTokenHash = hashRefreshToken(refreshToken);

  if (
    !storedToken
    || storedToken.user_id !== decoded.user_id
    || storedToken.expires_at < Date.now()
    || storedToken.refresh_token_hash !== refreshTokenHash
  ) {
    throw new AppError('Refresh token revocado o expirado', {
      statusCode: 401,
      code: 'REVOKED_REFRESH_TOKEN'
    });
  }

  const user = findUserById(decoded.user_id);
  if (!user) {
    throw new AppError('Usuario no encontrado', {
      statusCode: 404,
      code: 'USER_NOT_FOUND'
    });
  }

  refreshTokenStore.delete(decoded.token_id);

  return {
    user: sanitizeUser(user),
    ...generateTokenPair(user)
  };
};

const getUserFromAccessToken = (accessToken) => {
  if (!accessToken) {
    throw new AppError('Access token requerido', {
      statusCode: 401,
      code: 'ACCESS_TOKEN_REQUIRED'
    });
  }

  let decoded;
  try {
    decoded = verifyToken(accessToken, ACCESS_TOKEN_SECRET);
  } catch {
    throw new AppError('Access token inválido o expirado', {
      statusCode: 401,
      code: 'INVALID_ACCESS_TOKEN'
    });
  }

  const user = findUserById(decoded.user_id);
  if (!user) {
    throw new AppError('Usuario no encontrado', {
      statusCode: 404,
      code: 'USER_NOT_FOUND'
    });
  }

  return {
    user: sanitizeUser(user),
    token_payload: {
      user_id: decoded.user_id,
      role: decoded.role,
      area_id: decoded.area_id,
      exp: decoded.exp
    }
  };
};

const logout = (refreshToken) => {
  if (!refreshToken) {
    return { success: true };
  }

  try {
    const decoded = verifyToken(refreshToken, REFRESH_TOKEN_SECRET);
    if (decoded?.token_id) {
      const storedToken = refreshTokenStore.get(decoded.token_id);
      if (storedToken && storedToken.refresh_token_hash === hashRefreshToken(refreshToken)) {
        refreshTokenStore.delete(decoded.token_id);
      }
    }
  } catch {
    // Logout idempotente: ignorar refresh token inválido
  }

  return { success: true };
};

module.exports = {
  login,
  rotateRefreshToken,
  getUserFromAccessToken,
  logout
};
