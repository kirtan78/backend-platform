'use strict';

const { mongoose } = require('@backend-platform/db');

const rawEventSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  orgId: { type: String, required: true, index: true },
  actorId: { type: String },
  projectId: { type: String },
  issueId: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  receivedAt: { type: Date, default: Date.now, index: true },
}, {
  timestamps: false,
  collection: 'raw_events',
});

rawEventSchema.index({ orgId: 1, type: 1 });
rawEventSchema.index({ orgId: 1, receivedAt: -1 });

const RawEvent = mongoose.model('RawEvent', rawEventSchema);
module.exports = RawEvent;
