const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema(
    {
        zone_id: {
            type: String,
            required: true,
            unique: true,
            default: () => new mongoose.Types.ObjectId().toString(),
        },
        name: {
            type: String,
            required: true,
        },
        pop_density: {
            type: Number,
            required: true,
            min: 0,
            max: 1, // Normalized 0-1
        },
        hospital_cap_inv: {
            type: Number,
            required: true,
            min: 0,
            max: 1, // Normalized 0-1
        },
        infrastructure_stress: {
            type: Number,
            required: true,
            min: 0,
            max: 1, // Normalized 0-1
        },
        socioeconomic_sensitivity: {
            type: Number,
            required: true,
            min: 0,
            max: 1, // Normalized 0-1
        },
        historical_crises: {
            type: Number,
            required: true,
            min: 0,
            max: 1, // Normalized 0-1 (count scaled out of max)
        },
        vulnerability_score: {
            type: Number, // Computed metric
            min: 0,
            max: 1,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Zone', ZoneSchema);
