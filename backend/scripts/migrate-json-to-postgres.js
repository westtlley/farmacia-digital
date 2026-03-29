import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureBootstrapData } from '../bootstrap.js';
import { closePool, ensureDatabaseConnection, withTransaction } from '../db.js';
import { runMigrations } from '../migrator.js';
import { upsertAdmin } from '../repositories/adminUsersRepository.js';
import { upsertCategory } from '../repositories/categoriesRepository.js';
import { upsertCustomer } from '../repositories/customersRepository.js';
import { upsertOrder } from '../repositories/ordersRepository.js';
import { upsertPrescription } from '../repositories/prescriptionsRepository.js';
import { upsertProduct } from '../repositories/productsRepository.js';
import { upsertSettings } from '../repositories/settingsRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

function readJsonIfExists(fileName, fallback) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  return raw ? JSON.parse(raw) : fallback;
}

function ensureOrderItemIds(order = {}) {
  return (Array.isArray(order.items) ? order.items : []).map((item, index) => ({
    ...item,
    id: item.id || `${order.id || order.order_number || 'order'}_item_${index + 1}`,
  }));
}

async function main() {
  await ensureDatabaseConnection();
  await runMigrations();
  await ensureBootstrapData();

  const categories = readJsonIfExists('categories.json', []);
  const settings = readJsonIfExists('settings.json', null);
  const admins = readJsonIfExists('admins.json', []);
  const products = readJsonIfExists('products.json', []);
  const customers = readJsonIfExists('customers.json', []);
  const prescriptions = readJsonIfExists('prescriptions.json', []);
  const orders = readJsonIfExists('orders.json', []);

  const summary = {
    categories: 0,
    settings: 0,
    admins: 0,
    products: 0,
    customers: 0,
    prescriptions: 0,
    orders: 0,
  };

  await withTransaction(async (client) => {
    for (const category of categories) {
      await upsertCategory(category, client);
      summary.categories += 1;
    }

    if (settings && !Array.isArray(settings)) {
      await upsertSettings(settings, client);
      summary.settings = 1;
    }

    for (const admin of admins) {
      await upsertAdmin(admin, client);
      summary.admins += 1;
    }

    for (const product of products) {
      await upsertProduct(product, client);
      summary.products += 1;
    }

    for (const customer of customers) {
      await upsertCustomer(customer, client);
      summary.customers += 1;
    }

    for (const prescription of prescriptions) {
      await upsertPrescription(
        {
          ...prescription,
          order_id: null,
          storage_provider: prescription.storage_provider || (prescription.file_path ? 'local' : null),
          file_key: prescription.file_key || prescription.file_path || null,
          uploaded_at: prescription.uploaded_at || prescription.created_date || null,
        },
        client
      );
      summary.prescriptions += 1;
    }

    for (const order of orders) {
      await upsertOrder(
        {
          ...order,
          discount_amount: order.discount_amount ?? order.discount ?? 0,
          total_amount: order.total_amount ?? order.total ?? 0,
        },
        ensureOrderItemIds(order),
        client
      );
      summary.orders += 1;
    }

    for (const prescription of prescriptions) {
      if (prescription.order_id) {
        await upsertPrescription(
          {
            ...prescription,
            storage_provider: prescription.storage_provider || (prescription.file_path ? 'local' : null),
            file_key: prescription.file_key || prescription.file_path || null,
            uploaded_at: prescription.uploaded_at || prescription.created_date || null,
          },
          client
        );
      }
    }
  });

  console.log('Migracao JSON -> Postgres concluida:', summary);
}

main()
  .catch((error) => {
    console.error('Falha ao migrar JSON para Postgres:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
