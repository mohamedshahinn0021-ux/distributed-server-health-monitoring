import { verifyToken } from '../utils/cryptoAuth.js';
import Admin from '../models/Admin.js';

/**
 * Middleware to protect administrative routes
 */
export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Access token missing or invalid format (Bearer token required)',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Token payload is empty',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: `Unauthorized: ${err.message}`,
      });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Administrative user account does not exist or was removed',
      });
    }

    req.user = {
      id: admin._id,
      username: admin.username,
      email: admin.email,
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Authentication error: ${error.message}`,
    });
  }
}

export default authMiddleware;
