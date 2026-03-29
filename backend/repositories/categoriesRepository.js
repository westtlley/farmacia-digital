import { query } from '../db.js';
import { slugify, toIso } from './utils.js';

function mapCategoryRow(row) {
  if (!row) {
    return null;
  }

  return {
    ...(row.payload || {}),
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    created_date: toIso(row.created_at),
    updated_date: toIso(row.updated_at),
  };
}

function normalizeCategory(source = {}, current = null) {
  const now = new Date().toISOString();
  const payload = {
    ...(current || {}),
    ...source,
  };
  const name = String(source.name ?? current?.name ?? '').trim();
  const slug = slugify(source.slug ?? current?.slug ?? name);
  const description = String(source.description ?? current?.description ?? payload.description ?? '').trim();

  return {
    id: source.id || current?.id,
    name,
    slug,
    description,
    payload: {
      ...payload,
      id: source.id || current?.id,
      name,
      slug,
      description,
      created_date: current?.created_date || payload.created_date || now,
      updated_date: now,
    },
    created_at: current?.created_date || payload.created_date || now,
    updated_at: now,
  };
}

export async function listCategories(executor = null) {
  const result = await query('SELECT * FROM categories ORDER BY created_at ASC', [], executor);
  return result.rows.map(mapCategoryRow);
}

export async function countCategories(executor = null) {
  const result = await query('SELECT COUNT(*)::int AS total FROM categories', [], executor);
  return result.rows[0]?.total || 0;
}

export async function findCategoryById(id, executor = null) {
  const result = await query('SELECT * FROM categories WHERE id = $1', [id], executor);
  return mapCategoryRow(result.rows[0]);
}

export async function upsertCategory(source, executor = null) {
  const current = source.id ? await findCategoryById(source.id, executor) : null;
  const record = normalizeCategory(source, current);
  const result = await query(
    `
      INSERT INTO categories (id, name, slug, description, payload, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz, $7::timestamptz)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      record.id,
      record.name,
      record.slug,
      record.description,
      JSON.stringify(record.payload),
      record.created_at,
      record.updated_at,
    ],
    executor
  );

  return mapCategoryRow(result.rows[0]);
}

export async function deleteCategory(id, executor = null) {
  const result = await query('DELETE FROM categories WHERE id = $1', [id], executor);
  return result.rowCount > 0;
}
