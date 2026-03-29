import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.AUTH_COOKIE_SECURE = 'false';
process.env.AUTH_COOKIE_SAME_SITE = 'lax';
process.env.ENABLE_API_CSP = 'false';
process.env.STORAGE_PROVIDER = 'local';
delete process.env.REDIS_URL;
delete process.env.SENTRY_DSN;

const mocks = vi.hoisted(() => {
  const state = {
    currentProduct: null,
    orderSequence: 1,
    transactionQueue: Promise.resolve(),
  };

  return {
    state,
    authUtils: {
      verifyPassword: vi.fn(),
      hashToken: vi.fn((value) => `hashed:${value}`),
    },
    db: {
      ensureDatabaseConnection: vi.fn(),
      pingDatabase: vi.fn(async () => ({ available: true })),
      withTransaction: vi.fn(),
    },
    adminUsers: {
      findAdminByEmail: vi.fn(),
      findAdminById: vi.fn(),
      touchAdminLogin: vi.fn(),
    },
    authSessions: {
      cleanupExpiredSessions: vi.fn(async () => undefined),
      createSession: vi.fn(async (session) => session),
      deleteSessionByTokenHash: vi.fn(async () => undefined),
      findSessionByTokenHash: vi.fn(async () => null),
    },
    categories: {
      deleteCategory: vi.fn(),
      listCategories: vi.fn(async () => []),
      upsertCategory: vi.fn(),
    },
    coupons: {
      findCouponByCode: vi.fn(async () => null),
      incrementCouponUsage: vi.fn(async () => undefined),
    },
    customers: {
      countCustomers: vi.fn(async () => 0),
      findCustomerById: vi.fn(async () => null),
      findCustomerByIdentity: vi.fn(async () => null),
      listCustomers: vi.fn(async () => []),
      upsertCustomer: vi.fn(),
    },
    orders: {
      listOrders: vi.fn(async () => []),
      countOrders: vi.fn(async () => 0),
      countOrdersForCustomerIdentity: vi.fn(async () => 0),
      findOrderById: vi.fn(async () => null),
      findOrderByOrderNumber: vi.fn(async () => null),
      upsertOrder: vi.fn(),
    },
    prescriptions: {
      findPrescriptionById: vi.fn(async () => null),
      listPrescriptions: vi.fn(async () => []),
      upsertPrescription: vi.fn(async (payload) => payload),
    },
    products: {
      countProducts: vi.fn(async () => 0),
      deleteProduct: vi.fn(),
      findProductById: vi.fn(async () => null),
      listProducts: vi.fn(async () => []),
      lockProductsByIds: vi.fn(),
      saveProductRecord: vi.fn(),
      upsertProduct: vi.fn(),
    },
    settings: {
      getSettings: vi.fn(async () => ({})),
      upsertSettings: vi.fn(),
    },
  };
});

vi.mock('../authUtils.js', () => mocks.authUtils);
vi.mock('../db.js', () => mocks.db);
vi.mock('../repositories/adminUsersRepository.js', () => mocks.adminUsers);
vi.mock('../repositories/authSessionsRepository.js', () => mocks.authSessions);
vi.mock('../repositories/categoriesRepository.js', () => mocks.categories);
vi.mock('../repositories/couponsRepository.js', () => mocks.coupons);
vi.mock('../repositories/customersRepository.js', () => mocks.customers);
vi.mock('../repositories/ordersRepository.js', () => mocks.orders);
vi.mock('../repositories/prescriptionsRepository.js', () => mocks.prescriptions);
vi.mock('../repositories/productsRepository.js', () => mocks.products);
vi.mock('../repositories/settingsRepository.js', () => mocks.settings);

const { app } = await import('../app.js');

function createProduct(overrides = {}) {
  return {
    id: 'prod_1',
    name: 'Medicamento Teste',
    price: 25,
    promotional_price: null,
    stock_quantity: 5,
    reserved_quantity: 0,
    requires_prescription: false,
    is_antibiotic: false,
    is_controlled: false,
    active: true,
    status: 'active',
    category: 'medicamentos',
    created_date: '2026-03-29T00:00:00.000Z',
    updated_date: '2026-03-29T00:00:00.000Z',
    ...overrides,
  };
}

function createCustomer(overrides = {}) {
  return {
    id: 'cust_1',
    name: 'Cliente Teste',
    email: 'cliente@example.com',
    phone: '11999999999',
    zipcode: '01001000',
    created_date: '2026-03-29T00:00:00.000Z',
    updated_date: '2026-03-29T00:00:00.000Z',
    ...overrides,
  };
}

