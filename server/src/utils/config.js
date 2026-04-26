const requiredServerEnv = ['JWT_SECRET'];

export function validateServerConfig() {
  const missing = requiredServerEnv.filter((key) => !process.env[key] || process.env[key].includes('replace-this'));

  if (missing.length) {
    throw new Error(`Missing required server environment variables: ${missing.join(', ')}. Copy server/.env.example to server/.env and set secure values.`);
  }
}

export function validateSuperAdminConfig() {
  const missing = ['SUPER_ADMIN_EMAIL', 'SUPER_ADMIN_PASSWORD'].filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing super-admin seed variables: ${missing.join(', ')}. Add them to server/.env before running seed:admin.`);
  }

  if (process.env.SUPER_ADMIN_PASSWORD.length < 8) {
    throw new Error('SUPER_ADMIN_PASSWORD must be at least 8 characters.');
  }
}
