import dotenv from 'dotenv';
import { createClient } from 'redis';
import { logger, serializeError } from './logger.js';

dotenv.config();

let redisClient = null;
let redisConnectPromise = null;
let lastRedisFailureAt = 0;

const FALLBACK_RETRY_MS = Number(process.env.REDIS_RETRY_AFTER_FAILURE_MS || 15000);

function ttlSecondsFromExpiresAt(expiresAt) {
  const expiresAtDate = new Date(expiresAt);
  return Math.max(1, Math.ceil((expiresAtDate.getTime() - Date.now()) / 1000));
}

function buildRedisConfig() {
  const url = String(process.env.REDIS_URL || '').trim();
  if (!url) {
    return null;
  }

  return {
    url,
    socket: {
      reconnectStrategy(retries) {
        return Math.min(retries * 250, 2000);
      },
    },
  };
}

function canRetryRedisConnection() {
  return !lastRedisFailureAt || Date.now() - lastRedisFailureAt >= FALLBACK_RETRY_MS;
}

function bindRedisEvents(client) {
  client.on('error', (error) => {
    logger.error('redis.client.error', {
      error: serializeError(error),
    });
  });

  client.on('reconnecting', () => {
    logger.warn('redis.client.reconnecting');
  });

  client.on('ready', () => {
    logger.info('redis.client.ready');
  });
}

export function isRedisConfigured() {
  return Boolean(buildRedisConfig());
}

export async function getRedisClient() {
  const config = buildRedisConfig();
  if (!config) {
    return null;
  }

  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  if (!canRetryRedisConnection()) {
    return null;
  }

  const client = createClient(config);
  bindRedisEvents(client);

  redisConnectPromise = client
    .connect()
    .then(() => {
      redisClient = client;
      redisConnectPromise = null;
      lastRedisFailureAt = 0;
      return client;
    })
    .catch((error) => {
      lastRedisFailureAt = Date.now();
      redisConnectPromise = null;
      redisClient = null;
      logger.error('redis.connection.failed', {
        error: serializeError(error),
      });
      return null;
    });

  return redisConnectPromise;
}

export async function ensureRedisConnection({ required = false } = {}) {
  const client = await getRedisClient();
  if (!client && required) {
    throw new Error('Redis nao esta disponivel.');
  }

  return client;
}

export async function pingRedis() {
  const client = await getRedisClient();
  if (!client) {
    return {
      configured: isRedisConfigured(),
      available: false,
      mode: 'fallback',
    };
  }

  try {
    const pong = await client.ping();
    return {
      configured: true,
      available: pong === 'PONG',
      mode: 'redis',
    };
  } catch (error) {
    logger.error('redis.ping.failed', {
      error: serializeError(error),
    });
    return {
      configured: true,
      available: false,
      mode: 'fallback',
    };
  }
}

export async function incrementRateLimitCounter(key, windowMs) {
  const client = await getRedisClient();
  if (!client) {
    return {
      available: false,
      store: 'fallback',
    };
  }

  try {
    const transaction = client.multi();
    transaction.incr(key);
    transaction.pTTL(key);
    const [countReply, ttlReply] = await transaction.exec();

    let count = Number(countReply);
    let ttl = Number(ttlReply);

    if (!Number.isFinite(ttl) || ttl < 0) {
      await client.pExpire(key, windowMs);
      ttl = windowMs;
    }

    if (!Number.isFinite(count)) {
      count = 0;
    }

    return {
      available: true,
      store: 'redis',
      count,
      resetAt: Date.now() + ttl,
    };
  } catch (error) {
    logger.error('redis.rate_limit.failed', {
      error: serializeError(error),
    });
    lastRedisFailureAt = Date.now();
    return {
      available: false,
      store: 'fallback',
    };
  }
}

function getSessionCacheKey(tokenHash) {
  return `session:${tokenHash}`;
}

function getSessionRevocationKey(tokenHash) {
  return `session:revoked:${tokenHash}`;
}

export async function cacheSessionRecord(tokenHash, session) {
  const client = await getRedisClient();
  if (!client || !tokenHash || !session?.expires_at) {
    return false;
  }

  try {
    await client.set(getSessionCacheKey(tokenHash), JSON.stringify(session), {
      EX: ttlSecondsFromExpiresAt(session.expires_at),
    });
    return true;
  } catch (error) {
    logger.error('redis.session_cache.write_failed', {
      error: serializeError(error),
    });
    lastRedisFailureAt = Date.now();
    return false;
  }
}

export async function getCachedSessionRecord(tokenHash) {
  const client = await getRedisClient();
  if (!client || !tokenHash) {
    return null;
  }

  try {
    const value = await client.get(getSessionCacheKey(tokenHash));
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('redis.session_cache.read_failed', {
      error: serializeError(error),
    });
    lastRedisFailureAt = Date.now();
    return null;
  }
}

export async function deleteCachedSessionRecord(tokenHash) {
  const client = await getRedisClient();
  if (!client || !tokenHash) {
    return false;
  }

  try {
    await client.del(getSessionCacheKey(tokenHash));
    return true;
  } catch (error) {
    logger.error('redis.session_cache.delete_failed', {
      error: serializeError(error),
    });
    lastRedisFailureAt = Date.now();
    return false;
  }
}

export async function markSessionRevoked(tokenHash, expiresAt) {
  const client = await getRedisClient();
  if (!client || !tokenHash || !expiresAt) {
    return false;
  }

  try {
    await client.set(getSessionRevocationKey(tokenHash), '1', {
      EX: ttlSecondsFromExpiresAt(expiresAt),
    });
    return true;
  } catch (error) {
    logger.error('redis.session_revocation.write_failed', {
      error: serializeError(error),
    });
    lastRedisFailureAt = Date.now();
    return false;
  }
}

export async function isSessionRevoked(tokenHash) {
  const client = await getRedisClient();
  if (!client || !tokenHash) {
    return false;
  }

  try {
    const value = await client.get(getSessionRevocationKey(tokenHash));
    return Boolean(value);
  } catch (error) {
    logger.error('redis.session_revocation.read_failed', {
      error: serializeError(error),
    });
    lastRedisFailureAt = Date.now();
    return false;
  }
}

export async function closeRedis() {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }

  redisClient = null;
  redisConnectPromise = null;
}
