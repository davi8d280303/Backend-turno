const crypto = require('crypto');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret_change_me';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret_change_me';
const ACCESS_TOKEN_EXPIRES_IN = Number(process.env.ACCESS_TOKEN_EXPIRES_IN || 900); // 15 minutos
const REFRESH_TOKEN_EXPIRES_IN = Number(process.env.REFRESH_TOKEN_EXPIRES_IN || 604800); // 7 días

const users = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    area_id: 'sistemas',
    nombre: 'Administrador'
  },
  {
    id: 2,
    username: 'operador',
    password: 'operador123',
    role: 'operador',
    area_id: 'biblioteca',
    nombre: 'Operador Biblioteca'
  }
];

const refreshTokenStore = new Map();

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
  role: user.role,
  area_id: user.area_id,
  nombre: user.nombre
});

const findUserByCredentials = (username, password) => users.find(
  (user) => user.username === username && user.password === password
);

const findUserById = (id) => users.find((user) => user.id === id);

const login = ({ username, password }) => {
  if (!username || !password) {
    const error = new Error('Usuario y contraseña son obligatorios');
    error.status = 400;
    throw error;
  }

  const user = findUserByCredentials(username, password);
  if (!user) {
    const error = new Error('Credenciales inválidas');
    error.status = 401;
    throw error;
  }

  return {
    user: sanitizeUser(user),
    ...generateTokenPair(user)
  };
};

const rotateRefreshToken = (refreshToken) => {
  if (!refreshToken) {
    const error = new Error('Refresh token requerido');
    error.status = 400;
    throw error;
  }

  let decoded;
  try {
    decoded = verifyToken(refreshToken, REFRESH_TOKEN_SECRET);
  } catch {
    const error = new Error('Refresh token inválido o expirado');
    error.status = 401;
    throw error;
  }

  if (decoded.type !== 'refresh' || !decoded.token_id) {
    const error = new Error('Refresh token inválido');
    error.status = 401;
    throw error;
  }

  const storedToken = refreshTokenStore.get(decoded.token_id);
  if (!storedToken || storedToken.user_id !== decoded.user_id || storedToken.expires_at < Date.now()) {
    const error = new Error('Refresh token revocado o expirado');
    error.status = 401;
    throw error;
  }

  const user = findUserById(decoded.user_id);
  if (!user) {
    const error = new Error('Usuario no encontrado');
    error.status = 404;
    throw error;
  }

  refreshTokenStore.delete(decoded.token_id);

  return {
    user: sanitizeUser(user),
    ...generateTokenPair(user)
  };
};

const getUserFromAccessToken = (accessToken) => {
  if (!accessToken) {
    const error = new Error('Access token requerido');
    error.status = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = verifyToken(accessToken, ACCESS_TOKEN_SECRET);
  } catch {
    const error = new Error('Access token inválido o expirado');
    error.status = 401;
    throw error;
  }

  const user = findUserById(decoded.user_id);
  if (!user) {
    const error = new Error('Usuario no encontrado');
    error.status = 404;
    throw error;
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
      refreshTokenStore.delete(decoded.token_id);
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
