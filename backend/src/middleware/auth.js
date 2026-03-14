const authService = require('../services/authService');
const AppError = require('../utils/AppError');

const extractBearerToken = (authorizationHeader = '') => {
  if (!authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice(7);
};

const requireAccessToken = (req, _res, next) => {
  try {
    const accessToken = extractBearerToken(req.headers.authorization);
    const authContext = authService.getUserFromAccessToken(accessToken);
    req.auth = authContext;
    next();
  } catch (error) {
    next(error);
  }
};

const requireAreaPrivilege = (req, _res, next) => {
  const role = req.auth?.user?.role;
  const tokenArea = req.auth?.user?.area_id;
  const requestedArea = req.params.areaId;

  if (role === 'super_admin') {
    return next();
  }

  if (role === 'admin' && tokenArea === requestedArea) {
    return next();
  }

  return next(
    new AppError('No tienes permisos para acceder a esta área', {
      statusCode: 403,
      code: 'FORBIDDEN_AREA'
    })
  );
};

module.exports = {
  requireAccessToken,
  requireAreaPrivilege
};
