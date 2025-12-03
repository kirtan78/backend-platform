'use strict';

const { mongoose } = require('@backend-platform/db');

const metricSnapshotSchema = new mongoose.Schema({
  orgId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  dau: { type: Number, default: 0 },
  eventCounts: { type: Map, of: Number, default: {} },
  totalEvents: { type: Number, default: 0 },
  computedAt: { type: Date, default: Date.now },
}, {
  collection: 'metric_snapshots',
});

metricSnapshotSchema.index({ orgId: 1, date: -1 }, { unique: true });

const MetricSnapshot = mongoose.model('MetricSnapshot', metricSnapshotSchema);
module.exports = MetricSnapshot;
