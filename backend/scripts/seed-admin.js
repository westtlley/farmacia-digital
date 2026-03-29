import { closePool, ensureDatabaseConnection } from '../db.js';
import { ensureBootstrapData } from '../bootstrap.js';
import { runMigrations } from '../migrator.js';

async function main() {
  await ensureDatabaseConnection();
  await runMigrations();
  await ensureBootstrapData();
  console.log('Bootstrap inicial aplicado com sucesso.');
}

main()
  .catch((error) => {
    console.error('Falha ao aplicar bootstrap inicial:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
