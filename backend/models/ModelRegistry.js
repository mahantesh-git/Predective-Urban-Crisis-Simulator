const mongoose = require('mongoose');

const ModelRegistrySchema = new mongoose.Schema(
    {
        model_id: {
            type: String,
            required: true,
            unique: true,
            default: () => new mongoose.Types.ObjectId().toString(),
        },
        target_feature: {
            type: String,
            enum: ['AQI', 'WaterStress', 'HealthRisk', 'Traffic'],
            required: true,
        },
        model_type: {
            type: String,
            required: true, // e.g., 'XGBoost', 'Prophet', 'LSTM'
        },
        version: {
            type: String,
            required: true,
        },
        trained_at: {
            type: Date,
            required: true,
        },
        training_size: {
            type: Number,
            required: true,
        },
        mae_score: {
            type: Number,
        },
        rmse_score: {
            type: Number,
        },
        f1_score: {
            type: Number, // Applicable for classification models
        },
        is_active: {
            type: Boolean,
            default: false,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('ModelRegistry', ModelRegistrySchema);
