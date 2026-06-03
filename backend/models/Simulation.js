const mongoose = require('mongoose');

const SimulationSchema = new mongoose.Schema(
    {
        
        input_parameters: {
            trafficReduction: { type: Number, default: 0 },   
            industrialCut: { type: Number, default: 0 },   
            heatwaveLevel: { type: Number, default: 0 },   
        },

        
        baseline_data: {
            aqi: Number,
            traffic: Number,
            water_quality: Number,
            industry_emission: Number,
        },

        
        risk_score: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
        },

        
        confidence_interval: {
            lower: { type: Number },
            upper: { type: Number },
        },

        
        cascade_effects: {
            aqi_risk: Number,
            water_risk: Number,
            health_risk: Number,
            traffic_risk: Number,
        },

        
        time_to_impact: { type: Number },

        
        triggered_systems: [{ type: String }],

        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Simulation', SimulationSchema);