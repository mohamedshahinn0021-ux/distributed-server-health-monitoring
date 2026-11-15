import mongoose from 'mongoose';

const monitoringHistorySchema = new mongoose.Schema(
  {
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Server',
      required: true,
      index: true,
    },
    responseTime: {
      type: Number,
      required: true,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    isConnected: {
      type: Boolean,
      required: true,
    },
    state: {
      type: String,
      enum: ['ACTIVE', 'SLOW', 'DISCONNECTED', 'RECOVERING'],
      required: true,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index for fast time-series queries per server
monitoringHistorySchema.index({ serverId: 1, timestamp: -1 });

const MonitoringHistory = mongoose.model('MonitoringHistory', monitoringHistorySchema);
export default MonitoringHistory;