function createOrderPayload(overrides = {}) {
  return {
    customer_name: 'Cliente Teste',
    customer_email: 'cliente@example.com',
    customer_phone: '11999999999',
    customer_zipcode: '01001000',
    payment_method: 'pix',
    items: [
      {
        product_id: 'prod_1',
        quantity: 1,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.currentProduct = createProduct();
  mocks.state.orderSequence = 1;
  mocks.state.transactionQueue = Promise.resolve();

  mocks.db.withTransaction.mockImplementation(async (handler) => {
    const previous = mocks.state.transactionQueue;
    let release;
    mocks.state.transactionQueue = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await handler({});
    } finally {
      release();
    }
  });

  mocks.products.lockProductsByIds.mockImplementation(async () => [
    { ...mocks.state.currentProduct },
  ]);
  mocks.products.saveProductRecord.mockImplementation(async (product) => {
    mocks.state.currentProduct = { ...product };
    return product;
  });

  mocks.customers.upsertCustomer.mockImplementation(async (payload) => createCustomer({
    id: payload.id || 'cust_1',
    name: payload.name || 'Cliente Teste',
    email: payload.email || 'cliente@example.com',
    phone: payload.phone || '11999999999',
    zipcode: payload.zipcode || '01001000',
  }));

  mocks.orders.upsertOrder.mockImplementation(async (order, items) => ({
    ...order,
    id: order.id || `order_${mocks.state.orderSequence}`,
    order_number: order.order_number || `PED${1000 + mocks.state.orderSequence++}`,
    items,
    total_amount: order.total,
  }));
});

describe('Farmacia backend critical flows', () => {
  it('faz login admin com cookie HttpOnly', async () => {
    const admin = {
      id: 'admin_1',
      email: 'admin@farmacia.com',
      full_name: 'Administrador',
      password_hash: 'hash',
      password_salt: 'salt',
      created_date: '2026-03-29T00:00:00.000Z',
      updated_date: '2026-03-29T00:00:00.000Z',
    };

    mocks.adminUsers.findAdminByEmail.mockResolvedValue(admin);
    mocks.adminUsers.touchAdminLogin.mockResolvedValue({
      ...admin,
      last_login_at: '2026-03-29T00:00:00.000Z',
    });
    mocks.authUtils.verifyPassword.mockReturnValue(true);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@farmacia.com',
        password: 'Admin#123456',
      });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('admin');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('bloqueia rota protegida sem autenticacao', async () => {
    const response = await request(app).get('/api/orders');
    expect(response.status).toBe(401);
  });

  it('cria pedido valido e reduz estoque no backend', async () => {
    const response = await request(app)
      .post('/api/orders')
      .send(createOrderPayload());

    expect(response.status).toBe(201);
    expect(mocks.products.saveProductRecord).toHaveBeenCalledTimes(1);
    expect(mocks.state.currentProduct.stock_quantity).toBe(4);
  });

  it('bloqueia produto controlado sem receita', async () => {
    mocks.state.currentProduct = createProduct({
      requires_prescription: true,
      is_controlled: true,
    });

    const response = await request(app)
      .post('/api/orders')
      .send(createOrderPayload());

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/receita/i);
    expect(mocks.products.saveProductRecord).not.toHaveBeenCalled();
  });

  it('permite produto controlado com receita aprovada', async () => {
    mocks.state.currentProduct = createProduct({
      requires_prescription: true,
      is_controlled: true,
    });
    mocks.prescriptions.findPrescriptionById.mockResolvedValue({
      id: 'presc_1',
      customer_id: 'cust_1',
      customer_email: 'cliente@example.com',
      customer_phone: '11999999999',
      status: 'approved',
      review_status: 'approved',
      created_date: '2026-03-29T00:00:00.000Z',
      updated_date: '2026-03-29T00:00:00.000Z',
    });

    const response = await request(app)
      .post('/api/orders')
      .send(createOrderPayload({
        prescription_id: 'presc_1',
      }));

    expect(response.status).toBe(201);
    expect(mocks.products.saveProductRecord).toHaveBeenCalledTimes(1);
  });

  it('mantem consistencia basica em duas compras simultaneas com estoque 1', async () => {
    mocks.state.currentProduct = createProduct({
      stock_quantity: 1,
    });

    const payload = createOrderPayload();
    const [first, second] = await Promise.all([
      request(app).post('/api/orders').send(payload),
      request(app).post('/api/orders').send(payload),
    ]);

    const statuses = [first.status, second.status].sort((left, right) => left - right);
    expect(statuses).toEqual([201, 409]);
    expect(mocks.state.currentProduct.stock_quantity).toBe(0);
  });
});
