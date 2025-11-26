'use strict';

const { mongoose } = require('@backend-platform/db');

const notificationSchema = new mongoose.Schema({
  orgId: { type: String, required: true, index: true },
  userId: { type: String },
  type: { type: String, required: true, enum: ['email', 'in_app', 'webhook'] },
  eventType: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false },
  deliveredAt: { type: Date },
}, {
  timestamps: true,
  collection: 'notifications',
});

notificationSchema.index({ orgId: 1, userId: 1 });
notificationSchema.index({ orgId: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
