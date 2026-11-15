import mongoose from 'mongoose';
import { isDbConnected, memoryStore } from '../config/db.js';

const ServerSchema = new mongoose.Schema(
  {
    serverName: {
      type: String,
      required: true,
      trim: true,
    },
    serverUrl: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    monitoringInterval: {
      type: Number,
      required: true,
      default: 10, // In seconds
      min: 3,
      max: 3600,
    },
    responseTimeThreshold: {
      type: Number,
      required: true,
      default: 500, // In milliseconds
      min: 10,
      max: 30000,
    },
    currentStatus: {
      type: String,
      enum: ['ACTIVE', 'SLOW', 'DISCONNECTED', 'RECOVERING'],
      default: 'ACTIVE',
    },
    isMonitoring: {
      type: Boolean,
      default: true,
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
    },
    consecutiveSuccesses: {
      type: Number,
      default: 0,
    },
    lastResponseTime: {
      type: Number,
      default: 0,
    },
    lastStatusCode: {
      type: Number,
      default: 0,
    },
    lastCheckedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // handles createdAt & updatedAt
  }
);

ServerSchema.index({ currentStatus: 1 });
ServerSchema.index({ isMonitoring: 1 });

const MongooseServer = mongoose.models.Server || mongoose.model('Server', ServerSchema);

class ServerModelAdapter {
  static async countDocuments(query = {}) {
    if (isDbConnected()) {
      return await MongooseServer.countDocuments(query);
    }
    return this._filterMemory(query).length;
  }

  static async find(query = {}) {
    if (isDbConnected()) {
      return await MongooseServer.find(query).sort({ updatedAt: -1 });
    }
    const results = this._filterMemory(query);
    return results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  static async findById(id) {
    if (isDbConnected()) {
      return await MongooseServer.findById(id);
    }
    return memoryStore.servers.find((s) => s._id.toString() === id.toString()) || null;
  }

  static async create(doc) {
    if (isDbConnected()) {
      return await MongooseServer.create(doc);
    }
    const now = new Date();
    const newServer = {
      _id: doc._id || new mongoose.Types.ObjectId(),
      serverName: doc.serverName,
      serverUrl: doc.serverUrl,
      description: doc.description || '',
      monitoringInterval: doc.monitoringInterval || 10,
      responseTimeThreshold: doc.responseTimeThreshold || 500,
      currentStatus: doc.currentStatus || 'ACTIVE',
      isMonitoring: doc.isMonitoring !== undefined ? doc.isMonitoring : true,
      consecutiveFailures: doc.consecutiveFailures || 0,
      consecutiveSuccesses: doc.consecutiveSuccesses || 0,
      lastResponseTime: doc.lastResponseTime || 0,
      lastStatusCode: doc.lastStatusCode || 0,
      lastCheckedAt: doc.lastCheckedAt || null,
      createdAt: doc.createdAt || now,
      updatedAt: doc.updatedAt || now,
    };
    memoryStore.servers.push(newServer);
    return newServer;
  }

  static async findByIdAndUpdate(id, updateData, options = {}) {
    if (isDbConnected()) {
      return await MongooseServer.findByIdAndUpdate(id, updateData, { new: true, ...options });
    }
    const index = memoryStore.servers.findIndex((s) => s._id.toString() === id.toString());
    if (index === -1) return null;

    const existing = memoryStore.servers[index];
    const updated = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    memoryStore.servers[index] = updated;
    return updated;
  }

  static async findByIdAndDelete(id) {
    if (isDbConnected()) {
      return await MongooseServer.findByIdAndDelete(id);
    }
    const index = memoryStore.servers.findIndex((s) => s._id.toString() === id.toString());
    if (index === -1) return null;
    const removed = memoryStore.servers.splice(index, 1);
    return removed[0];
  }

  static _filterMemory(query) {
    return memoryStore.servers.filter((s) => {
      for (const [key, val] of Object.entries(query)) {
        if (s[key] !== val) return false;
      }
      return true;
    });
  }
}

export default ServerModelAdapter;
