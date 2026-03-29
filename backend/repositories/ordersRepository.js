import { query } from '../db.js';
import { parseNumber, toIso } from './utils.js';

function mapOrderItemRow(row) {
  if (!row) {
    return null;
  }

  const payload = row.payload || {};
  return {
    ...payload,
    id: row.id,
    order_id: row.order_id,
    product_id: row.product_id,
    product_name_snapshot: row.product_name_snapshot,
    product_name: row.product_name_snapshot,
    name: payload.name || row.product_name_snapshot,
    unit_price_snapshot: Number(row.unit_price_snapshot),
    unit_price: Number(row.unit_price_snapshot),
    price: Number(row.unit_price_snapshot),
    quantity: row.quantity,
    line_total: Number(row.line_total),
    total: Number(row.line_total),
    stock_before: row.stock_before,
    stock_after: row.stock_after,
    requires_prescription_snapshot: Boolean(row.requires_prescription_snapshot),
    is_antibiotic_snapshot: Boolean(row.is_antibiotic_snapshot),
    is_controlled_snapshot: Boolean(row.is_controlled_snapshot),
    created_date: toIso(row.created_at),
  };
}

function mapOrderRow(row, items = []) {
  if (!row) {
    return null;
  }

  const payload = row.payload || {};
  return {
    ...payload,
    id: row.id,
    order_number: row.order_number,
    customer_id: row.customer_id || null,
    prescription_id: row.prescription_id || null,
    status: row.status,
    payment_method: row.payment_method || '',
    subtotal: Number(row.subtotal),
    discount: Number(row.discount_amount),
    delivery_fee: Number(row.delivery_fee),
    total: Number(row.total_amount),
    notes: row.notes || payload.notes || '',
    zipcode: row.zipcode || '',
    coupon_code: row.coupon_code || null,
    delivery_address: row.delivery_address || payload.delivery_address || null,
    delivery_option: row.delivery_option || payload.delivery_option || 'motoboy',
    order_mode: row.order_mode || payload.order_mode || 'app',
    customer_name: row.customer_name_snapshot || payload.customer_name || '',
    customer_email: row.customer_email_snapshot || payload.customer_email || '',
    customer_phone: row.customer_phone_snapshot || payload.customer_phone || '',
    items,
    created_date: toIso(row.created_at),
    updated_date: toIso(row.updated_at),
  };
}

function normalizeOrder(order = {}, current = null) {
  const now = new Date().toISOString();
  const payload = {
    ...(current || {}),
    ...order,
  };

  return {
    id: order.id || current?.id,
    order_number: order.order_number || current?.order_number,
    customer_id: order.customer_id ?? current?.customer_id ?? null,
    prescription_id: order.prescription_id ?? current?.prescription_id ?? null,
    status: order.status ?? current?.status ?? 'pending',
    payment_method: order.payment_method ?? current?.payment_method ?? 'A definir',
    subtotal: Number(parseNumber(order.subtotal ?? current?.subtotal ?? 0, 0).toFixed(2)),
    discount_amount: Number(
      parseNumber(order.discount ?? order.discount_amount ?? current?.discount ?? current?.discount_amount ?? 0, 0).toFixed(2)
    ),
    delivery_fee: Number(parseNumber(order.delivery_fee ?? current?.delivery_fee ?? 0, 0).toFixed(2)),
    total_amount: Number(
      parseNumber(order.total ?? order.total_amount ?? current?.total ?? current?.total_amount ?? 0, 0).toFixed(2)
    ),
    notes: String(order.notes ?? current?.notes ?? payload.notes ?? '').trim(),
    zipcode: String(order.zipcode ?? order.customer_zipcode ?? current?.zipcode ?? payload.zipcode ?? '').trim(),
    delivery_address: order.delivery_address ?? current?.delivery_address ?? payload.delivery_address ?? null,
    delivery_option: order.delivery_option ?? current?.delivery_option ?? payload.delivery_option ?? 'motoboy',
    order_mode: order.order_mode ?? current?.order_mode ?? payload.order_mode ?? 'app',
    coupon_code: order.coupon_code ?? current?.coupon_code ?? payload.coupon_code ?? null,
    customer_name_snapshot: order.customer_name ?? current?.customer_name ?? payload.customer_name ?? '',
    customer_email_snapshot: order.customer_email ?? current?.customer_email ?? payload.customer_email ?? '',
    customer_phone_snapshot: order.customer_phone ?? current?.customer_phone ?? payload.customer_phone ?? '',
    payload: {
      ...payload,
      created_date: current?.created_date || payload.created_date || now,
      updated_date: now,
    },
    created_at: current?.created_date || payload.created_date || now,
    updated_at: now,
  };
}

