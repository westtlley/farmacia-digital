import dotenv from 'dotenv';
import pg from 'pg';
import { captureBackendException } from './monitoring.js';
import { logger, serializeError } from './logger.js';

dotenv.config();

const { Pool } = pg;
let pool;

function normalizeBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function buildSslConfig() {
  const sslEnabled =
    normalizeBooleanEnv(process.env.DB_SSL) ||
    normalizeBooleanEnv(process.env.DATABASE_SSL) ||
    normalizeBooleanEnv(process.env.PGSSL) ||
    process.env.NODE_ENV === 'production';

  if (!sslEnabled) {
    return undefined;
  }

  return {
    rejectUnauthorized: normalizeBooleanEnv(
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? process.env.DB_SSL_REJECT_UNAUTHORIZED,
      false
    ),
  };
}

function buildDatabaseConfig() {
  const ssl = buildSslConfig();

  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl,
    };
  }

  if (!process.env.PGHOST || !process.env.PGDATABASE) {
    throw new Error('Configure DATABASE_URL ou PGHOST/PGDATABASE para conectar ao PostgreSQL.');
  }

  return {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl,
  };
}

export function getPool() {
  if (!pool) {
    pool = new Pool(buildDatabaseConfig());
    pool.on('error', (error) => {
      logger.error('db.pool.error', {
        error: serializeError(error),
      });
      captureBackendException(error, {
        tags: {
          subsystem: 'postgres_pool',
        },
      });
    });
  }

  return pool;
}

export async function query(text, params = [], executor = null) {
  const target = executor || getPool();
  return target.query(text, params);
}

export async function withTransaction(handler) {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.error('db.transaction.rollback_failed', {
        error: serializeError(rollbackError),
      });
      captureBackendException(rollbackError, {
        tags: {
          subsystem: 'postgres_transaction',
          phase: 'rollback',
        },
      });
    }
    captureBackendException(error, {
      tags: {
        subsystem: 'postgres_transaction',
        phase: 'main',
      },
    });
    throw error;
  } finally {
    client.release();
  }
}

export async function ensureDatabaseConnection() {
  await query('SELECT 1');
}

export async function pingDatabase() {
  try {
    await query('SELECT 1');
    return {
      available: true,
    };
  } catch (error) {
    logger.error('db.healthcheck.failed', {
      error: serializeError(error),
    });
    return {
      available: false,
      reason: error.message,
    };
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
