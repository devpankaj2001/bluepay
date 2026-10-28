const mongoose = require('mongoose');

const apiRequestMetricSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, index: true },
    method: { type: String, required: true },
    statusCode: { type: Number, required: true, index: true },
    success: { type: Boolean, required: true, index: true },
    durationMs: { type: Number, min: 0, required: true },

    // Added for the merchant-facing Activity Logs "API Activity" view
    // (existing admin aggregate reports below only ever read the fields
    // above, so these being optional/new is fully backward-compatible).
    environment: { type: String, enum: ['test', 'live', null], default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: '' },
    requestId: { type: String, default: null },
}, { timestamps: true });

apiRequestMetricSchema.index({ createdAt: -1, endpoint: 1 });
apiRequestMetricSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ApiRequestMetric', apiRequestMetricSchema);