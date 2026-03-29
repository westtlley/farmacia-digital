import { query } from '../db.js';
import { parseNumber, toIso } from './utils.js';

function mapCouponRow(row) {
  if (!row) {
    return null;
  }

  const payload = row.payload || {};
  return {
    ...payload,
    id: row.id,
    code: row.code,
    type: row.type,
    value: Number(row.value),
    description: row.description || '',
    minPurchase: Number(row.min_purchase || 0),
    maxDiscount:
      row.max_discount === null || row.max_discount === undefined ? null : Number(row.max_discount),
    validFor: row.valid_for,
    zipCodes: row.zip_codes || [],
    neighborhood: row.neighborhood || 'Todos',
    active: Boolean(row.active),
    startsAt: toIso(row.starts_at),
    endsAt: toIso(row.ends_at),
    usageLimit: row.usage_limit ?? null,
    usageCount: row.usage_count ?? 0,
    created_date: toIso(row.created_at),
    updated_date: toIso(row.updated_at),
  };
}

function normalizeCoupon(source = {}, current = null) {
  const now = new Date().toISOString();
  const payload = {
    ...(current || {}),
    ...source,
  };
  const coupon = {
    ...payload,
    id: source.id || current?.id,
    code: String(source.code ?? current?.code ?? '').trim().toUpperCase(),
    type: String(source.type ?? current?.type ?? payload.type ?? 'percentage'),
    value: Number(parseNumber(source.value ?? current?.value ?? 0, 0).toFixed(2)),
    description: String(source.description ?? current?.description ?? payload.description ?? '').trim(),
    minPurchase: Number(parseNumber(source.minPurchase ?? source.min_purchase ?? current?.minPurchase ?? 0, 0).toFixed(2)),
    maxDiscount:
      source.maxDiscount ?? source.max_discount ?? current?.maxDiscount ?? current?.max_discount ?? payload.maxDiscount ?? null,
    validFor: String(source.validFor ?? source.valid_for ?? current?.validFor ?? 'all'),
    zipCodes: source.zipCodes ?? source.zip_codes ?? current?.zipCodes ?? payload.zipCodes ?? [],
    neighborhood: String(source.neighborhood ?? current?.neighborhood ?? payload.neighborhood ?? 'Todos'),
    active: source.active ?? current?.active ?? true,
    startsAt: source.startsAt ?? source.starts_at ?? current?.startsAt ?? payload.startsAt ?? null,
    endsAt: source.endsAt ?? source.ends_at ?? source.expiresAt ?? current?.endsAt ?? payload.endsAt ?? payload.expiresAt ?? null,
    usageLimit: source.usageLimit ?? source.usage_limit ?? current?.usageLimit ?? null,
    usageCount: source.usageCount ?? source.usage_count ?? current?.usageCount ?? 0,
    created_date: current?.created_date || payload.created_date || now,
    updated_date: now,
  };

  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    description: coupon.description,
    min_purchase: coupon.minPurchase,
    max_discount: coupon.maxDiscount === null || coupon.maxDiscount === undefined ? null : Number(parseNumber(coupon.maxDiscount, 0).toFixed(2)),
    valid_for: coupon.validFor,
    zip_codes: coupon.zipCodes,
    neighborhood: coupon.neighborhood,
    active: coupon.active,
    starts_at: coupon.startsAt,
    ends_at: coupon.endsAt,
    usage_limit: coupon.usageLimit,
    usage_count: coupon.usageCount,
    payload: coupon,
    created_at: coupon.created_date,
    updated_at: coupon.updated_date,
  };
}

export async function listCoupons(executor = null) {
  const result = await query('SELECT * FROM coupons ORDER BY code ASC', [], executor);
  return result.rows.map(mapCouponRow);
}

export async function findCouponByCode(code, executor = null) {
  const result = await query('SELECT * FROM coupons WHERE code = $1', [String(code || '').trim().toUpperCase()], executor);
  return mapCouponRow(result.rows[0]);
}

export async function upsertCoupon(source, executor = null) {
  const current = source.code ? await findCouponByCode(source.code, executor) : null;
  const record = normalizeCoupon(source, current);
  const result = await query(
    `
      INSERT INTO coupons (
        id, code, type, value, description, min_purchase, max_discount, valid_for,
        zip_codes, neighborhood, active, starts_at, ends_at, usage_limit,
        usage_count, payload, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9::jsonb, $10, $11, $12::timestamptz, $13::timestamptz, $14,
        $15, $16::jsonb, $17::timestamptz, $18::timestamptz
      )
      ON CONFLICT (code) DO UPDATE SET
        type = EXCLUDED.type,
        value = EXCLUDED.value,
        description = EXCLUDED.description,
        min_purchase = EXCLUDED.min_purchase,
        max_discount = EXCLUDED.max_discount,
        valid_for = EXCLUDED.valid_for,
        zip_codes = EXCLUDED.zip_codes,
        neighborhood = EXCLUDED.neighborhood,
        active = EXCLUDED.active,
        starts_at = EXCLUDED.starts_at,
        ends_at = EXCLUDED.ends_at,
        usage_limit = EXCLUDED.usage_limit,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      record.id,
      record.code,
      record.type,
      record.value,
      record.description,
      record.min_purchase,
      record.max_discount,
      record.valid_for,
      JSON.stringify(record.zip_codes || []),
      record.neighborhood,
      record.active,
      record.starts_at,
      record.ends_at,
      record.usage_limit,
      record.usage_count,
      JSON.stringify(record.payload),
      record.created_at,
      record.updated_at,
    ],
    executor
  );

  return mapCouponRow(result.rows[0]);
}

export async function incrementCouponUsage(code, executor = null) {
  const result = await query(
    `
      UPDATE coupons
      SET usage_count = usage_count + 1, updated_at = NOW()
      WHERE code = $1
      RETURNING *
    `,
    [String(code || '').trim().toUpperCase()],
    executor
  );

  return mapCouponRow(result.rows[0]);
}
