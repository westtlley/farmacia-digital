import { query } from '../db.js';
import { toIso } from './utils.js';

function mapPrescriptionRow(row) {
  if (!row) {
    return null;
  }

  const payload = row.payload || {};
  return {
    ...payload,
    id: row.id,
    customer_id: row.customer_id || null,
    order_id: row.order_id || null,
    storage_provider: row.storage_provider || (row.file_path ? 'local' : null),
    file_key: row.file_key || null,
    file_path: row.file_path || null,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    uploaded_at: toIso(row.uploaded_at) || toIso(row.created_at),
    status: row.status,
    review_status: row.review_status,
    review_notes: row.review_notes || '',
    approved_by: row.approved_by || null,
    approved_at: toIso(row.approved_at),
    rejected_at: toIso(row.rejected_at),
    patient_name: row.patient_name || '',
    prescriber_name: row.prescriber_name || '',
    document_number: row.document_number || '',
    items_declared: row.items_declared || [],
    extracted_data: row.extracted_data || null,
    created_date: toIso(row.created_at),
    updated_date: toIso(row.updated_at),
  };
}

function normalizePrescription(source = {}, current = null) {
  const now = new Date().toISOString();
  const payload = {
    ...(current || {}),
    ...source,
  };
  const prescription = {
    ...payload,
    id: source.id || current?.id,
    customer_id: source.customer_id ?? current?.customer_id ?? null,
    order_id: source.order_id ?? current?.order_id ?? null,
    storage_provider: source.storage_provider ?? current?.storage_provider ?? (current?.file_path ? 'local' : null),
    file_key: source.file_key ?? current?.file_key ?? null,
    file_path: source.file_path ?? current?.file_path ?? null,
    original_filename: source.original_filename ?? current?.original_filename ?? '',
    mime_type: source.mime_type ?? current?.mime_type ?? '',
    size_bytes: Number(source.size_bytes ?? current?.size_bytes ?? 0),
    uploaded_at: source.uploaded_at ?? current?.uploaded_at ?? current?.created_date ?? now,
    status: String(source.status ?? current?.status ?? payload.status ?? 'uploaded'),
    review_status: String(source.review_status ?? current?.review_status ?? payload.review_status ?? 'pending'),
    review_notes: String(source.review_notes ?? current?.review_notes ?? payload.review_notes ?? '').trim(),
    approved_by: source.approved_by ?? current?.approved_by ?? null,
    approved_at: source.approved_at ?? current?.approved_at ?? null,
    rejected_at: source.rejected_at ?? current?.rejected_at ?? null,
    patient_name: String(source.patient_name ?? current?.patient_name ?? payload.patient_name ?? '').trim(),
    prescriber_name: String(source.prescriber_name ?? current?.prescriber_name ?? payload.prescriber_name ?? '').trim(),
    document_number: String(source.document_number ?? current?.document_number ?? payload.document_number ?? '').trim(),
    items_declared: source.items_declared ?? current?.items_declared ?? payload.items_declared ?? [],
    extracted_data: source.extracted_data ?? current?.extracted_data ?? payload.extracted_data ?? null,
    created_date: current?.created_date || payload.created_date || now,
    updated_date: now,
  };

  return {
    id: prescription.id,
    customer_id: prescription.customer_id,
    order_id: prescription.order_id,
    storage_provider: prescription.storage_provider,
    file_key: prescription.file_key,
    file_path: prescription.file_path,
    original_filename: prescription.original_filename,
    mime_type: prescription.mime_type,
    size_bytes: prescription.size_bytes,
    uploaded_at: prescription.uploaded_at,
    status: prescription.status,
    review_status: prescription.review_status,
    review_notes: prescription.review_notes,
    approved_by: prescription.approved_by,
    approved_at: prescription.approved_at,
    rejected_at: prescription.rejected_at,
    patient_name: prescription.patient_name || null,
    prescriber_name: prescription.prescriber_name || null,
    document_number: prescription.document_number || null,
    items_declared: prescription.items_declared,
    extracted_data: prescription.extracted_data,
    payload: prescription,
    created_at: prescription.created_date,
    updated_at: prescription.updated_date,
  };
}

export async function listPrescriptions(executor = null) {
  const result = await query('SELECT * FROM prescriptions ORDER BY created_at DESC', [], executor);
  return result.rows.map(mapPrescriptionRow);
}

export async function countPrescriptions(executor = null) {
  const result = await query('SELECT COUNT(*)::int AS total FROM prescriptions', [], executor);
  return result.rows[0]?.total || 0;
}

export async function findPrescriptionById(id, executor = null) {
  const result = await query('SELECT * FROM prescriptions WHERE id = $1', [id], executor);
  return mapPrescriptionRow(result.rows[0]);
}

export async function upsertPrescription(source, executor = null) {
  const current = source.id ? await findPrescriptionById(source.id, executor) : null;
  const record = normalizePrescription(source, current);
  const result = await query(
    `
      INSERT INTO prescriptions (
        id, customer_id, order_id, storage_provider, file_key, file_path, original_filename, mime_type, size_bytes, uploaded_at,
        status, review_status, review_notes, approved_by, approved_at, rejected_at,
        patient_name, prescriber_name, document_number, items_declared, extracted_data,
        payload, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz,
        $11, $12, $13, $14, $15::timestamptz, $16::timestamptz,
        $17, $18, $19, $20::jsonb, $21::jsonb,
        $22::jsonb, $23::timestamptz, $24::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        order_id = EXCLUDED.order_id,
        storage_provider = EXCLUDED.storage_provider,
        file_key = EXCLUDED.file_key,
        file_path = EXCLUDED.file_path,
        original_filename = EXCLUDED.original_filename,
        mime_type = EXCLUDED.mime_type,
        size_bytes = EXCLUDED.size_bytes,
        uploaded_at = EXCLUDED.uploaded_at,
        status = EXCLUDED.status,
        review_status = EXCLUDED.review_status,
        review_notes = EXCLUDED.review_notes,
        approved_by = EXCLUDED.approved_by,
        approved_at = EXCLUDED.approved_at,
        rejected_at = EXCLUDED.rejected_at,
        patient_name = EXCLUDED.patient_name,
        prescriber_name = EXCLUDED.prescriber_name,
        document_number = EXCLUDED.document_number,
        items_declared = EXCLUDED.items_declared,
        extracted_data = EXCLUDED.extracted_data,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      record.id,
      record.customer_id,
      record.order_id,
      record.storage_provider,
      record.file_key,
      record.file_path,
      record.original_filename,
      record.mime_type,
      record.size_bytes,
      record.uploaded_at,
      record.status,
      record.review_status,
      record.review_notes,
      record.approved_by,
      record.approved_at,
      record.rejected_at,
      record.patient_name,
      record.prescriber_name,
      record.document_number,
      JSON.stringify(record.items_declared || []),
      JSON.stringify(record.extracted_data),
      JSON.stringify(record.payload),
      record.created_at,
      record.updated_at,
    ],
    executor
  );

  return mapPrescriptionRow(result.rows[0]);
}
