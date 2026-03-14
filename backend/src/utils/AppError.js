class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR', fields = null } = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    Error.captureStackTrace?.(this, AppError);
  }
}

module.exports = AppError;
