import mongoose from 'mongoose';

const stateTransitionSchema = new mongoose.Schema(
  {
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Server',
      required: true,
      index: true,
    },
    serverName: {
      type: String,
      required: true,
    },
    previousState: {
      type: String,
      enum: ['ACTIVE', 'SLOW', 'DISCONNECTED', 'RECOVERING', 'INITIAL'],
      required: true,
    },
    newState: {
      type: String,
      enum: ['ACTIVE', 'SLOW', 'DISCONNECTED', 'RECOVERING'],
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
    },
    responseTime: {
      type: Number,
      default: 0,
    },
    statusCode: {
      type: Number,
      default: null,
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

stateTransitionSchema.index({ serverId: 1, timestamp: -1 });

const StateTransition = mongoose.model('StateTransition', stateTransitionSchema);
export default StateTransition;
