import Alert from '../models/Alert.js';

/**
 * Creates and saves an alert, deduplicating repetitive alerts within a cooldown window
 * 
 * @param {Object} alertData
 * @param {string} alertData.serverId
 * @param {string} alertData.alertType - 'DISCONNECTED' | 'SLOW_PERFORMANCE' | 'RECOVERING' | 'RECOVERY_COMPLETED' | 'INFO'
 * @param {string} alertData.message
 * @param {string} alertData.severity - 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS'
 * @param {Object} [io] - Optional Socket.IO instance for real-time emission
 * @returns {Promise<Object|null>} Saved alert object or null if deduplicated
 */
export async function createAlert({ serverId, alertType, message, severity = 'INFO' }, io = null) {
  try {
    // Deduplication check: Do not create duplicate unread alert of same type within 60 seconds
    const sixtySecondsAgo = new Date(Date.now() - 60000);
    const existingAlerts = await Alert.find({
      serverId,
      alertType,
      isRead: false,
    });

    const isRecentDuplicate = existingAlerts.some(
      (a) => new Date(a.createdAt) > sixtySecondsAgo
    );

    if (isRecentDuplicate) {
      return null;
    }

    const alert = await Alert.create({
      serverId,
      alertType,
      message,
      severity,
      isRead: false,
      createdAt: new Date(),
    });

    // Broadcast alert via Socket.IO
    if (io) {
      io.emit('new_alert', alert);
    }

    return alert;
  } catch (error) {
    console.error('[AlertService] Error creating alert:', error.message);
    return null;
  }
}

/**
 * Retrieve alerts with optional filters and sorting
 */
export async function getAlerts({ serverId, severity, isRead, limit = 50 }) {
  const query = {};
  if (serverId) query.serverId = serverId;
  if (severity) query.severity = severity;
  if (isRead !== undefined && isRead !== null) {
    query.isRead = isRead === 'true' || isRead === true;
  }

  const alerts = await Alert.find(query);
  return alerts.slice(0, Number(limit) || 50);
}

/**
 * Mark a single alert as read
 */
export async function markAlertAsRead(alertId) {
  return await Alert.findByIdAndUpdate(alertId, { isRead: true });
}

/**
 * Mark all alerts as read
 */
export async function markAllAlertsAsRead() {
  const unreadAlerts = await Alert.find({ isRead: false });
  for (const alert of unreadAlerts) {
    await Alert.findByIdAndUpdate(alert._id, { isRead: true });
  }
  return { updatedCount: unreadAlerts.length };
}

/**
 * Delete a specific alert
 */
export async function deleteAlert(alertId) {
  return await Alert.findByIdAndDelete(alertId);
}

/**
 * Clear all alerts
 */
export async function clearAllAlerts() {
  return await Alert.deleteMany({});
}

export default {
  createAlert,
  getAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  deleteAlert,
  clearAllAlerts,
};
