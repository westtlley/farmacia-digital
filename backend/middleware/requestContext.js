import crypto from 'crypto';
import { logger } from '../logger.js';
import { getClientIp } from './security.js';

function shouldLogAllRequests() {
  const value = String(process.env.LOG_HTTP_REQUESTS || '').trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

export function buildRequestLogMeta(req, extra = {}) {
  return {
    request_id: req.requestId || null,
    endpoint: req.originalUrl || req.path,
    method: req.method,
    ip: getClientIp(req),
    user_id: req.auth?.user?.id || null,
    ...extra,
  };
}

export function requestContextMiddleware(req, res, next) {
  req.requestId = String(req.headers['x-request-id'] || '').trim() || crypto.randomUUID();
  req.startedAt = Date.now();
  res.setHeader('X-Request-Id', req.requestId);

  res.on('finish', () => {
    if (!shouldLogAllRequests() && res.statusCode < 500) {
      return;
    }

    logger.info('http.request.completed', buildRequestLogMeta(req, {
      status_code: res.statusCode,
      duration_ms: Date.now() - (req.startedAt || Date.now()),
    }));
  });

  next();
}
