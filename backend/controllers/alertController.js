import Alert from '../models/Alert.js';
import {
  getAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  deleteAlert,
  clearAllAlerts,
} from '../services/alertService.js';

/**
 * List all alerts with optional filtering
 */
export async function getAllAlerts(req, res) {
  try {
    const { serverId, severity, isRead, limit } = req.query;
    const alerts = await getAlerts({ serverId, severity, isRead, limit });

    return res.json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to retrieve alerts: ${error.message}`,
    });
  }
}

/**
 * Get a single alert by ID
 */
export async function getAlertById(req, res) {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    return res.json({
      success: true,
      alert,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch alert: ${error.message}`,
    });
  }
}

/**
 * Mark a specific alert as read
 */
export async function markRead(req, res) {
  try {
    const alert = await markAlertAsRead(req.params.id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('alert_marked_read', { id: req.params.id });
    }

    return res.json({
      success: true,
      message: 'Alert marked as read',
      alert,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to update alert: ${error.message}`,
    });
  }
}

/**
 * Mark all alerts as read
 */
export async function markAllRead(req, res) {
  try {
    const result = await markAllAlertsAsRead();
    const io = req.app.get('io');
    if (io) {
      io.emit('all_alerts_read');
    }

    return res.json({
      success: true,
      message: 'All alerts marked as read',
      result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to mark all alerts: ${error.message}`,
    });
  }
}

/**
 * Delete a specific alert
 */
export async function removeAlert(req, res) {
  try {
    const removed = await deleteAlert(req.params.id);
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('alert_deleted', { id: req.params.id });
    }

    return res.json({
      success: true,
      message: 'Alert deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to delete alert: ${error.message}`,
    });
  }
}

/**
 * Delete all alerts
 */
export async function removeAllAlerts(req, res) {
  try {
    await clearAllAlerts();
    const io = req.app.get('io');
    if (io) {
      io.emit('all_alerts_cleared');
    }

    return res.json({
      success: true,
      message: 'All alerts cleared successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to clear alerts: ${error.message}`,
    });
  }
}

export default {
  getAllAlerts,
  getAlertById,
  markRead,
  markAllRead,
  removeAlert,
  removeAllAlerts,
};
