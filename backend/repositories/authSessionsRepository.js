import { query } from '../db.js';
import { toIso } from './utils.js';

function mapSessionRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    token_hash: row.token_hash,
    role: row.role,
    user_id: row.user_id,
    created_date: toIso(row.created_at),
    expires_at: toIso(row.expires_at),
  };
}

export async function cleanupExpiredSessions(executor = null) {
  await query('DELETE FROM auth_sessions WHERE expires_at <= NOW()', [], executor);
}

export async function createSession(source, executor = null) {
  await query(
    'DELETE FROM auth_sessions WHERE user_id = $1 AND role = $2',
    [source.user_id, source.role],
    executor
  );

  const result = await query(
    `
      INSERT INTO auth_sessions (id, token_hash, role, user_id, created_at, expires_at)
      VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz)
      RETURNING *
    `,
    [
      source.id,
      source.token_hash,
      source.role,
      source.user_id,
      source.created_date,
      source.expires_at,
    ],
    executor
  );

  return mapSessionRow(result.rows[0]);
}

export async function findSessionByTokenHash(tokenHash, executor = null) {
  const result = await query(
    'SELECT * FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW()',
    [tokenHash],
    executor
  );
  return mapSessionRow(result.rows[0]);
}

export async function deleteSessionByTokenHash(tokenHash, executor = null) {
  await query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash], executor);
}
