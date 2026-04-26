import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';
import { connectDatabase } from './utils/db.js';
import { validateServerConfig } from './utils/config.js';
import { ensureStorage } from './utils/storage.js';
import { startCleanupCron } from './services/cleanupService.js';
import { startSchedulerCron } from './services/schedulerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const port = process.env.PORT || 5000;

validateServerConfig();
await ensureStorage();
await connectDatabase();

const app = createApp();

app.listen(port, () => {
  console.log(`ShortifyAI API running on http://localhost:${port}`);
  startCleanupCron();
  startSchedulerCron();
});
