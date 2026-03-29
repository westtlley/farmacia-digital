import { logger } from '../logger.js';
import { incrementRateLimitCounter } from '../redis.js';
import { getClientIp } from './security.js';

function createStore() {
  const entries = new Map();

  function purgeExpired(now) {
    for (const [key, entry] of entries.entries()) {
      if (entry.resetAt <= now) {
        entries.delete(key);
      }
    }
  }

  return {
    increment(key, windowMs) {
      const now = Date.now();
      purgeExpired(now);

      const current = entries.get(key);
      if (!current || current.resetAt <= now) {
        const next = {
          count: 1,
          resetAt: now + windowMs,
        };
        entries.set(key, next);
        return next;
      }

      current.count += 1;
      entries.set(key, current);
      return current;
    },
  };
}

export function createRateLimit({
  name,
  windowMs,
  max,
  message = 'Muitas tentativas. Tente novamente em alguns minutos.',
  keyGenerator = (req) => getClientIp(req),
}) {
  const store = createStore();

  return async function rateLimitMiddleware(req, res, next) {
    try {
      const key = `${name}:${keyGenerator(req) || 'anonymous'}`;
      let current = await incrementRateLimitCounter(key, windowMs);
      if (!current.available) {
        current = {
          ...store.increment(key, windowMs),
          available: true,
          store: 'fallback_memory',
        };
        if (current.count === 1) {
          logger.warn('security.rate_limit.fallback_memory', {
            limiter: name,
            path: req.path,
            ip: getClientIp(req),
            request_id: req.requestId || null,
          });
        }
      }

      if (current.count <= max) {
        const remaining = Math.max(0, max - current.count);
        const resetAt = current.resetAt || Date.now() + windowMs;
        res.setHeader('X-RateLimit-Limit', String(max));
        res.setHeader('X-RateLimit-Remaining', String(remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
        next();
        return;
      }

      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - Date.now()) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));
      logger.warn('security.rate_limit.triggered', {
        limiter: name,
        path: req.path,
        ip: getClientIp(req),
        request_id: req.requestId || null,
        store: current.store,
        retry_after_seconds: retryAfterSeconds,
      });
      res.status(429).json({ error: message });
    } catch (error) {
      next(error);
    }
  };
}
