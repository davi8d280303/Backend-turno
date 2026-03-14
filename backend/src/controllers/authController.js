const authService = require('../services/authService');

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
};

const login = (req, res, next) => {
  try {
    const result = authService.login(req.body || {});
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const refresh = (req, res, next) => {
  try {
    const { refresh_token: refreshToken } = req.body || {};
    const result = authService.rotateRefreshToken(refreshToken);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const me = (req, res, next) => {
  try {
    const accessToken = extractBearerToken(req);
    const result = authService.getUserFromAccessToken(accessToken);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const logout = (req, res, next) => {
  try {
    const { refresh_token: refreshToken } = req.body || {};
    const result = authService.logout(refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  refresh,
  me,
  logout
};
