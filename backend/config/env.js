// Central place where environment configuration is read and validated.
// Everything else imports from here rather than touching process.env, so a
// missing variable fails loudly at startup instead of somewhere deep in a
// request handler.

require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

function requireInProduction(name) {
  const value = process.env[name];
  if (!value && isProduction) {
    console.error(`FATAL: ${name} is not set. Refusing to start in production.`);
    process.exit(1);
  }
  return value;
}

// A predictable fallback secret would let anyone mint valid tokens, so in
// production we refuse to boot without a real one rather than degrade quietly.
const jwtSecret = requireInProduction('JWT_SECRET');
if (!jwtSecret) {
  console.warn('WARNING: JWT_SECRET not set, using an insecure development default.');
}

module.exports = {
  isProduction,
  port: process.env.PORT || 5000,
  mongoUri: requireInProduction('MONGODB_URI') || 'mongodb://localhost:27017/metropulse',
  jwtSecret: jwtSecret || 'insecure-dev-only-secret',
  // Comma-separated so preview deployments can be added without a code change.
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
};