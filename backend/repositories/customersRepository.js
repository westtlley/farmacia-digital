import { query } from '../db.js';
import { normalizeEmail, normalizePhone, toIso } from './utils.js';

function mapCustomerRow(row) {
  if (!row) {
    return null;
  }

  const payload = row.payload || {};
  return {
    ...payload,
    id: row.id,
    name: row.name,
    full_name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    zipcode: row.zipcode || payload.zipcode || '',
    created_date: toIso(row.created_at),
    updated_date: toIso(row.updated_at),
  };
}

function normalizeCustomer(source = {}, current = null) {
  const now = new Date().toISOString();
  const payload = {
    ...(current || {}),
    ...source,
  };
  const email = normalizeEmail(source.email ?? current?.email ?? payload.email ?? '');
  const phone = normalizePhone(source.phone ?? current?.phone ?? payload.phone ?? '');
  const zipcode = String(
    source.zipcode ??
      source.customer_zipcode ??
      source.delivery_address?.zipcode ??
      current?.zipcode ??
      payload.zipcode ??
      ''
  ).trim();
  const customer = {
    ...payload,
    id: source.id || current?.id,
    name: String(source.name ?? source.customer_name ?? current?.name ?? payload.name ?? 'Cliente').trim(),
    email,
    phone,
    zipcode,
    created_date: current?.created_date || payload.created_date || now,
    updated_date: now,
  };

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone || null,
    email: customer.email || null,
    zipcode: customer.zipcode || null,
    payload: customer,
    created_at: customer.created_date,
    updated_at: customer.updated_date,
  };
}

export async function listCustomers(executor = null) {
  const result = await query('SELECT * FROM customers ORDER BY created_at DESC', [], executor);
  return result.rows.map(mapCustomerRow);
}

export async function countCustomers(executor = null) {
  const result = await query('SELECT COUNT(*)::int AS total FROM customers', [], executor);
  return result.rows[0]?.total || 0;
}

export async function findCustomerById(id, executor = null) {
  const result = await query('SELECT * FROM customers WHERE id = $1', [id], executor);
  return mapCustomerRow(result.rows[0]);
}

export async function findCustomerByIdentity(identity = {}, executor = null) {
  const email = normalizeEmail(identity.email || '');
  const phone = normalizePhone(identity.phone || '');

  if (!email && !phone) {
    return null;
  }

  const result = await query(
    `
      SELECT *
      FROM customers
      WHERE ($1::text <> '' AND email = $1)
         OR ($2::text <> '' AND phone = $2)
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [email, phone],
    executor
  );

  return mapCustomerRow(result.rows[0]);
}

export async function upsertCustomer(source, executor = null) {
  const current = source.id
    ? await findCustomerById(source.id, executor)
    : await findCustomerByIdentity(source, executor);
  const record = normalizeCustomer(source, current);
  const result = await query(
    `
      INSERT INTO customers (id, name, phone, email, zipcode, payload, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz, $8::timestamptz)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        zipcode = EXCLUDED.zipcode,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      record.id,
      record.name,
      record.phone,
      record.email,
      record.zipcode,
      JSON.stringify(record.payload),
      record.created_at,
      record.updated_at,
    ],
    executor
  );

  return mapCustomerRow(result.rows[0]);
}
