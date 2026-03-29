import { query } from '../db.js';
import { normalizeProductStock } from '../stock.js';
import { normalizeBoolean, parseNumber, slugify, toIso } from './utils.js';

function mapProductRow(row) {
  if (!row) {
    return null;
  }

  const payload = row.payload || {};
  const active = Boolean(row.active);
  return {
    ...payload,
    id: row.id,
    name: row.name,
    slug: row.slug || payload.slug || '',
    price: Number(row.price),
    promotional_price:
      row.promotional_price === null || row.promotional_price === undefined
        ? payload.promotional_price ?? null
        : Number(row.promotional_price),
    stock_quantity: row.stock_quantity,
    reserved_quantity: row.reserved_quantity,
    requires_prescription: Boolean(row.requires_prescription),
    is_antibiotic: Boolean(row.is_antibiotic),
    is_controlled: Boolean(row.is_controlled),
    active,
    status: active ? 'active' : 'inactive',
    category_id: row.category_id || null,
    category: row.category || payload.category || '',
    created_date: toIso(row.created_at),
    updated_date: toIso(row.updated_at),
    updated_at: toIso(row.updated_at),
  };
}

function normalizePromotionalPrice(value, fallback = null) {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const parsed = parseNumber(value, NaN);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : fallback;
}

function normalizeProduct(source = {}, current = null) {
  const now = new Date().toISOString();
  const base = {
    ...(current || {}),
    ...source,
  };
  const isAntibiotic = normalizeBoolean(source.is_antibiotic, current?.is_antibiotic || false);
  const isControlled = normalizeBoolean(source.is_controlled, current?.is_controlled || false);
  const requiresPrescription =
    normalizeBoolean(source.requires_prescription, current?.requires_prescription || false) ||
    isAntibiotic ||
    isControlled;
  const active =
    source.status !== undefined
      ? String(source.status) === 'active'
      : normalizeBoolean(source.active, current?.active ?? true);
  const normalizedStock = normalizeProductStock(
    {
      ...base,
      active,
      requires_prescription: requiresPrescription,
      is_antibiotic: isAntibiotic,
      is_controlled: isControlled,
    },
    now
  );
  const price = Number(parseNumber(source.price ?? current?.price ?? 0, 0).toFixed(2));
  const promotionalPrice = normalizePromotionalPrice(
    source.promotional_price ?? current?.promotional_price,
    null
  );
  const slug = slugify(source.slug ?? current?.slug ?? source.name ?? current?.name ?? '');
  const product = {
    ...base,
    id: source.id || current?.id,
    name: String(source.name ?? current?.name ?? '').trim(),
    slug,
    price,
    promotional_price: promotionalPrice,
    stock_quantity: normalizedStock.stock_quantity,
    reserved_quantity: normalizedStock.reserved_quantity,
    requires_prescription: requiresPrescription,
    is_antibiotic: isAntibiotic,
    is_controlled: isControlled,
    active,
    status: active ? 'active' : 'inactive',
    category_id: source.category_id ?? current?.category_id ?? null,
    category: String(source.category ?? current?.category ?? '').trim(),
    created_date: current?.created_date || base.created_date || now,
    updated_date: now,
    updated_at: now,
  };

  return {
    id: product.id,
    name: product.name,
    slug: product.slug || null,
    price: product.price,
    promotional_price: product.promotional_price,
    stock_quantity: product.stock_quantity,
    reserved_quantity: product.reserved_quantity,
    requires_prescription: product.requires_prescription,
    is_antibiotic: product.is_antibiotic,
    is_controlled: product.is_controlled,
    active: product.active,
    category_id: product.category_id,
    category: product.category,
    payload: product,
    created_at: product.created_date,
    updated_at: product.updated_date,
  };
}

export async function listProducts(executor = null) {
  const result = await query('SELECT * FROM products ORDER BY created_at ASC', [], executor);
  return result.rows.map(mapProductRow);
}

export async function countProducts(executor = null) {
  const result = await query('SELECT COUNT(*)::int AS total FROM products', [], executor);
  return result.rows[0]?.total || 0;
}

export async function findProductById(id, executor = null) {
  const result = await query('SELECT * FROM products WHERE id = $1', [id], executor);
  return mapProductRow(result.rows[0]);
}

export async function lockProductsByIds(ids = [], executor) {
  if (!ids.length) {
    return [];
  }

  const result = await query(
    'SELECT * FROM products WHERE id = ANY($1::text[]) ORDER BY id ASC FOR UPDATE',
    [ids],
    executor
  );
  return result.rows.map(mapProductRow);
}

export async function upsertProduct(source, executor = null) {
  const current = source.id ? await findProductById(source.id, executor) : null;
  const record = normalizeProduct(source, current);
  const result = await query(
    `
      INSERT INTO products (
        id, name, slug, price, promotional_price, stock_quantity, reserved_quantity,
        requires_prescription, is_antibiotic, is_controlled, active, category_id,
        category, payload, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14::jsonb, $15::timestamptz, $16::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        price = EXCLUDED.price,
        promotional_price = EXCLUDED.promotional_price,
        stock_quantity = EXCLUDED.stock_quantity,
        reserved_quantity = EXCLUDED.reserved_quantity,
        requires_prescription = EXCLUDED.requires_prescription,
        is_antibiotic = EXCLUDED.is_antibiotic,
        is_controlled = EXCLUDED.is_controlled,
        active = EXCLUDED.active,
        category_id = EXCLUDED.category_id,
        category = EXCLUDED.category,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      record.id,
      record.name,
      record.slug,
      record.price,
      record.promotional_price,
      record.stock_quantity,
      record.reserved_quantity,
      record.requires_prescription,
      record.is_antibiotic,
      record.is_controlled,
      record.active,
      record.category_id,
      record.category,
      JSON.stringify(record.payload),
      record.created_at,
      record.updated_at,
    ],
    executor
  );

  return mapProductRow(result.rows[0]);
}

export async function saveProductRecord(product, executor) {
  return upsertProduct(product, executor);
}

export async function deleteProduct(id, executor = null) {
  const result = await query('DELETE FROM products WHERE id = $1', [id], executor);
  return result.rowCount > 0;
}
