import crypto from 'crypto';
import { DEFAULT_COUPONS } from '../shared/coupons.js';
import { hashPassword } from './authUtils.js';
import { defaultCategories, defaultSettings } from './defaultData.js';
import { countAdmins, upsertAdmin } from './repositories/adminUsersRepository.js';
import { countCategories, upsertCategory } from './repositories/categoriesRepository.js';
import { upsertCoupon } from './repositories/couponsRepository.js';
import { getSettings, upsertSettings } from './repositories/settingsRepository.js';

export async function ensureBootstrapData() {
  const settings = await getSettings();
  if (!settings) {
    await upsertSettings(defaultSettings());
  }

  if ((await countCategories()) === 0) {
    for (const category of defaultCategories()) {
      await upsertCategory(category);
    }
  }

  for (const coupon of DEFAULT_COUPONS) {
    await upsertCoupon(coupon);
  }

  if ((await countAdmins()) === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@farmacia.local';
    const configuredPassword = process.env.ADMIN_PASSWORD;
    const generatedPassword = configuredPassword || crypto.randomBytes(12).toString('base64url');
    const { salt, hash } = hashPassword(generatedPassword);
    const now = new Date().toISOString();

    await upsertAdmin({
      id: 'admin_1',
      email: adminEmail,
      full_name: 'Administrador',
      role: 'admin',
      password_hash: hash,
      password_salt: salt,
      active: true,
      created_date: now,
      updated_date: now,
    });

    if (!configuredPassword) {
      console.warn('ADMIN_PASSWORD nao configurado. Senha temporaria gerada para o admin inicial:', generatedPassword);
    }
  }
}
