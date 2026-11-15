import mongoose from 'mongoose';
import { isDbConnected, memoryStore } from '../config/db.js';

const AlertSchema = new mongoose.Schema({
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true,
    index: true,
  },
  alertType: {
    type: String,
    enum: ['DISCONNECTED', 'SLOW_PERFORMANCE', 'RECOVERING', 'RECOVERY_COMPLETED', 'INFO', 'SYSTEM'],
    default: 'DISCONNECTED',
  },
  message: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    enum: ['CRITICAL', 'WARNING', 'INFO', 'SUCCESS'],
    default: 'INFO',
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

AlertSchema.index({ serverId: 1, createdAt: -1 });

const MongooseAlert = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);

class AlertModelAdapter {
  static async create(doc) {
    if (isDbConnected()) {
      return await MongooseAlert.create(doc);
    }
    const newAlert = {
      _id: doc._id || new mongoose.Types.ObjectId(),
      serverId: doc.serverId,
      alertType: doc.alertType || 'DISCONNECTED',
      message: doc.message,
      severity: doc.severity || 'INFO',
      isRead: doc.isRead || false,
      createdAt: doc.createdAt || new Date(),
    };
    memoryStore.alerts.unshift(newAlert);
    if (memoryStore.alerts.length > 500) {
      memoryStore.alerts.length = 500;
    }
    return newAlert;
  }

  static async find(query = {}) {
    if (isDbConnected()) {
      return await MongooseAlert.find(query).sort({ createdAt: -1 });
    }
    return memoryStore.alerts
      .filter((a) => {
        if (query.serverId && a.serverId.toString() !== query.serverId.toString()) return false;
        if (query.severity && a.severity !== query.severity) return false;
        if (query.isRead !== undefined && a.isRead !== query.isRead) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findById(id) {
    if (isDbConnected()) {
      return await MongooseAlert.findById(id);
    }
    return memoryStore.alerts.find((a) => a._id.toString() === id.toString()) || null;
  }

  static async findByIdAndUpdate(id, updateData, options = {}) {
    if (isDbConnected()) {
      return await MongooseAlert.findByIdAndUpdate(id, updateData, { new: true, ...options });
    }
    const index = memoryStore.alerts.findIndex((a) => a._id.toString() === id.toString());
    if (index === -1) return null;
    const existing = memoryStore.alerts[index];
    const updated = { ...existing, ...updateData };
    memoryStore.alerts[index] = updated;
    return updated;
  }

  static async findByIdAndDelete(id) {
    if (isDbConnected()) {
      return await MongooseAlert.findByIdAndDelete(id);
    }
    const index = memoryStore.alerts.findIndex((a) => a._id.toString() === id.toString());
    if (index === -1) return null;
    const removed = memoryStore.alerts.splice(index, 1);
    return removed[0];
  }

  static async deleteMany(query = {}) {
    if (isDbConnected()) {
      return await MongooseAlert.deleteMany(query);
    }
    if (query.serverId) {
      memoryStore.alerts = memoryStore.alerts.filter(
        (a) => a.serverId.toString() !== query.serverId.toString()
      );
    } else {
      memoryStore.alerts = [];
    }
    return { acknowledged: true };
  }

  static async countDocuments(query = {}) {
    if (isDbConnected()) {
      return await MongooseAlert.countDocuments(query);
    }
    const items = await this.find(query);
    return items.length;
  }
}

export default AlertModelAdapter;
