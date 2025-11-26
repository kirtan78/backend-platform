'use strict';

const { mongoose } = require('@backend-platform/db');

const jobSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['send_email', 'send_in_app', 'send_webhook'] },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'dead'],
    default: 'pending',
  },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  lastError: { type: String },
  processedAt: { type: Date },
  completedAt: { type: Date },
  bullmqJobId: { type: String },
}, {
  timestamps: true,
  collection: 'jobs',
});

jobSchema.index({ status: 1 });
jobSchema.index({ type: 1, status: 1 });
jobSchema.index({ bullmqJobId: 1 });

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;