function normalizeOrderItem(item = {}, orderId) {
  const now = new Date().toISOString();
  const payload = { ...item };

  return {
    id: item.id,
    order_id: orderId,
    product_id: item.product_id,
    product_name_snapshot: item.product_name || item.name,
    unit_price_snapshot: Number(parseNumber(item.unit_price ?? item.price ?? 0, 0).toFixed(2)),
    quantity: Number(item.quantity || 0),
    line_total: Number(parseNumber(item.total ?? item.line_total ?? 0, 0).toFixed(2)),
    stock_before: item.stock_snapshot_before ?? item.stock_before ?? null,
    stock_after: item.stock_after ?? null,
    requires_prescription_snapshot: Boolean(item.requires_prescription_snapshot ?? item.requires_prescription ?? false),
    is_antibiotic_snapshot: Boolean(item.is_antibiotic_snapshot ?? item.is_antibiotic ?? false),
    is_controlled_snapshot: Boolean(item.is_controlled_snapshot ?? item.is_controlled ?? false),
    payload,
    created_at: now,
  };
}

async function loadOrderItems(orderIds = [], executor = null) {
  if (!orderIds.length) {
    return new Map();
  }

  const result = await query(
    'SELECT * FROM order_items WHERE order_id = ANY($1::text[]) ORDER BY created_at ASC',
    [orderIds],
    executor
  );
  const grouped = new Map();

  result.rows.forEach((row) => {
    const item = mapOrderItemRow(row);
    if (!grouped.has(row.order_id)) {
      grouped.set(row.order_id, []);
    }
    grouped.get(row.order_id).push(item);
  });

  return grouped;
}

export async function listOrders({ customerId = null } = {}, executor = null) {
  const result = customerId
    ? await query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [customerId], executor)
    : await query('SELECT * FROM orders ORDER BY created_at DESC', [], executor);
  const itemsMap = await loadOrderItems(result.rows.map((row) => row.id), executor);
  return result.rows.map((row) => mapOrderRow(row, itemsMap.get(row.id) || []));
}

export async function countOrders(executor = null) {
  const result = await query('SELECT COUNT(*)::int AS total FROM orders', [], executor);
  return result.rows[0]?.total || 0;
}

export async function countOrdersForCustomerIdentity(identity = {}, executor = null) {
  const params = [];
  const conditions = [];

  if (identity.customerId) {
    params.push(identity.customerId);
    conditions.push(`customer_id = $${params.length}`);
  }
  if (identity.email) {
    params.push(identity.email);
    conditions.push(`customer_email_snapshot = $${params.length}`);
  }
  if (identity.phone) {
    params.push(identity.phone);
    conditions.push(`customer_phone_snapshot = $${params.length}`);
  }

  if (!conditions.length) {
    return 0;
  }

  const result = await query(
    `SELECT COUNT(*)::int AS total FROM orders WHERE ${conditions.join(' OR ')}`,
    params,
    executor
  );
  return result.rows[0]?.total || 0;
}

