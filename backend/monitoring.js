import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

let monitoringEnabled = false;

function parseSampleRate(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 0), 1);
}

function sanitizeMonitoringExtra(extra = {}) {
  const cloned = { ...extra };
  if (cloned.headers) {
    const safeHeaders = { ...cloned.headers };
    delete safeHeaders.authorization;
    delete safeHeaders.cookie;
    cloned.headers = safeHeaders;
  }

  return cloned;
}

export function initializeMonitoring() {
  const dsn = String(process.env.SENTRY_DSN || '').trim();
  if (!dsn) {
    logger.info('monitoring.disabled', {
      provider: 'sentry',
      reason: 'missing_dsn',
    });
    return false;
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || process.env.RENDER_GIT_COMMIT || undefined,
    tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0),
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      return event;
    },
  });

  monitoringEnabled = true;
  logger.info('monitoring.initialized', {
    provider: 'sentry',
  });
  return true;
}

export function isMonitoringEnabled() {
  return monitoringEnabled;
}

export function getMonitoringStatus() {
  return {
    enabled: monitoringEnabled,
    provider: monitoringEnabled ? 'sentry' : 'disabled',
  };
}

export function captureBackendException(error, { req, tags = {}, extra = {} } = {}) {
  if (!monitoringEnabled || !error) {
    return;
  }

  Sentry.withScope((scope) => {
    Object.entries(tags).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        scope.setTag(key, String(value));
      }
    });

    if (req) {
      scope.setTag('endpoint', req.originalUrl || req.path);
      scope.setContext('request', sanitizeMonitoringExtra({
        method: req.method,
        path: req.originalUrl || req.path,
        request_id: req.requestId,
        headers: req.headers,
      }));

      if (req.auth?.user?.id) {
        scope.setUser({
          id: String(req.auth.user.id),
        });
      }
    }

    scope.setContext('extra', sanitizeMonitoringExtra(extra));
    Sentry.captureException(error);
  });
}
