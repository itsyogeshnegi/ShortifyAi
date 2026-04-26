import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { connectDatabase } from '../utils/db.js';
import { validateServerConfig, validateSuperAdminConfig } from '../utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

validateServerConfig();
validateSuperAdminConfig();
await connectDatabase();

const email = process.env.SUPER_ADMIN_EMAIL.toLowerCase().trim();
const password = process.env.SUPER_ADMIN_PASSWORD;
const name = process.env.SUPER_ADMIN_NAME || 'ShortifyAI Admin';

const existing = await User.findOne({ email });

if (existing) {
  existing.name = name;
  existing.password = password;
  existing.role = 'super-admin';
  existing.plan = 'Admin';
  await existing.save();
  console.log(`Super-admin updated: ${email}`);
} else {
  await User.create({
    name,
    email,
    password,
    role: 'super-admin',
    plan: 'Admin'
  });
  console.log(`Super-admin created: ${email}`);
}

process.exit(0);