export async function findOrderById(id, executor = null) {
  const result = await query('SELECT * FROM orders WHERE id = $1', [id], executor);
  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const itemsMap = await loadOrderItems([id], executor);
  return mapOrderRow(row, itemsMap.get(id) || []);
}

export async function findOrderByOrderNumber(orderNumber, executor = null) {
  const result = await query('SELECT * FROM orders WHERE order_number = $1', [orderNumber], executor);
  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const itemsMap = await loadOrderItems([row.id], executor);
  return mapOrderRow(row, itemsMap.get(row.id) || []);
}

export async function upsertOrder(order, items = [], executor) {
  const current = order.id ? await findOrderById(order.id, executor) : null;
  const record = normalizeOrder(order, current);

  await query(
    `
      INSERT INTO orders (
        id, order_number, customer_id, prescription_id, status, payment_method,
        subtotal, discount_amount, delivery_fee, total_amount, notes, zipcode,
        delivery_address, delivery_option, order_mode, coupon_code,
        customer_name_snapshot, customer_email_snapshot, customer_phone_snapshot,
        payload, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13::jsonb, $14, $15, $16,
        $17, $18, $19,
        $20::jsonb, $21::timestamptz, $22::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        order_number = EXCLUDED.order_number,
        customer_id = EXCLUDED.customer_id,
        prescription_id = EXCLUDED.prescription_id,
        status = EXCLUDED.status,
        payment_method = EXCLUDED.payment_method,
        subtotal = EXCLUDED.subtotal,
        discount_amount = EXCLUDED.discount_amount,
        delivery_fee = EXCLUDED.delivery_fee,
        total_amount = EXCLUDED.total_amount,
        notes = EXCLUDED.notes,
        zipcode = EXCLUDED.zipcode,
        delivery_address = EXCLUDED.delivery_address,
        delivery_option = EXCLUDED.delivery_option,
        order_mode = EXCLUDED.order_mode,
        coupon_code = EXCLUDED.coupon_code,
        customer_name_snapshot = EXCLUDED.customer_name_snapshot,
        customer_email_snapshot = EXCLUDED.customer_email_snapshot,
        customer_phone_snapshot = EXCLUDED.customer_phone_snapshot,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `,
    [
      record.id,
      record.order_number,
      record.customer_id,
      record.prescription_id,
      record.status,
      record.payment_method,
      record.subtotal,
      record.discount_amount,
      record.delivery_fee,
      record.total_amount,
      record.notes,
      record.zipcode,
      JSON.stringify(record.delivery_address),
      record.delivery_option,
      record.order_mode,
      record.coupon_code,
      record.customer_name_snapshot,
      record.customer_email_snapshot,
      record.customer_phone_snapshot,
      JSON.stringify(record.payload),
      record.created_at,
      record.updated_at,
    ],
    executor
  );

  await query('DELETE FROM order_items WHERE order_id = $1', [record.id], executor);

  for (const item of items) {
    const itemRecord = normalizeOrderItem(item, record.id);
    await query(
      `
        INSERT INTO order_items (
          id, order_id, product_id, product_name_snapshot, unit_price_snapshot,
          quantity, line_total, stock_before, stock_after,
          requires_prescription_snapshot, is_antibiotic_snapshot, is_controlled_snapshot,
          payload, created_at
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12,
          $13::jsonb, $14::timestamptz
        )
      `,
      [
        itemRecord.id,
        itemRecord.order_id,
        itemRecord.product_id,
        itemRecord.product_name_snapshot,
        itemRecord.unit_price_snapshot,
        itemRecord.quantity,
        itemRecord.line_total,
        itemRecord.stock_before,
        itemRecord.stock_after,
        itemRecord.requires_prescription_snapshot,
        itemRecord.is_antibiotic_snapshot,
        itemRecord.is_controlled_snapshot,
        JSON.stringify(itemRecord.payload),
        itemRecord.created_at,
      ],
      executor
    );
  }

  return findOrderById(record.id, executor);
}
