import mongoose from 'mongoose';
import { isDbConnected, memoryStore } from '../config/db.js';

const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const MongooseAdmin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

// In-Memory Fallback Adapter for resilient local execution without a MongoDB daemon
class AdminModelAdapter {
  static async countDocuments() {
    if (isDbConnected()) {
      return await MongooseAdmin.countDocuments();
    }
    return memoryStore.admins.length;
  }

  static async findOne(query) {
    if (isDbConnected()) {
      return await MongooseAdmin.findOne(query);
    }
    return memoryStore.admins.find((admin) => {
      if (query.username && admin.username !== query.username) return false;
      if (query.email && admin.email !== query.email) return false;
      if (query._id && admin._id.toString() !== query._id.toString()) return false;
      return true;
    }) || null;
  }

  static async findById(id) {
    if (isDbConnected()) {
      return await MongooseAdmin.findById(id);
    }
    return memoryStore.admins.find((admin) => admin._id.toString() === id.toString()) || null;
  }

  static async create(doc) {
    if (isDbConnected()) {
      return await MongooseAdmin.create(doc);
    }
    const newAdmin = {
      _id: doc._id || new mongoose.Types.ObjectId(),
      username: doc.username,
      email: doc.email,
      password: doc.password,
      createdAt: doc.createdAt || new Date(),
    };
    memoryStore.admins.push(newAdmin);
    return newAdmin;
  }
}

export default AdminModelAdapter;
