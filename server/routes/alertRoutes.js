import express from 'express';
import Alert from '../models/Alert.js';

const router = express.Router();

/**
 * GET /api/alerts
 * Retrieve all alerts with optional severity and isRead filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { severity, isRead, limit = 100 } = req.query;
    const filter = {};

    if (severity) filter.severity = severity.toUpperCase();
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const maxLimit = Math.min(Number(limit) || 100, 500);
    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .limit(maxLimit);

    const unreadCount = await Alert.countDocuments({ isRead: false });

    return res.json({
      success: true,
      unreadCount,
      count: alerts.length,
      data: alerts,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/alerts/:id/read
 * Mark a single alert as read
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('alert_marked_read', { alertId: req.params.id });
    }

    return res.json({
      success: true,
      message: 'Alert marked as read',
      data: alert,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/alerts/read-all
 * Mark all alerts as read
 */
router.patch('/read-all', async (req, res, next) => {
  try {
    const alerts = await Alert.find({ isRead: false });
    for (const a of alerts) {
      await Alert.findByIdAndUpdate(a._id, { isRead: true });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('all_alerts_read');
    }

    return res.json({
      success: true,
      message: 'All alerts marked as read',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/alerts/:id
 * Remove a single alert
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    return res.json({ success: true, message: 'Alert removed' });
  } catch (err) {
    next(err);
  }
});

export default router;
