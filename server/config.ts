import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvFile();

export const config = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  sessionSecret:
    process.env.SESSION_SECRET || 'boyang-digital-dev-secret-change-in-production',
  databasePath: path.resolve(
    process.cwd(),
    process.env.DATABASE_PATH || './data/boyang-digital.db'
  ),
  uploadsDir: path.resolve(process.cwd(), process.env.UPLOADS_DIR || './data/uploads'),
  paymentSandboxMode:
    (process.env.PAYMENT_SANDBOX_MODE || 'true').toLowerCase() === 'true',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@boyangdigital.id',
  adminPassword: process.env.ADMIN_PASSWORD || 'AdminBoyang#2026',
  demoUserEmail: process.env.DEMO_USER_EMAIL || 'user@boyangdigital.id',
  demoUserPassword: process.env.DEMO_USER_PASSWORD || 'UserBoyang#2026',
  web3TreasuryAddress:
    process.env.WEB3_TREASURY_ADDRESS || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
};
