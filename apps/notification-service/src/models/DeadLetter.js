'use strict';

const { mongoose } = require('@backend-platform/db');

const deadLetterSchema = new mongoose.Schema({
  originalJobId: { type: String, required: true },
  jobType: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  errorHistory: [{
    attempt: Number,
    error: String,
    failedAt: Date,
  }],
  reason: { type: String, required: true },
}, {
  timestamps: true,
  collection: 'dead_letters',
});

deadLetterSchema.index({ jobType: 1 });
deadLetterSchema.index({ createdAt: -1 });

const DeadLetter = mongoose.model('DeadLetter', deadLetterSchema);
module.exports = DeadLetter;
