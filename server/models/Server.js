import mongoose from 'mongoose';

const serverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Server name is required'],
      trim: true,
      maxlength: [100, 'Server name cannot exceed 100 characters'],
    },
    url: {
      type: String,
      required: [true, 'Health-check URL is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    currentState: {
      type: String,
      enum: ['ACTIVE', 'SLOW', 'DISCONNECTED', 'RECOVERING'],
      default: 'ACTIVE',
    },
    responseThreshold: {
      type: Number,
      default: 500, // milliseconds
      min: [50, 'Threshold must be at least 50ms'],
      max: [30000, 'Threshold cannot exceed 30000ms'],
    },
    monitoringInterval: {
      type: Number,
      default: 10, // seconds
      min: [2, 'Interval must be at least 2 seconds'],
      max: [3600, 'Interval cannot exceed 3600 seconds'],
    },
    enabled: {
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
    lastCheckedAt: {
      type: Date,
      default: null,
    },
    lastResponseTime: {
      type: Number,
      default: 0,
    },
    lastStatusCode: {
      type: Number,
      default: null,
    },
    lastErrorMessage: {
      type: String,
      default: '',
    },
    recoveryThreshold: {
      type: Number,
      default: 2, // 2 consecutive successful checks to transition from RECOVERING to ACTIVE
    },
    failureThreshold: {
      type: Number,
      default: 2, // 2 consecutive failures to transition to DISCONNECTED
    },
  },
  {
    timestamps: true,
  }
);

serverSchema.index({ currentState: 1 });
serverSchema.index({ enabled: 1 });

const Server = mongoose.model('Server', serverSchema);
export default Server;
