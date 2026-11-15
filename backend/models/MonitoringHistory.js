import mongoose from 'mongoose';
import { isDbConnected, memoryStore } from '../config/db.js';

const MonitoringHistorySchema = new mongoose.Schema({
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true,
    index: true,
  },
  responseTime: {
    type: Number,
    required: true,
    default: 0,
  },
  statusCode: {
    type: Number,
    required: true,
    default: 0,
  },
  healthStatus: {
    type: String,
    enum: ['ACTIVE', 'SLOW', 'DISCONNECTED', 'RECOVERING'],
    required: true,
  },
  isReachable: {
    type: Boolean,
    required: true,
  },
  checkedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  errorMessage: {
    type: String,
    default: null,
  },
});

MonitoringHistorySchema.index({ serverId: 1, checkedAt: -1 });

const MongooseMonitoringHistory =
  mongoose.models.MonitoringHistory ||
  mongoose.model('MonitoringHistory', MonitoringHistorySchema);

class MonitoringHistoryModelAdapter {
  static async create(doc) {
    if (isDbConnected()) {
      return await MongooseMonitoringHistory.create(doc);
    }
    const newRecord = {
      _id: doc._id || new mongoose.Types.ObjectId(),
      serverId: doc.serverId,
      responseTime: doc.responseTime || 0,
      statusCode: doc.statusCode || 0,
      healthStatus: doc.healthStatus,
      isReachable: doc.isReachable,
      checkedAt: doc.checkedAt || new Date(),
      errorMessage: doc.errorMessage || null,
    };
    memoryStore.monitoringHistories.unshift(newRecord);
    // Keep max 2000 records in memory
    if (memoryStore.monitoringHistories.length > 2000) {
      memoryStore.monitoringHistories.length = 2000;
    }
    return newRecord;
  }

  static async find(query = {}) {
    if (isDbConnected()) {
      return await MongooseMonitoringHistory.find(query).sort({ checkedAt: -1 });
    }
    return memoryStore.monitoringHistories
      .filter((item) => {
        if (query.serverId && item.serverId.toString() !== query.serverId.toString()) return false;
        if (query.checkedAt) {
          if (query.checkedAt.$gte && new Date(item.checkedAt) < new Date(query.checkedAt.$gte)) return false;
          if (query.checkedAt.$lte && new Date(item.checkedAt) > new Date(query.checkedAt.$lte)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.checkedAt) - new Date(a.checkedAt));
  }

  static async countDocuments(query = {}) {
    if (isDbConnected()) {
      return await MongooseMonitoringHistory.countDocuments(query);
    }
    const results = await this.find(query);
    return results.length;
  }

  static async deleteMany(query = {}) {
    if (isDbConnected()) {
      return await MongooseMonitoringHistory.deleteMany(query);
    }
    if (query.serverId) {
      memoryStore.monitoringHistories = memoryStore.monitoringHistories.filter(
        (h) => h.serverId.toString() !== query.serverId.toString()
      );
    } else {
      memoryStore.monitoringHistories = [];
    }
    return { acknowledged: true };
  }
}

export default MonitoringHistoryModelAdapter;
