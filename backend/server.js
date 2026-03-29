import { startServer } from './app.js';

startServer().catch((error) => {
  console.error('Falha ao iniciar o backend:', error);
  process.exit(1);
});
