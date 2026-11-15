import crypto from 'crypto';

/**
 * Hash password securely using Node.js native crypto pbkdf2
 * @param {string} password 
 * @returns {string} salt:hash format
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash
 * @param {string} password 
 * @param {string} storedHash 
 * @returns {boolean}
 */
export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

/**
 * Authentication Middleware to protect administrative routes.
 * Checks for API key via 'x-api-key' header or Bearer token in 'Authorization' header.
 * If ADMIN_API_KEY environment variable is configured, requests must supply a valid key.
 * In development without ADMIN_API_KEY configured, it allows requests with admin context.
 */
export function authMiddleware(req, res, next) {
  const configuredKey = process.env.ADMIN_API_KEY;

  // If no API key configured in .env, permit in development evaluation mode
  if (!configuredKey) {
    req.user = { role: 'admin', mode: 'dev-open' };
    return next();
  }

  const apiKeyHeader = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  let token = apiKeyHeader;

  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Missing x-api-key or Bearer token header.',
    });
  }

  if (token !== configuredKey) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Invalid authentication credentials.',
    });
  }

  req.user = { role: 'admin', authenticated: true };
  next();
}

export default authMiddleware;
