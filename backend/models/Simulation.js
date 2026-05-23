const mongoose = require('mongoose');

/**
 * Simulation – stores each simulation run result.
 * Captures inputs, outputs, cascade breakdown and confidence interval.
 */
const SimulationSchema = new mongoose.Schema(
    {
        // Raw policy parameters supplied by the caller
        input_parameters: {
            trafficReduction: { type: Number, default: 0 },   // % reduction in traffic
            industrialCut: { type: Number, default: 0 },   // % cut in industrial emissions
            heatwaveLevel: { type: Number, default: 0 },   // severity 0–5
        },

        // Baseline environmental snapshot used for this simulation
        baseline_data: {
            aqi: Number,
            traffic: Number,
            water_quality: Number,
            industry_emission: Number,
        },

        // Core simulation output
        risk_score: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
        },

        // 95% confidence interval around risk_score
        confidence_interval: {
            lower: { type: Number },
            upper: { type: Number },
        },

        // Per-system cascade breakdown
        cascade_effects: {
            aqi_risk: Number,
            water_risk: Number,
            health_risk: Number,
            traffic_risk: Number,
        },

        // Estimated days until crisis threshold (risk > 0.75)
        time_to_impact: { type: Number },

        // List of systems currently in alert state
        triggered_systems: [{ type: String }],

        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Simulation', SimulationSchema);