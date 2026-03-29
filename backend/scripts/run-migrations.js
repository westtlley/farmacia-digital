import { closePool, ensureDatabaseConnection } from '../db.js';
import { runMigrations } from '../migrator.js';

async function main() {
  await ensureDatabaseConnection();
  await runMigrations();
  console.log('Migrations aplicadas com sucesso.');
}

main()
  .catch((error) => {
    console.error('Falha ao rodar migrations:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
