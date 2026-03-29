import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { Readable } from 'stream';
import { hashToken, verifyPassword } from './authUtils.js';
import { ensureBootstrapData } from './bootstrap.js';
import { ensureDatabaseConnection, pingDatabase, withTransaction } from './db.js';
import { logger, serializeError } from './logger.js';
import { captureBackendException, getMonitoringStatus, initializeMonitoring } from './monitoring.js';
import { runMigrations } from './migrator.js';
import { createRateLimit } from './middleware/rateLimit.js';
import { buildRequestLogMeta, requestContextMiddleware } from './middleware/requestContext.js';
import { buildCorsOptions, getAllowedOrigins, getClientIp, securityHeaders } from './middleware/security.js';
import {
  cacheSessionRecord,
  deleteCachedSessionRecord,
  ensureRedisConnection,
  getCachedSessionRecord,
  isRedisConfigured,
  isSessionRevoked,
  markSessionRevoked,
  pingRedis,
} from './redis.js';
import { decrementStock, hasStock, normalizeRequestedQuantity } from './stock.js';
import { findAdminByEmail, findAdminById, touchAdminLogin } from './repositories/adminUsersRepository.js';
import { cleanupExpiredSessions, createSession, deleteSessionByTokenHash, findSessionByTokenHash } from './repositories/authSessionsRepository.js';
import { deleteCategory, listCategories, upsertCategory } from './repositories/categoriesRepository.js';
import { findCouponByCode, incrementCouponUsage } from './repositories/couponsRepository.js';
import { countCustomers, findCustomerById, findCustomerByIdentity, listCustomers, upsertCustomer } from './repositories/customersRepository.js';
import { listOrders, countOrders, countOrdersForCustomerIdentity, findOrderById, findOrderByOrderNumber, upsertOrder } from './repositories/ordersRepository.js';
import { findPrescriptionById, listPrescriptions, upsertPrescription } from './repositories/prescriptionsRepository.js';
import { countProducts, deleteProduct, findProductById, listProducts, lockProductsByIds, upsertProduct, saveProductRecord } from './repositories/productsRepository.js';
import { getSettings, upsertSettings } from './repositories/settingsRepository.js';
import { normalizeEmail, normalizePhone, parseNumber } from './repositories/utils.js';
import { checkPrimaryStorageHealth, resolvePrescriptionStorage, getPrimaryStorageProvider } from './storage/index.js';
import { buildPrescriptionStorageKey, sanitizeUploadFilename, validateAndDecodePrescriptionUpload } from './uploads/prescriptionUpload.js';
import { calculateCouponDiscount } from '../shared/coupons.js';
import {
  getMostRestrictivePolicy,
  getPolicyForProduct,
  isPrescriptionApproved,
  isPrescriptionRejected,
  productRequiresPrescription,
  PRESCRIPTION_STATUS,
  REVIEW_STATUS,
} from '../shared/prescriptionPolicy.js';

dotenv.config();

const PORT = Number(process.env.PORT || 10000);
const SESSION_TTL_HOURS = Number(process.env.AUTH_SESSION_TTL_HOURS || 24);
const SESSION_COOKIE_NAME =
  String(process.env.AUTH_COOKIE_NAME || 'farmacia_session').trim() || 'farmacia_session';
const SESSION_COOKIE_DOMAIN = String(process.env.AUTH_COOKIE_DOMAIN || '').trim() || undefined;
const SESSION_COOKIE_SAME_SITE = (() => {
  const candidate = String(process.env.AUTH_COOKIE_SAME_SITE || 'lax').trim().toLowerCase();
  return ['lax', 'strict', 'none'].includes(candidate) ? candidate : 'lax';
})();
const SESSION_COOKIE_SECURE =
  SESSION_COOKIE_SAME_SITE === 'none'
    ? true
    : normalizeBooleanEnv(process.env.AUTH_COOKIE_SECURE, process.env.NODE_ENV === 'production');
const primaryStorageProvider = getPrimaryStorageProvider();

const app = express();
const allowedOrigins = getAllowedOrigins();

app.disable('x-powered-by');
app.set('trust proxy', true);

app.use(
  cors(buildCorsOptions(allowedOrigins))
);
app.use(securityHeaders);
app.use(express.json({ limit: '20mb' }));
app.use(requestContextMiddleware);

const loginRateLimit = createRateLimit({
  name: 'auth_login',
  windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || 5 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_LOGIN_MAX || 5),
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
  keyGenerator: (req) => `${getClientIp(req)}:${normalizeEmail(req.body?.email || '') || 'anonymous'}`,
});

const prescriptionUploadRateLimit = createRateLimit({
  name: 'prescription_upload',
  windowMs: Number(process.env.RATE_LIMIT_PRESCRIPTION_UPLOAD_WINDOW_MS || 10 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_PRESCRIPTION_UPLOAD_MAX || 8),
  message: 'Muitos envios de receita em pouco tempo. Tente novamente mais tarde.',
  keyGenerator: (req) =>
    `${getClientIp(req)}:${req.auth?.user?.id || normalizePhone(req.body?.customer_phone || '') || normalizeEmail(req.body?.customer_email || '') || 'anonymous'}`,
});

const orderCreateRateLimit = createRateLimit({
  name: 'order_create',
  windowMs: Number(process.env.RATE_LIMIT_ORDER_WINDOW_MS || 5 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_ORDER_MAX || 12),
  message: 'Muitos pedidos em pouco tempo. Tente novamente em alguns minutos.',
  keyGenerator: (req) =>
    `${getClientIp(req)}:${req.auth?.user?.id || normalizePhone(req.body?.customer_phone || '') || normalizeEmail(req.body?.customer_email || '') || 'anonymous'}`,
});

const adminMutationRateLimit = createRateLimit({
  name: 'admin_sensitive_mutation',
  windowMs: Number(process.env.RATE_LIMIT_ADMIN_WINDOW_MS || 60 * 1000),
  max: Number(process.env.RATE_LIMIT_ADMIN_MAX || 60),
  message: 'Muitas operacoes administrativas em pouco tempo. Aguarde alguns instantes.',
  keyGenerator: (req) => `${getClientIp(req)}:${req.auth?.user?.id || 'admin'}`,
});

