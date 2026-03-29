import { query } from '../db.js';
import { DEFAULT_SETTINGS_ID } from '../defaultData.js';
import { parseNumber, toIso } from './utils.js';

function mapSettingsRow(row) {
  if (!row) {
    return null;
  }

  const payload = row.payload || {};
  return {
    ...payload,
    id: row.id,
    pharmacy_name: row.store_name || payload.pharmacy_name || payload.store_name || '',
    store_name: row.store_name || payload.store_name || payload.pharmacy_name || '',
    phone: row.phone || payload.phone || '',
    whatsapp: row.whatsapp || payload.whatsapp || '',
    email: row.email || payload.email || '',
    address: row.address || payload.address || {},
    delivery_fee_base:
      row.delivery_fee === null || row.delivery_fee === undefined
        ? payload.delivery_fee_base ?? 0
        : Number(row.delivery_fee),
    created_date: toIso(row.created_at),
    updated_date: toIso(row.updated_at),
  };
}

function normalizeSettings(source = {}, current = null) {
  const now = new Date().toISOString();
  const payload = {
    ...(current || {}),
    ...source,
  };
  const settings = {
    ...payload,
    id: source.id || current?.id || DEFAULT_SETTINGS_ID,
    pharmacy_name: String(
      source.pharmacy_name ?? source.store_name ?? current?.pharmacy_name ?? current?.store_name ?? ''
    ).trim(),
    store_name: String(
      source.store_name ?? source.pharmacy_name ?? current?.store_name ?? current?.pharmacy_name ?? ''
    ).trim(),
    phone: String(source.phone ?? current?.phone ?? '').trim(),
    whatsapp: String(source.whatsapp ?? current?.whatsapp ?? '').trim(),
    email: String(source.email ?? current?.email ?? '').trim(),
    address: source.address ?? current?.address ?? {},
    delivery_fee_base: Number(
      parseNumber(
        source.delivery_fee_base ??
          source.delivery_fee ??
          current?.delivery_fee_base ??
          current?.delivery_fee ??
          0,
        0
      ).toFixed(2)
    ),
    created_date: current?.created_date || payload.created_date || now,
    updated_date: now,
  };

  return {
    id: settings.id,
    store_name: settings.store_name || settings.pharmacy_name,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    email: settings.email,
    address: settings.address || {},
    delivery_fee: settings.delivery_fee_base,
    payload: settings,
    created_at: settings.created_date,
    updated_at: settings.updated_date,
  };
}

export async function getSettings(executor = null) {
  const result = await query('SELECT * FROM pharmacy_settings ORDER BY updated_at DESC LIMIT 1', [], executor);
  return mapSettingsRow(result.rows[0]);
}

export async function upsertSettings(source, executor = null) {
  const current = await getSettings(executor);
  const record = normalizeSettings(source, current);
  const result = await query(
    `
      INSERT INTO pharmacy_settings (
        id, store_name, phone, whatsapp, email, address, delivery_fee, payload, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::timestamptz, $10::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        store_name = EXCLUDED.store_name,
        phone = EXCLUDED.phone,
        whatsapp = EXCLUDED.whatsapp,
        email = EXCLUDED.email,
        address = EXCLUDED.address,
        delivery_fee = EXCLUDED.delivery_fee,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      record.id,
      record.store_name,
      record.phone,
      record.whatsapp,
      record.email,
      JSON.stringify(record.address),
      record.delivery_fee,
      JSON.stringify(record.payload),
      record.created_at,
      record.updated_at,
    ],
    executor
  );

  return mapSettingsRow(result.rows[0]);
}
