const path = require('path');

const toPort = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveDatabasePath = () => {
  if (process.env.DATABASE_PATH) {
    return path.isAbsolute(process.env.DATABASE_PATH)
      ? process.env.DATABASE_PATH
      : path.resolve(__dirname, process.env.DATABASE_PATH);
  }
  return path.join(__dirname, 'studentnet.sqlite');
};

module.exports = {
  port: toPort(process.env.PORT, 3001),
  databasePath: resolveDatabasePath(),
  databaseUrl: process.env.DATABASE_URL || null,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'studentnet_dev_jwt_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminJwtSecret: process.env.ADMIN_JWT_SECRET || 'studentnet_dev_admin_secret',
  adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '12h',
  primaryAdminEmail: (process.env.PRIMARY_ADMIN_EMAIL || 'annguyen23082007@gmail.com').toLowerCase(),
  defaultAdmin: {
    username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@studentnet.com',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
  },
};
