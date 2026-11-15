import express from 'express';
import {
  getAllAlerts,
  getAlertById,
  markRead,
  markAllRead,
  removeAlert,
  removeAllAlerts,
} from '../controllers/alertController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/alerts - List alerts
router.get('/', getAllAlerts);

// PUT /api/alerts/read-all - Mark all alerts as read (Protected)
router.put('/read-all', authMiddleware, markAllRead);

// DELETE /api/alerts/clear-all - Delete all alerts (Protected)
router.delete('/clear-all', authMiddleware, removeAllAlerts);

// GET /api/alerts/:id - Get single alert
router.get('/:id', getAlertById);

// PUT /api/alerts/:id/read - Mark single alert as read (Protected)
router.put('/:id/read', authMiddleware, markRead);

// DELETE /api/alerts/:id - Delete single alert (Protected)
router.delete('/:id', authMiddleware, removeAlert);

export default router;
