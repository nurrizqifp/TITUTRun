import 'dotenv/config';
import { createApp, ensureDatabaseInitialized } from './src/app.js';

const { app, config } = createApp();
const { PORT: port } = config;

ensureDatabaseInitialized()
  .then(() => {
    app.listen(port, () => {
      console.log(`TITUT Run API berjalan di port ${port}.`);
    });
  })
  .catch((error) => {
    console.error('Gagal menyiapkan database TITUT Run:', error);
    process.exitCode = 1;
  });
