import Admin from '../models/Admin.js';
import { hashPassword, comparePassword, signToken } from '../utils/cryptoAuth.js';

/**
 * Register a new Administrator
 */
export async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required fields',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check if username or email already exists
    const existingByUsername = await Admin.findOne({ username: username.trim() });
    if (existingByUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username is already registered',
      });
    }

    const existingByEmail = await Admin.findOne({ email: email.trim().toLowerCase() });
    if (existingByEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use',
      });
    }

    const hashedPassword = await hashPassword(password);
    const newAdmin = await Admin.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      createdAt: new Date(),
    });

    const token = signToken({
      id: newAdmin._id,
      username: newAdmin.username,
      email: newAdmin.email,
    });

    return res.status(201).json({
      success: true,
      message: 'Administrator registered successfully',
      token,
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Registration failed: ${error.message}`,
    });
  }
}

/**
 * Administrator Login
 */
export async function login(req, res) {
  try {
    const { identifier, username, email, password } = req.body;
    const loginUserOrEmail = (identifier || username || email || '').trim();

    if (!loginUserOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username/email and password',
      });
    }

    // Search by username or email
    let admin = await Admin.findOne({ username: loginUserOrEmail });
    if (!admin) {
      admin = await Admin.findOne({ email: loginUserOrEmail.toLowerCase() });
    }

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials: No administrator found with that username or email',
      });
    }

    const isMatch = await comparePassword(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials: Password incorrect',
      });
    }

    const token = signToken({
      id: admin._id,
      username: admin.username,
      email: admin.email,
    });

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Login error: ${error.message}`,
    });
  }
}

/**
 * Get Profile of Authenticated Administrator
 */
export async function getProfile(req, res) {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found',
      });
    }

    return res.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch profile: ${error.message}`,
    });
  }
}

export default {
  register,
  login,
  getProfile,
};
