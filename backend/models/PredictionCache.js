const mongoose = require('mongoose');

const PredictionCacheSchema = new mongoose.Schema(
    {
        cache_id: {
            type: String,
            required: true,
            unique: true,
            default: () => new mongoose.Types.ObjectId().toString(),
        },
        zone_id: {
            type: String,
            required: true,
            ref: 'Zone',
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        predicted_value: {
            type: Number,
            required: true,
        },
        confidence_interval_low: {
            type: Number,
        },
        confidence_interval_high: {
            type: Number,
        },
        model_confidence_pct: {
            type: Number,
            min: 0,
            max: 100,
        },
        shap_contributions: {
            type: Map,
            of: Number, // Stores e.g. {"Traffic": 15.2, "Wind": -8.1}
        },
        expires_at: {
            type: Date,
            required: true, // Used for MongoDB TTL index
        }
    },
    { timestamps: true }
);

// TTL Index: Document expires when Date.now() > expires_at
PredictionCacheSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PredictionCache', PredictionCacheSchema);
