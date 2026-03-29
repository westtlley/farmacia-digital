import { query } from '../db.js';
import { normalizeEmail, toIso } from './utils.js';

function mapAdminRow(row) {
  if (!row) {
    return null;
  }

  const payload = row.payload || {};
  return {
    ...payload,
    id: row.id,
    email: row.email,
    full_name: row.full_name || payload.full_name || '',
    password_hash: row.password_hash,
    password_salt: row.password_salt,
    role: row.role,
    active: Boolean(row.active),
    last_login_at: toIso(row.last_login_at),
    created_date: toIso(row.created_at),
    updated_date: toIso(row.updated_at),
  };
}

function normalizeAdmin(source = {}, current = null) {
  const now = new Date().toISOString();
  const payload = {
    ...(current || {}),
    ...source,
  };
  const admin = {
    ...payload,
    id: source.id || current?.id,
    email: normalizeEmail(source.email ?? current?.email ?? ''),
    full_name: String(source.full_name ?? current?.full_name ?? payload.full_name ?? 'Administrador').trim(),
    password_hash: source.password_hash ?? current?.password_hash,
    password_salt: source.password_salt ?? current?.password_salt,
    role: String(source.role ?? current?.role ?? 'admin'),
    active: source.active ?? current?.active ?? true,
    last_login_at: source.last_login_at ?? current?.last_login_at ?? null,
    created_date: current?.created_date || payload.created_date || now,
    updated_date: now,
  };

  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    password_hash: admin.password_hash,
    password_salt: admin.password_salt,
    role: admin.role,
    active: admin.active,
    payload: admin,
    last_login_at: admin.last_login_at,
    created_at: admin.created_date,
    updated_at: admin.updated_date,
  };
}

export async function listAdmins(executor = null) {
  const result = await query('SELECT * FROM admin_users ORDER BY created_at ASC', [], executor);
  return result.rows.map(mapAdminRow);
}

export async function countAdmins(executor = null) {
  const result = await query('SELECT COUNT(*)::int AS total FROM admin_users', [], executor);
  return result.rows[0]?.total || 0;
}

export async function findAdminById(id, executor = null) {
  const result = await query('SELECT * FROM admin_users WHERE id = $1', [id], executor);
  return mapAdminRow(result.rows[0]);
}

export async function findAdminByEmail(email, executor = null) {
  const normalizedEmail = normalizeEmail(email);
  const result = await query('SELECT * FROM admin_users WHERE email = $1', [normalizedEmail], executor);
  return mapAdminRow(result.rows[0]);
}

export async function upsertAdmin(source, executor = null) {
  const current = source.id
    ? await findAdminById(source.id, executor)
    : await findAdminByEmail(source.email, executor);
  const record = normalizeAdmin(source, current);
  const result = await query(
    `
      INSERT INTO admin_users (
        id, email, full_name, password_hash, password_salt, role,
        active, payload, last_login_at, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8::jsonb, $9::timestamptz, $10::timestamptz, $11::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        password_salt = EXCLUDED.password_salt,
        role = EXCLUDED.role,
        active = EXCLUDED.active,
        payload = EXCLUDED.payload,
        last_login_at = EXCLUDED.last_login_at,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      record.id,
      record.email,
      record.full_name,
      record.password_hash,
      record.password_salt,
      record.role,
      record.active,
      JSON.stringify(record.payload),
      record.last_login_at,
      record.created_at,
      record.updated_at,
    ],
    executor
  );

  return mapAdminRow(result.rows[0]);
}

export async function touchAdminLogin(id, executor = null) {
  const result = await query(
    `
      UPDATE admin_users
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id],
    executor
  );

  return mapAdminRow(result.rows[0]);
}
