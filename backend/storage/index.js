import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../logger.js';
import { createLocalStorageProvider } from './localStorage.js';
import { createS3StorageProvider } from './s3Storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localProvider = createLocalStorageProvider({
  rootDir: path.join(__dirname, '..', 'data', 'prescription_uploads'),
});

const providers = new Map([['local', localProvider]]);

function buildPrimaryProvider() {
  const requestedProvider = String(process.env.STORAGE_PROVIDER || 'local').trim().toLowerCase();

  if (requestedProvider === 's3') {
    try {
      const s3Provider = createS3StorageProvider({
        bucket: process.env.STORAGE_S3_BUCKET,
        region: process.env.STORAGE_S3_REGION,
        endpoint: process.env.STORAGE_S3_ENDPOINT,
        accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
        forcePathStyle: process.env.STORAGE_S3_FORCE_PATH_STYLE,
      });
      providers.set('s3', s3Provider);
      return s3Provider;
    } catch (error) {
      logger.warn('storage.provider.fallback_local', {
        requested_provider: requestedProvider,
        reason: error.message,
      });
    }
  }

  return localProvider;
}

const primaryProvider = buildPrimaryProvider();

export function getPrimaryStorageProvider() {
  return primaryProvider;
}

export function getStorageProviderByName(name = '') {
  return providers.get(String(name || '').trim().toLowerCase()) || localProvider;
}

export async function checkPrimaryStorageHealth() {
  try {
    const status = await primaryProvider.checkHealth();
    return {
      configured: true,
      available: true,
      provider: primaryProvider.name,
      ...status,
    };
  } catch (error) {
    logger.error('storage.healthcheck.failed', {
      provider: primaryProvider.name,
      reason: error.message,
    });
    return {
      configured: true,
      available: false,
      provider: primaryProvider.name,
      reason: error.message,
    };
  }
}

export function resolvePrescriptionStorage(record = {}) {
  const providerName = record.storage_provider || (record.file_path ? 'local' : primaryProvider.name);
  return {
    providerName,
    provider: getStorageProviderByName(providerName),
    fileKey: record.file_key || null,
    legacyFilePath: record.file_path || null,
  };
}