function createId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function createOrderNumber(prefix = 'PED') {
  return `${prefix}${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function formatError(error) {
  return { error };
}

function normalizeBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function parseCookieHeader(header = '') {
  return String(header || '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex <= 0) {
        return cookies;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      try {
        cookies[key] = decodeURIComponent(value);
      } catch (_error) {
        cookies[key] = value;
      }
      return cookies;
    }, {});
}

function buildSessionCookieOptions(expiresAt) {
  const expiresAtDate = expiresAt ? new Date(expiresAt) : new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  const options = {
    httpOnly: true,
    sameSite: SESSION_COOKIE_SAME_SITE,
    secure: SESSION_COOKIE_SECURE,
    path: '/',
    expires: expiresAtDate,
    maxAge: Math.max(0, expiresAtDate.getTime() - Date.now()),
  };

  if (SESSION_COOKIE_DOMAIN) {
    options.domain = SESSION_COOKIE_DOMAIN;
  }

  return options;
}

function setSessionCookie(res, token, expiresAt) {
  res.cookie(SESSION_COOKIE_NAME, token, buildSessionCookieOptions(expiresAt));
}

function clearSessionCookie(res) {
  const options = buildSessionCookieOptions(new Date(0).toISOString());
  options.expires = new Date(0);
  options.maxAge = 0;
  res.cookie(SESSION_COOKIE_NAME, '', options);
}

function pipeStorageStreamToResponse(stream, res) {
  const readable =
    stream && typeof stream.pipe === 'function'
      ? stream
      : Readable.fromWeb(stream);

  readable.on('error', (error) => {
    logger.error('storage.stream.error', {
      error: serializeError(error),
    });

    if (!res.headersSent) {
      res.status(500).json(formatError('Nao foi possivel abrir o arquivo solicitado.'));
    } else {
      res.end();
    }
  });

  readable.pipe(res);
}

function sortItems(items, sortBy = '') {
  if (!sortBy) {
    return [...items];
  }

  const isDesc = sortBy.startsWith('-');
  const field = isDesc ? sortBy.slice(1) : sortBy;
  return [...items].sort((left, right) => {
    let a = left[field];
    let b = right[field];

    if (field.includes('date') || field.includes('created') || field.includes('updated')) {
      a = new Date(a || 0).getTime();
      b = new Date(b || 0).getTime();
    }

    if (typeof a === 'string') {
      a = a.toLowerCase();
      b = String(b || '').toLowerCase();
    }

    if (a < b) return isDesc ? 1 : -1;
    if (a > b) return isDesc ? -1 : 1;
    return 0;
  });
}

function matchesFilters(item, filters) {
  return Object.entries(filters).every(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return true;
    }

    const itemValue = item[key];
    if (itemValue === undefined || itemValue === null) {
      return false;
    }

    if (typeof value === 'string' && typeof itemValue === 'string') {
      return itemValue.toLowerCase().includes(value.toLowerCase());
    }

    return itemValue === value;
  });
}

function listCollection(collection, query = {}, fixedFilters = {}) {
  const { sortBy = '', limit } = query;
  const filters = { ...query };
  delete filters.sortBy;
  delete filters.limit;

  const items = collection.filter((item) => matchesFilters(item, { ...filters, ...fixedFilters }));
  const sorted = sortItems(items, sortBy);

  if (!limit) {
    return sorted;
  }

  return sorted.slice(0, Number(limit));
}

function sanitizeAdmin(admin) {
  if (!admin) return null;
  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    role: 'admin',
    created_date: admin.created_date,
    updated_date: admin.updated_date,
    last_login_at: admin.last_login_at || null,
  };
}

function sanitizeCustomer(customer) {
  if (!customer) return null;
  return {
    id: customer.id,
    name: customer.name,
    full_name: customer.name,
    email: customer.email || '',
    phone: customer.phone || '',
    zipcode: customer.zipcode || '',
    cpf: customer.cpf || '',
    birth_date: customer.birth_date || '',
    avatar_url: customer.avatar_url || '',
    role: 'customer',
    created_date: customer.created_date,
    updated_date: customer.updated_date,
  };
}

function buildPrescriptionFileUrl(prescriptionId) {
  return `/api/prescriptions/${prescriptionId}/file`;
}

function sanitizePrescription(prescription) {
  if (!prescription) return null;

  const { file_path, file_key, storage_provider, ...safePrescription } = prescription;
  return {
    ...safePrescription,
    file_url: buildPrescriptionFileUrl(prescription.id),
  };
}

function buildPublicSession(user, expiresAt, authMode = 'cookie') {
  return {
    user,
    expires_at: expiresAt,
    auth_mode: authMode,
  };
}

function buildCustomerPayload(source = {}) {
  return {
    name: String(source.name ?? source.customer_name ?? '').trim(),
    email: normalizeEmail(source.email ?? source.customer_email ?? ''),
    phone: normalizePhone(source.phone ?? source.customer_phone ?? ''),
    zipcode: String(
      source.zipcode ??
        source.customer_zipcode ??
        source.delivery_address?.zipcode ??
        ''
    ).trim(),
    cpf: String(source.cpf ?? '').trim(),
    birth_date: String(source.birth_date ?? '').trim(),
    avatar_url: String(source.avatar_url ?? '').trim(),
  };
}

function buildPrescriptionPayload(source = {}, currentPrescription = null) {
  const allowedStatuses = new Set(Object.values(PRESCRIPTION_STATUS));
  const allowedReviewStatuses = new Set(Object.values(REVIEW_STATUS));
  const requestedStatus = String(
    source.status || currentPrescription?.status || PRESCRIPTION_STATUS.UPLOADED
  ).trim();
  const requestedReviewStatus = String(
    source.review_status || currentPrescription?.review_status || REVIEW_STATUS.PENDING
  ).trim();
  const nextStatus = allowedStatuses.has(requestedStatus)
    ? requestedStatus
    : currentPrescription?.status || PRESCRIPTION_STATUS.UPLOADED;
  const nextReviewStatus = allowedReviewStatuses.has(requestedReviewStatus)
    ? requestedReviewStatus
    : currentPrescription?.review_status || REVIEW_STATUS.PENDING;
  const rawItemsDeclared = source.items_declared ?? currentPrescription?.items_declared ?? [];
  const itemsDeclared = Array.isArray(rawItemsDeclared)
    ? rawItemsDeclared
    : String(rawItemsDeclared)
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean);

  return {
    notes: String(source.notes ?? currentPrescription?.notes ?? '').trim(),
    status: nextStatus,
    review_status: nextReviewStatus,
    review_notes: String(source.review_notes ?? currentPrescription?.review_notes ?? '').trim(),
    items_declared: itemsDeclared,
    extracted_data: source.extracted_data ?? currentPrescription?.extracted_data ?? null,
    document_number: String(source.document_number ?? currentPrescription?.document_number ?? '').trim(),
    patient_name: String(source.patient_name ?? currentPrescription?.patient_name ?? '').trim(),
    prescriber_name: String(source.prescriber_name ?? currentPrescription?.prescriber_name ?? '').trim(),
  };
}

function customerOwnsPrescription(customer, prescription) {
  if (!customer || !prescription) {
    return false;
  }

  return (
    (customer.id && prescription.customer_id === customer.id) ||
    (customer.email && normalizeEmail(prescription.customer_email || '') === normalizeEmail(customer.email)) ||
    (customer.phone && normalizePhone(prescription.customer_phone || '') === normalizePhone(customer.phone))
  );
}

function ensureCustomerPrescriptionAccess(auth, prescription) {
  if (!auth || !prescription) {
    return false;
  }

  if (auth.role === 'admin') {
    return true;
  }

  return customerOwnsPrescription(auth.user, prescription);
}

function buildPrescriptionFromUpload(source, customer, uploadedFile) {
  const now = new Date().toISOString();
  const payload = buildPrescriptionPayload(source);

  return {
    id: createId('presc'),
    customer_id: customer?.id || null,
    customer_name: source.customer_name || customer?.name || 'Cliente',
    customer_email: normalizeEmail(source.customer_email || customer?.email || ''),
    customer_phone: normalizePhone(source.customer_phone || customer?.phone || ''),
    order_id: source.order_id || null,
    file_id: uploadedFile.file_id,
    storage_provider: uploadedFile.storage_provider,
    file_key: uploadedFile.file_key,
    file_path: uploadedFile.file_path,
    original_filename: uploadedFile.original_filename,
    mime_type: uploadedFile.mime_type,
    size_bytes: uploadedFile.size_bytes,
    uploaded_at: uploadedFile.uploaded_at,
    status: source.status || PRESCRIPTION_STATUS.UPLOADED,
    review_status: source.review_status || REVIEW_STATUS.PENDING,
    review_notes: payload.review_notes,
    approved_by: null,
    approved_at: null,
    rejected_at: null,
    extracted_data: payload.extracted_data,
    items_declared: payload.items_declared,
    document_number: payload.document_number,
    patient_name: payload.patient_name || source.customer_name || customer?.name || '',
    prescriber_name: payload.prescriber_name,
    notes: payload.notes,
    created_date: now,
    updated_date: now,
  };
}

function buildGroupedOrderItems(items = []) {
  const groupedItems = new Map();

  items.forEach((item) => {
    const productId = String(item.product_id || item.id || '').trim();
    if (!productId) {
      throw new Error('Cada item do pedido precisa informar um produto valido.');
    }

    const quantity = normalizeRequestedQuantity(item.quantity);
    const existingEntry = groupedItems.get(productId);

    if (existingEntry) {
      existingEntry.quantity += quantity;
      return;
    }

    groupedItems.set(productId, {
      product_id: productId,
      quantity,
    });
  });

  return [...groupedItems.values()];
}

function buildOrderItemWithCanonicalProductData(item = {}, productLookup = new Map()) {
  const product = productLookup.get(item.product_id);
  if (!product) {
    throw new Error(`Produto ${item.product_id || ''} nao foi encontrado.`);
  }

  const quantity = normalizeRequestedQuantity(item.quantity);
  const unitPrice = Number(parseNumber(product.price, 0).toFixed(2));
  const total = Number((unitPrice * quantity).toFixed(2));

  return {
    product_id: product.id,
    product_name: product.name,
    name: product.name,
    unit_price: unitPrice,
    price: unitPrice,
    quantity,
    total,
    image_url: product.image_url || product.images?.[0] || '',
    dosage: product.dosage || '',
    category: product.category || '',
    brand: product.brand || '',
    sku: product.sku || '',
    original_price: parseNumber(product.original_price, 0) || null,
    stock_snapshot_before: product.stock_quantity,
    reserved_snapshot_before: product.reserved_quantity || 0,
    requires_prescription: productRequiresPrescription(product),
    is_antibiotic: Boolean(product.is_antibiotic),
    is_controlled: Boolean(product.is_controlled),
    regulatory_policy: getPolicyForProduct(product),
  };
}

function ensureProductsAvailableForOrder(items = [], productLookup = new Map()) {
  items.forEach((item) => {
    const product = productLookup.get(item.product_id);
    if (!product) {
      throw new Error(`Produto ${item.product_name || item.product_id} indisponivel.`);
    }

    if (product.status !== 'active') {
      throw new Error(`Produto indisponivel: ${product.name}.`);
    }

    if (!hasStock(product, item.quantity)) {
      throw new Error(`Estoque insuficiente para o produto ${product.name}.`);
    }
  });
}

function validatePrescriptionForOrder({ prescription, customer, items }) {
  const policy = getMostRestrictivePolicy(items);

  if (!policy.requiresPrescription) {
    return;
  }

  if (!prescription) {
    throw new Error('Este pedido exige uma receita valida vinculada ao checkout.');
  }

  if (!customerOwnsPrescription(customer, prescription)) {
    throw new Error('A receita selecionada nao pertence ao cliente deste pedido.');
  }

  if (isPrescriptionRejected(prescription) || prescription.status === PRESCRIPTION_STATUS.EXPIRED) {
    throw new Error('A receita selecionada nao esta mais valida para este pedido.');
  }

  if (policy.requiresApprovedPrescription && !isPrescriptionApproved(prescription)) {
    throw new Error('Este pedido exige uma receita aprovada manualmente pela farmacia.');
  }
}

function validateCouponRecord(coupon, zipCode = '', subtotal = 0, isFirstPurchase = false) {
  if (!coupon) {
    return { valid: false, error: 'Cupom nao encontrado' };
  }

  if (!coupon.active) {
    return { valid: false, error: 'Cupom inativo' };
  }

  const now = Date.now();
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) {
    return { valid: false, error: 'Cupom ainda nao esta vigente' };
  }

  if (coupon.endsAt && new Date(coupon.endsAt).getTime() < now) {
    return { valid: false, error: 'Cupom expirado' };
  }

  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, error: 'Cupom esgotado' };
  }

  if (coupon.minPurchase && subtotal < coupon.minPurchase) {
    return {
      valid: false,
      error: `Compra minima de R$ ${coupon.minPurchase.toFixed(2)} necessaria`,
    };
  }

  if (coupon.validFor === 'firstPurchase' && !isFirstPurchase) {
    return {
      valid: false,
      error: 'Cupom valido apenas para primeira compra',
    };
  }

  if (coupon.zipCodes && coupon.zipCodes.length > 0) {
    const zipPrefix = String(zipCode || '').replace(/\D/g, '').substring(0, 5);
    const isValidZip = coupon.zipCodes.some((validZip) => zipPrefix.startsWith(validZip));

    if (!isValidZip) {
      return {
        valid: false,
        error: `Cupom valido apenas para ${coupon.neighborhood}`,
      };
    }
  }

  return {
    valid: true,
    coupon,
  };
}

async function calculateOrderFinancials({ items, deliveryFeeInput, couponCode, customer, zipCode }, executor) {
  const subtotal = Number(items.reduce((sum, item) => sum + parseNumber(item.total, 0), 0).toFixed(2));
  const deliveryFee = Number(Math.max(0, parseNumber(deliveryFeeInput, 0)).toFixed(2));
  const normalizedCouponCode = String(couponCode || '').trim().toUpperCase();

  let discount = 0;
  let finalDeliveryFee = deliveryFee;
  let appliedCoupon = null;

  if (normalizedCouponCode) {
    const coupon = await findCouponByCode(normalizedCouponCode, executor);
    const orderCount = await countOrdersForCustomerIdentity(
      {
        customerId: customer?.id || null,
        email: normalizeEmail(customer?.email || ''),
        phone: normalizePhone(customer?.phone || ''),
      },
      executor
    );
    const validation = validateCouponRecord(coupon, zipCode, subtotal, orderCount === 0);

    if (!validation.valid) {
      throw new Error(validation.error || 'Cupom invalido.');
    }

    const calculated = calculateCouponDiscount({ valid: true, coupon }, subtotal, deliveryFee);
    discount = calculated.discount;
    finalDeliveryFee = calculated.finalDeliveryFee;
    appliedCoupon = coupon;
  }

  return {
    subtotal,
    delivery_fee: finalDeliveryFee,
    discount,
    total: Number((subtotal - discount + finalDeliveryFee).toFixed(2)),
    coupon_code: appliedCoupon?.code || null,
  };
}

async function createSessionForUser(user, role) {
  await cleanupExpiredSessions();

  const token = crypto.randomBytes(32).toString('hex');
  const publicUser = role === 'admin' ? sanitizeAdmin(user) : sanitizeCustomer(user);
  const session = {
    id: createId('sess'),
    token_hash: hashToken(token),
    role,
    user_id: user.id,
    created_date: new Date().toISOString(),
    expires_at: new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString(),
  };

  await createSession(session);
  await cacheSessionRecord(session.token_hash, session);

  return {
    token,
    user: publicUser,
    expires_at: session.expires_at,
    session: buildPublicSession(publicUser, session.expires_at, 'cookie'),
  };
}

function getSessionTokenFromRequest(req) {
  const cookies = parseCookieHeader(req.headers.cookie || '');
  const cookieToken = String(cookies[SESSION_COOKIE_NAME] || '').trim();
  if (cookieToken) {
    return {
      token: cookieToken,
      source: 'cookie',
    };
  }

  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }

  const bearerToken = header.slice('Bearer '.length).trim();
  if (!bearerToken) {
    return null;
  }

  return {
    token: bearerToken,
    source: 'bearer',
  };
}

async function findSessionFromRequest(req) {
  await cleanupExpiredSessions();

  const tokenDetails = getSessionTokenFromRequest(req);
  if (!tokenDetails) {
    return null;
  }

  const tokenHash = hashToken(tokenDetails.token);
  if (await isSessionRevoked(tokenHash)) {
    return null;
  }

  let session = await getCachedSessionRecord(tokenHash);
  if (!session) {
    session = await findSessionByTokenHash(tokenHash);
    if (session) {
      await cacheSessionRecord(tokenHash, session);
    }
  }

  if (!session) {
    return null;
  }

  const user =
    session.role === 'admin'
      ? await findAdminById(session.user_id)
      : await findCustomerById(session.user_id);

  if (!user) {
    return null;
  }

  return {
    tokenHash,
    tokenSource: tokenDetails.source,
    session,
    role: session.role,
    user,
  };
}

async function optionalAuth(req, _res, next) {
  try {
    req.auth = await findSessionFromRequest(req);
    next();
  } catch (error) {
    next(error);
  }
}

async function requireAuth(req, res, next) {
  try {
    req.auth = await findSessionFromRequest(req);
    if (!req.auth) {
      if (parseCookieHeader(req.headers.cookie || '')[SESSION_COOKIE_NAME]) {
        clearSessionCookie(res);
      }
      res.status(401).json({ error: 'Nao autenticado' });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

async function requireAdmin(req, res, next) {
  try {
    req.auth = await findSessionFromRequest(req);
    if (!req.auth) {
      if (parseCookieHeader(req.headers.cookie || '')[SESSION_COOKIE_NAME]) {
        clearSessionCookie(res);
      }
      res.status(401).json({ error: 'Nao autenticado' });
      return;
    }

    if (req.auth.role !== 'admin') {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

async function buildReadinessPayload() {
  const [database, redis, storage] = await Promise.all([
    pingDatabase(),
    pingRedis(),
    checkPrimaryStorageHealth(),
  ]);

  const redisRequired = isRedisConfigured();
  const ready = database.available && storage.available && (!redisRequired || redis.available);

  return {
    status: ready ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database,
      redis: {
        ...redis,
        required: redisRequired,
      },
      storage,
    },
  };
}

app.get('/health', asyncHandler(async (req, res) => {
  res.json({
    status: 'live',
    timestamp: new Date().toISOString(),
    request_id: req.requestId,
  });
}));

app.get('/ready', asyncHandler(async (req, res) => {
  const payload = await buildReadinessPayload();
  res.status(payload.status === 'ready' ? 200 : 503).json({
    ...payload,
    request_id: req.requestId,
    monitoring: getMonitoringStatus(),
  });
}));

app.get('/api/health', asyncHandler(async (req, res) => {
  const [productsCount, ordersCountValue, customersCount] = await Promise.all([
    countProducts(),
    countOrders(),
    countCustomers(),
  ]);
  const readiness = await buildReadinessPayload();

  res.json({
    status: readiness.status === 'ready' ? 'ok' : readiness.status,
    timestamp: new Date().toISOString(),
    request_id: req.requestId,
    productsCount,
    ordersCount: ordersCountValue,
    customersCount,
    services: readiness.services,
  });
}));

app.post('/api/auth/login', loginRateLimit, asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const email = normalizeEmail(req.body?.email || '');
  const password = String(req.body?.password || '');

  if (!email || !password) {
    res.status(400).json({ error: 'Email e senha sao obrigatorios' });
    return;
  }

  const admin = await findAdminByEmail(email);
  if (!admin || !verifyPassword(password, admin)) {
    logger.warn('auth.login.failed', buildRequestLogMeta(req, {
      email,
    }));
    res.status(401).json({ error: 'Credenciais invalidas' });
    return;
  }

  const updatedAdmin = await touchAdminLogin(admin.id);
  const session = await createSessionForUser(updatedAdmin || admin, 'admin');
  setSessionCookie(res, session.token, session.expires_at);
  logger.info('auth.login.succeeded', buildRequestLogMeta(req, {
    admin_id: admin.id,
    email,
  }));
  res.json({
    user: session.user,
    expires_at: session.expires_at,
    session: session.session,
  });
}));

app.get('/api/auth/me', requireAuth, asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const user = req.auth.role === 'admin' ? sanitizeAdmin(req.auth.user) : sanitizeCustomer(req.auth.user);
  res.json({
    user,
    session: buildPublicSession(
      user,
      req.auth.session.expires_at,
      req.auth.tokenSource === 'bearer' ? 'legacy_bearer' : 'cookie'
    ),
  });
}));

app.post('/api/auth/logout', optionalAuth, asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.auth?.tokenHash) {
    await deleteSessionByTokenHash(req.auth.tokenHash);
    await deleteCachedSessionRecord(req.auth.tokenHash);
    await markSessionRevoked(req.auth.tokenHash, req.auth.session.expires_at);
    logger.info('auth.logout', buildRequestLogMeta(req, {
      role: req.auth.role,
    }));
  }

  clearSessionCookie(res);
  res.json({ success: true });
}));

app.get('/api/products', asyncHandler(async (req, res) => {
  const products = await listProducts();
  res.json(listCollection(products, req.query));
}));

app.get('/api/products/:id', asyncHandler(async (req, res) => {
  const product = await findProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Produto nao encontrado' });
    return;
  }

  res.json(product);
}));

app.post('/api/products', requireAdmin, adminMutationRateLimit, asyncHandler(async (req, res) => {
  const product = await upsertProduct({
    id: createId('prod'),
    ...req.body,
  });
  res.status(201).json(product);
}));

app.put('/api/products/:id', requireAdmin, adminMutationRateLimit, asyncHandler(async (req, res) => {
  const current = await findProductById(req.params.id);
  if (!current) {
    res.status(404).json({ error: 'Produto nao encontrado' });
    return;
  }

  const product = await upsertProduct({
    ...current,
    ...req.body,
    id: req.params.id,
  });
  res.json(product);
}));

app.delete('/api/products/:id', requireAdmin, adminMutationRateLimit, asyncHandler(async (req, res) => {
  const deleted = await deleteProduct(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Produto nao encontrado' });
    return;
  }

  res.json({ success: true });
}));

app.get('/api/categories', asyncHandler(async (req, res) => {
  const categories = await listCategories();
  res.json(listCollection(categories, req.query));
}));

app.post('/api/categories', requireAdmin, adminMutationRateLimit, asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) {
    res.status(400).json({ error: 'Nome da categoria e obrigatorio' });
    return;
  }

  const category = await upsertCategory({
    id: createId('cat'),
    name,
    slug: req.body?.slug || name,
    description: req.body?.description || '',
  });
  res.status(201).json(category);
}));

app.delete('/api/categories/:id', requireAdmin, adminMutationRateLimit, asyncHandler(async (req, res) => {
  const deleted = await deleteCategory(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Categoria nao encontrada' });
    return;
  }

  res.json({ success: true });
}));

app.get('/api/settings', asyncHandler(async (_req, res) => {
  res.json({ settings: await getSettings() });
}));

app.post('/api/settings', requireAdmin, adminMutationRateLimit, asyncHandler(async (req, res) => {
  const settings = await upsertSettings(req.body);
  res.status(201).json({ settings });
}));

app.put('/api/settings', requireAdmin, adminMutationRateLimit, asyncHandler(async (req, res) => {
  const settings = await upsertSettings(req.body);
  res.json({ settings });
}));

app.get('/api/customers', requireAuth, asyncHandler(async (req, res) => {
  if (req.auth.role === 'admin') {
    const customers = (await listCustomers()).map(sanitizeCustomer);
    res.json(listCollection(customers, req.query));
    return;
  }

  const customer = await findCustomerById(req.auth.user.id);
  res.json(customer ? [sanitizeCustomer(customer)] : []);
}));

app.post('/api/customers', optionalAuth, asyncHandler(async (req, res) => {
  const payload = buildCustomerPayload(req.body);
  if (!payload.email && !payload.phone) {
    res.status(400).json({ error: 'Email ou telefone do cliente e obrigatorio' });
    return;
  }

  const existingCustomer = await findCustomerByIdentity(payload);
  const customer = await upsertCustomer({
    ...req.body,
    ...payload,
    id: existingCustomer?.id || createId('cust'),
  });

  const response = { customer: sanitizeCustomer(customer) };
  if (req.body?.create_session && !existingCustomer) {
    try {
      const session = await createSessionForUser(customer, 'customer');
      setSessionCookie(res, session.token, session.expires_at);
      response.session = session.session;
    } catch (error) {
      logger.error('auth.customer_session_after_signup.failed', buildRequestLogMeta(req, {
        customer_id: customer.id,
        error: serializeError(error),
      }));
      captureBackendException(error, {
        req,
        tags: {
          subsystem: 'auth',
          phase: 'signup_session',
        },
      });
    }
  }

  res.status(201).json(response);
}));

app.get('/api/customers/:id', requireAuth, asyncHandler(async (req, res) => {
  const customer = await findCustomerById(req.params.id);
  if (!customer) {
    res.status(404).json({ error: 'Cliente nao encontrado' });
    return;
  }

  if (req.auth.role !== 'admin' && req.auth.user.id !== customer.id) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  res.json(sanitizeCustomer(customer));
}));

app.put('/api/customers/:id', requireAuth, asyncHandler(async (req, res) => {
  const customer = await findCustomerById(req.params.id);
  if (!customer) {
    res.status(404).json({ error: 'Cliente nao encontrado' });
    return;
  }

  if (req.auth.role !== 'admin' && req.auth.user.id !== req.params.id) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const updatedCustomer = await upsertCustomer({
    ...customer,
    ...req.body,
    ...buildCustomerPayload(req.body),
    id: req.params.id,
  });

  res.json({ customer: sanitizeCustomer(updatedCustomer) });
}));

app.get('/api/orders/track/:orderNumber', asyncHandler(async (req, res) => {
  const order = await findOrderByOrderNumber(req.params.orderNumber);
  if (!order) {
    res.status(404).json({ error: 'Pedido nao encontrado' });
    return;
  }

  res.json({ order });
}));

app.get('/api/orders', requireAuth, asyncHandler(async (req, res) => {
  const orders =
    req.auth.role === 'admin'
      ? await listOrders()
      : await listOrders({ customerId: req.auth.user.id });

  res.json(listCollection(orders, req.query));
}));

app.post('/api/orders', optionalAuth, orderCreateRateLimit, asyncHandler(async (req, res) => {
  const incomingItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const prescriptionId = String(req.body?.prescription_id || '').trim();
  const customerPayload = buildCustomerPayload(req.body);

  let groupedItems = [];
  try {
    groupedItems = buildGroupedOrderItems(incomingItems);
  } catch (error) {
    res.status(400).json(formatError(error.message));
    return;
  }

  if (groupedItems.length === 0) {
    res.status(400).json(formatError('O pedido precisa ter ao menos um item.'));
    return;
  }

  let orderResult;
  try {
    orderResult = await withTransaction(async (client) => {
      const existingCustomer =
        req.auth?.role === 'customer'
          ? await findCustomerById(req.auth.user.id, client)
          : await findCustomerByIdentity(customerPayload, client);

      const customerForValidation = existingCustomer || {
        id: null,
        name: customerPayload.name || req.body?.customer_name || 'Cliente',
        email: customerPayload.email || '',
        phone: customerPayload.phone || '',
      };

      if (!customerForValidation.email && !customerForValidation.phone) {
        throw new Error('Email ou telefone do cliente e obrigatorio.');
      }

      const lockedProducts = await lockProductsByIds(
        groupedItems.map((item) => item.product_id),
        client
      );
      const productLookup = new Map(lockedProducts.map((product) => [product.id, product]));

      groupedItems.forEach((item) => {
        if (!productLookup.has(item.product_id)) {
          throw new Error(`Produto ${item.product_id} nao foi encontrado.`);
        }
      });

      const canonicalItems = groupedItems.map((item) => buildOrderItemWithCanonicalProductData(item, productLookup));
      ensureProductsAvailableForOrder(canonicalItems, productLookup);

      const prescription = prescriptionId ? await findPrescriptionById(prescriptionId, client) : null;
      validatePrescriptionForOrder({ prescription, customer: customerForValidation, items: canonicalItems });

      const zipCode = req.body?.customer_zipcode || req.body?.delivery_address?.zipcode || '';
      const financials = await calculateOrderFinancials(
        {
          items: canonicalItems,
          deliveryFeeInput: req.body?.delivery_fee,
          couponCode: req.body?.coupon_code,
          customer: customerForValidation,
          zipCode,
        },
        client
      );

      const persistedCustomer = await upsertCustomer(
        {
          ...existingCustomer,
          ...req.body,
          ...customerPayload,
          id: existingCustomer?.id || createId('cust'),
          name: customerPayload.name || req.body?.customer_name || customerForValidation.name,
        },
        client
      );

      const now = new Date().toISOString();
      const updatedProducts = new Map();
      for (const item of canonicalItems) {
        const nextProduct = decrementStock(productLookup.get(item.product_id), item.quantity, now);
        updatedProducts.set(item.product_id, nextProduct);
        await saveProductRecord(nextProduct, client);
      }

      const linkedPrescriptionStatus = prescription
        ? prescription.status === PRESCRIPTION_STATUS.UPLOADED
          ? PRESCRIPTION_STATUS.PENDING_REVIEW
          : prescription.status
        : null;

      const order = await upsertOrder(
        {
          id: createId('order'),
          order_number: createOrderNumber(req.body?.order_mode === 'whatsapp' ? 'WPP' : 'PED'),
          customer_id: persistedCustomer.id,
          prescription_id: prescription?.id || null,
          prescription_status: linkedPrescriptionStatus,
          customer_name: req.body?.customer_name || persistedCustomer.name,
          customer_email: normalizeEmail(
            req.body?.customer_email || persistedCustomer.email || customerForValidation.email || ''
          ),
          customer_phone: normalizePhone(
            req.body?.customer_phone || persistedCustomer.phone || customerForValidation.phone || ''
          ),
          items: canonicalItems,
          subtotal: financials.subtotal,
          delivery_fee: financials.delivery_fee,
          discount: financials.discount,
          total: financials.total,
          coupon_code: financials.coupon_code,
          status: 'pending',
          payment_method: req.body?.payment_method || 'A definir',
          delivery_address: req.body?.delivery_address || null,
          delivery_option: req.body?.delivery_option || 'motoboy',
          order_mode: req.body?.order_mode || 'app',
          zipcode: zipCode,
          notes: req.body?.notes || '',
          created_date: now,
          updated_date: now,
        },
        canonicalItems.map((item, index) => ({
          ...item,
          id: `${createId('oitm')}_${index}`,
          stock_after: updatedProducts.get(item.product_id)?.stock_quantity ?? null,
        })),
        client
      );

      let updatedPrescription = prescription;
      if (prescription) {
        updatedPrescription = await upsertPrescription(
          {
            ...prescription,
            customer_id: persistedCustomer.id,
            order_id: order.id,
            customer_name: persistedCustomer.name,
            customer_email: persistedCustomer.email || '',
            customer_phone: persistedCustomer.phone || '',
            status: linkedPrescriptionStatus,
            updated_date: now,
          },
          client
        );
      }

      if (financials.coupon_code) {
        await incrementCouponUsage(financials.coupon_code, client);
      }

      return {
        order: {
          ...order,
          prescription_status: updatedPrescription?.status || null,
        },
        customer: persistedCustomer,
        createdCustomer: !existingCustomer,
      };
    });
  } catch (error) {
    const message = error.message || 'Pedido nao pode ser concluido.';
    const isBusinessConflict =
      message.includes('Estoque insuficiente') ||
      message.includes('Produto indisponivel') ||
      message.includes('Quantidade invalida') ||
      message.includes('Cupom');
    const isBusinessValidation =
      isBusinessConflict ||
      message.includes('receita') ||
      message.includes('pedido precisa') ||
      message.includes('Email ou telefone');
    const statusCode = error.status || (isBusinessConflict ? 409 : isBusinessValidation ? 400 : 500);

    if (statusCode >= 500) {
      logger.error('orders.create.failed', buildRequestLogMeta(req, {
        customer_email: customerPayload.email || null,
        customer_phone: customerPayload.phone || null,
        error: serializeError(error),
      }));
      captureBackendException(error, {
        req,
        tags: {
          subsystem: 'orders',
          phase: 'create',
        },
      });
    } else {
      logger.warn('orders.create.rejected', buildRequestLogMeta(req, {
        customer_email: customerPayload.email || null,
        customer_phone: customerPayload.phone || null,
        reason: message,
      }));
    }

    res.status(statusCode).json(formatError(statusCode >= 500 ? 'Pedido nao pode ser concluido.' : message));
    return;
  }

  const response = { order: orderResult.order };
  if (!req.auth && orderResult.createdCustomer) {
    response.customer = sanitizeCustomer(orderResult.customer);
    try {
      const session = await createSessionForUser(orderResult.customer, 'customer');
      setSessionCookie(res, session.token, session.expires_at);
      response.session = session.session;
    } catch (error) {
      logger.error('auth.customer_session_after_order.failed', buildRequestLogMeta(req, {
        customer_id: orderResult.customer.id,
        error: serializeError(error),
      }));
      captureBackendException(error, {
        req,
        tags: {
          subsystem: 'auth',
          phase: 'order_session',
        },
      });
    }
  }

  logger.info('orders.create.succeeded', buildRequestLogMeta(req, {
    order_id: orderResult.order.id,
    order_number: orderResult.order.order_number,
    customer_id: orderResult.customer.id,
  }));
  res.status(201).json(response);
}));

app.put('/api/orders/:id', requireAdmin, adminMutationRateLimit, asyncHandler(async (req, res) => {
  const currentOrder = await findOrderById(req.params.id);
  if (!currentOrder) {
    res.status(404).json({ error: 'Pedido nao encontrado' });
    return;
  }

  let nextItems = currentOrder.items;
  if (Array.isArray(req.body?.items)) {
    try {
      const groupedItems = buildGroupedOrderItems(req.body.items);
      const products = await Promise.all(groupedItems.map((item) => findProductById(item.product_id)));
      const productLookup = new Map(products.filter(Boolean).map((product) => [product.id, product]));
      nextItems = groupedItems.map((item) => buildOrderItemWithCanonicalProductData(item, productLookup));
    } catch (error) {
      res.status(400).json(formatError(error.message));
      return;
    }
  }

  const updatedOrder = await upsertOrder(
    {
      ...currentOrder,
      ...req.body,
      id: req.params.id,
      customer_name: req.body?.customer_name || currentOrder.customer_name,
      customer_email: req.body?.customer_email || currentOrder.customer_email,
      customer_phone: req.body?.customer_phone || currentOrder.customer_phone,
      updated_date: new Date().toISOString(),
    },
    nextItems.map((item, index) => ({
      ...item,
      id: item.id || `${req.params.id}_item_${index + 1}`,
    }))
  );

  res.json({ order: updatedOrder });
}));

app.get('/api/prescriptions', requireAuth, asyncHandler(async (req, res) => {
  const prescriptions = await listPrescriptions();
  const accessible =
    req.auth.role === 'admin'
      ? prescriptions
      : prescriptions.filter((entry) => entry.customer_id === req.auth.user.id);

  res.json(listCollection(accessible.map(sanitizePrescription), req.query));
}));

app.get('/api/prescriptions/:id', requireAuth, asyncHandler(async (req, res) => {
  const prescription = await findPrescriptionById(req.params.id);
  if (!prescription) {
    res.status(404).json(formatError('Receita nao encontrada'));
    return;
  }

  if (!ensureCustomerPrescriptionAccess(req.auth, prescription)) {
    res.status(403).json(formatError('Acesso negado'));
    return;
  }

  res.json({ prescription: sanitizePrescription(prescription) });
}));

app.get('/api/prescriptions/:id/file', requireAuth, asyncHandler(async (req, res) => {
  const prescription = await findPrescriptionById(req.params.id);
  if (!prescription) {
    res.status(404).json(formatError('Receita nao encontrada'));
    return;
  }

  if (!ensureCustomerPrescriptionAccess(req.auth, prescription)) {
    res.status(403).json(formatError('Acesso negado'));
    return;
  }

  const { provider, providerName, fileKey, legacyFilePath } = resolvePrescriptionStorage(prescription);
  if (!fileKey && !legacyFilePath) {
    res.status(404).json(formatError('Arquivo da receita nao encontrado'));
    return;
  }

  let openedFile;
  try {
    openedFile = await provider.openReadStream({
      fileKey,
      legacyFilePath,
    });
  } catch (error) {
    logger.error('prescriptions.file.open_failed', buildRequestLogMeta(req, {
      prescription_id: prescription.id,
      storage_provider: providerName,
      error: serializeError(error),
    }));
    captureBackendException(error, {
      req,
      tags: {
        subsystem: 'prescriptions',
        phase: 'file_open',
      },
    });
    res.status(404).json(formatError('Arquivo da receita nao encontrado'));
    return;
  }

  const originalExtension = path.extname(prescription.original_filename || '');
  const safeDownloadName = `${sanitizeUploadFilename(prescription.original_filename || 'receita')}${originalExtension}`;
  res.setHeader('Content-Type', openedFile.contentType || prescription.mime_type || 'application/octet-stream');
  if (openedFile.contentLength) {
    res.setHeader('Content-Length', String(openedFile.contentLength));
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', `inline; filename="${safeDownloadName}"`);

  logger.info('prescriptions.file.accessed', buildRequestLogMeta(req, {
    prescription_id: prescription.id,
    storage_provider: providerName,
    actor_role: req.auth.role,
    actor_id: req.auth.user.id,
  }));
  pipeStorageStreamToResponse(openedFile.stream, res);
}));

app.post('/api/prescriptions', optionalAuth, prescriptionUploadRateLimit, asyncHandler(async (req, res) => {
  const originalFilename = String(req.body?.original_filename || '').trim();
  const mimeType = req.body?.mime_type || '';
  const contentBase64 = String(req.body?.file_content_base64 || '').trim();

  if (!originalFilename || !mimeType || !contentBase64) {
    res.status(400).json(formatError('Arquivo, nome original e tipo MIME da receita sao obrigatorios.'));
    return;
  }

  const payload = buildCustomerPayload(req.body);
  const authenticatedCustomer =
    req.auth?.role === 'customer' ? await findCustomerById(req.auth.user.id) : null;
  const existingCustomer = authenticatedCustomer || await findCustomerByIdentity(payload);
  if (!authenticatedCustomer && !existingCustomer && !payload.email && !payload.phone) {
    res.status(400).json(formatError('Informe ao menos telefone ou email para vincular a receita.'));
    return;
  }

  let validatedUpload;
  try {
    validatedUpload = validateAndDecodePrescriptionUpload({
      contentBase64,
      mimeType,
      originalFilename,
    });
  } catch (error) {
    res.status(400).json(formatError(error.message));
    return;
  }

  const uploadedAt = new Date().toISOString();
  const fileId = createId('rxfile');
  const storageKey = buildPrescriptionStorageKey({
    uploadId: fileId,
    safeFilenameBase: validatedUpload.safeFilenameBase,
    extension: validatedUpload.extension,
    uploadedAt,
  });

  let storedFile;
  try {
    storedFile = await primaryStorageProvider.uploadBuffer({
      key: storageKey,
      buffer: validatedUpload.buffer,
      contentType: validatedUpload.normalizedMimeType,
      metadata: {
        uploaded_at: uploadedAt,
        original_filename: validatedUpload.originalFilename,
      },
    });
  } catch (error) {
    logger.error('prescriptions.upload.storage_failed', buildRequestLogMeta(req, {
      storage_provider: primaryStorageProvider.name,
      original_filename: validatedUpload.originalFilename,
      error: serializeError(error),
    }));
    captureBackendException(error, {
      req,
      tags: {
        subsystem: 'prescriptions',
        phase: 'storage_upload',
      },
    });
    res.status(502).json(formatError('Nao foi possivel armazenar a receita com seguranca. Tente novamente.'));
    return;
  }

  let customer;
  let prescription;
  try {
    ({ customer, prescription } = await withTransaction(async (client) => {
      const persistedCustomer =
        authenticatedCustomer ||
        await upsertCustomer(
          {
            ...existingCustomer,
            ...req.body,
            ...payload,
            id: existingCustomer?.id || createId('cust'),
            name: payload.name || req.body?.customer_name || existingCustomer?.name || 'Cliente',
          },
          client
        );

      const createdPrescription = await upsertPrescription(
        buildPrescriptionFromUpload(req.body, persistedCustomer, {
          ...storedFile,
          file_id: fileId,
          original_filename: validatedUpload.originalFilename,
          mime_type: validatedUpload.normalizedMimeType,
          size_bytes: validatedUpload.sizeBytes,
          uploaded_at: uploadedAt,
        }),
        client
      );

      return {
        customer: persistedCustomer,
        prescription: createdPrescription,
      };
    }));
  } catch (error) {
    try {
      await primaryStorageProvider.deleteObject({
        fileKey: storedFile.file_key,
        legacyFilePath: storedFile.file_path,
      });
    } catch (cleanupError) {
      logger.error('prescriptions.upload.cleanup_failed', buildRequestLogMeta(req, {
        storage_provider: primaryStorageProvider.name,
        file_key: storedFile.file_key,
        error: serializeError(cleanupError),
      }));
      captureBackendException(cleanupError, {
        req,
        tags: {
          subsystem: 'prescriptions',
          phase: 'cleanup',
        },
      });
    }

    logger.error('prescriptions.upload.persist_failed', buildRequestLogMeta(req, {
      original_filename: validatedUpload.originalFilename,
      error: serializeError(error),
    }));
    captureBackendException(error, {
      req,
      tags: {
        subsystem: 'prescriptions',
        phase: 'persist',
      },
    });
    throw error;
  }

  const response = { prescription: sanitizePrescription(prescription) };
  if (!req.auth && customer && !existingCustomer) {
    response.customer = sanitizeCustomer(customer);
    try {
      const session = await createSessionForUser(customer, 'customer');
      setSessionCookie(res, session.token, session.expires_at);
      response.session = session.session;
    } catch (error) {
      logger.error('auth.customer_session_after_prescription.failed', buildRequestLogMeta(req, {
        customer_id: customer.id,
        error: serializeError(error),
      }));
      captureBackendException(error, {
        req,
        tags: {
          subsystem: 'auth',
          phase: 'prescription_session',
        },
      });
    }
  }

  logger.info('prescriptions.upload.created', buildRequestLogMeta(req, {
    prescription_id: prescription.id,
    customer_id: customer?.id || null,
    storage_provider: prescription.storage_provider || primaryStorageProvider.name,
  }));
  res.status(201).json(response);
}));

app.put('/api/prescriptions/:id', requireAdmin, adminMutationRateLimit, asyncHandler(async (req, res) => {
  const currentPrescription = await findPrescriptionById(req.params.id);
  if (!currentPrescription) {
    res.status(404).json(formatError('Receita nao encontrada'));
    return;
  }

  const nextPayload = buildPrescriptionPayload(req.body, currentPrescription);
  const now = new Date().toISOString();
  const nextReviewStatus = nextPayload.review_status;
  const nextStatus =
    nextReviewStatus === REVIEW_STATUS.APPROVED
      ? PRESCRIPTION_STATUS.APPROVED
      : nextReviewStatus === REVIEW_STATUS.REJECTED
        ? PRESCRIPTION_STATUS.REJECTED
        : nextPayload.status;

  const prescription = await upsertPrescription({
    ...currentPrescription,
    ...nextPayload,
    id: req.params.id,
    status: nextStatus,
    approved_by:
      nextReviewStatus === REVIEW_STATUS.APPROVED ? req.auth.user.id : currentPrescription.approved_by || null,
    approved_at: nextReviewStatus === REVIEW_STATUS.APPROVED ? now : null,
    rejected_at: nextReviewStatus === REVIEW_STATUS.REJECTED ? now : null,
    updated_date: now,
  });

  logger.info('prescriptions.review.updated', buildRequestLogMeta(req, {
    prescription_id: prescription.id,
    review_status: prescription.review_status,
    admin_id: req.auth.user.id,
  }));
  res.json({ prescription: sanitizePrescription(prescription) });
}));

app.use((error, req, res, _next) => {
  logger.error('api.unhandled_error', buildRequestLogMeta(req, {
    error: serializeError(error),
  }));
  captureBackendException(error, {
    req,
    tags: {
      subsystem: 'express',
      phase: 'unhandled',
    },
  });

  if (res.headersSent) {
    return;
  }

  const status = error.status || 500;
  res
    .status(status)
    .json(formatError(status >= 500 ? 'Erro interno do servidor.' : error.message || 'Erro na requisicao.'));
});

export async function startServer() {
  initializeMonitoring();
  await ensureDatabaseConnection();
  await ensureRedisConnection({ required: false });
  await runMigrations();
  await ensureBootstrapData();
  setInterval(() => {
    cleanupExpiredSessions().catch((error) => {
      logger.error('auth.session_cleanup.failed', {
        error: serializeError(error),
      });
      captureBackendException(error, {
        tags: {
          subsystem: 'auth',
          phase: 'session_cleanup',
        },
      });
    });
  }, 60 * 60 * 1000);

  app.listen(PORT, () => {
    logger.info('server.started', {
      port: PORT,
      health_check: `http://localhost:${PORT}/api/health`,
      allowed_origins: allowedOrigins,
      session_cookie_name: SESSION_COOKIE_NAME,
      cookie_same_site: SESSION_COOKIE_SAME_SITE,
      cookie_secure: SESSION_COOKIE_SECURE,
      storage_provider: primaryStorageProvider.name,
      redis_configured: isRedisConfigured(),
      monitoring: getMonitoringStatus(),
    });
  });
}

export { app };
