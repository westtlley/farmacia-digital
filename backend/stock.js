function normalizeInteger(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
}

export function normalizeRequestedQuantity(quantity) {
  const parsed = Number(quantity);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Quantidade invalida para o pedido.');
  }

  return parsed;
}

export function normalizeProductStock(product = {}, timestamp = new Date().toISOString()) {
  const stockQuantity = normalizeInteger(product.stock_quantity, 0);
  const reservedQuantity = product.has_infinite_stock
    ? 0
    : Math.min(normalizeInteger(product.reserved_quantity, 0), stockQuantity);

  return {
    ...product,
    stock_quantity: stockQuantity,
    reserved_quantity: reservedQuantity,
    updated_at: product.updated_at || product.updated_date || timestamp,
  };
}

export function getAvailableStock(product = {}) {
  if (product.has_infinite_stock) {
    return Number.POSITIVE_INFINITY;
  }

  const normalized = normalizeProductStock(product);
  return Math.max(0, normalized.stock_quantity - normalized.reserved_quantity);
}

export function hasStock(product = {}, quantity = 0) {
  if (product.has_infinite_stock) {
    return true;
  }

  return getAvailableStock(product) >= normalizeRequestedQuantity(quantity);
}

export function reserveStock(product = {}, quantity = 0, timestamp = new Date().toISOString()) {
  const normalized = normalizeProductStock(product, timestamp);
  const requestedQuantity = normalizeRequestedQuantity(quantity);

  if (normalized.has_infinite_stock) {
    return {
      ...normalized,
      updated_at: timestamp,
      updated_date: timestamp,
    };
  }

  if (!hasStock(normalized, requestedQuantity)) {
    throw new Error(`Estoque insuficiente para o produto ${normalized.name || normalized.id}.`);
  }

  return {
    ...normalized,
    reserved_quantity: normalized.reserved_quantity + requestedQuantity,
    updated_at: timestamp,
    updated_date: timestamp,
  };
}

export function releaseStock(product = {}, quantity = 0, timestamp = new Date().toISOString()) {
  const normalized = normalizeProductStock(product, timestamp);
  const requestedQuantity = normalizeRequestedQuantity(quantity);

  if (normalized.has_infinite_stock) {
    return {
      ...normalized,
      updated_at: timestamp,
      updated_date: timestamp,
    };
  }

  return {
    ...normalized,
    reserved_quantity: Math.max(0, normalized.reserved_quantity - requestedQuantity),
    updated_at: timestamp,
    updated_date: timestamp,
  };
}

export function decrementStock(product = {}, quantity = 0, timestamp = new Date().toISOString()) {
  const normalized = normalizeProductStock(product, timestamp);
  const requestedQuantity = normalizeRequestedQuantity(quantity);

  if (normalized.has_infinite_stock) {
    return {
      ...normalized,
      updated_at: timestamp,
      updated_date: timestamp,
    };
  }

  if (normalized.stock_quantity < requestedQuantity) {
    throw new Error(`Estoque insuficiente para o produto ${normalized.name || normalized.id}.`);
  }

  return {
    ...normalized,
    stock_quantity: normalized.stock_quantity - requestedQuantity,
    reserved_quantity: Math.max(0, normalized.reserved_quantity - requestedQuantity),
    updated_at: timestamp,
    updated_date: timestamp,
  };
}
