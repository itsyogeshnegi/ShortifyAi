import { recordBug } from '../utils/bugTracker.js';

export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, req, res, _next) {
  const status = error.statusCode || 500;
  if (status >= 500 && !req.originalUrl.includes('favicon.ico')) {
    recordBug({
      source: `API (${req.method} ${req.originalUrl})`,
      message: error.message,
      stack: error.stack,
      metadata: { path: req.originalUrl, method: req.method, statusCode: status }
    });
  }

  res.status(status).json({
    message: error.message || 'Server error',
    details: process.env.NODE_ENV === 'production' ? undefined : error.stack
  });
}
