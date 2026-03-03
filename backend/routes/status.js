const express = require('express');
const router = express.Router();

const EnvironmentalData = require('../models/EnvironmentalData');
const { computeRisk } = require('../engine/cascadeEngine');

/**
 * GET /status
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns the current city crisis metrics based on the latest environmental
 * data snapshot in the database.
 *
 * Response:
 * {
 *   success: true,
 *   timestamp: ISO string,
 *   latest_data: { date, aqi, traffic, water_quality, industry_emission },
 *   risk_score: 0–1,
 *   confidence_interval: { lower, upper },
 *   cascade_effects: { aqi_risk, water_risk, health_risk, traffic_risk },
 *   triggered_systems: string[],
 *   time_to_impact: number | null,
 *   crisis_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
 * }
 */
router.get('/', async (req, res, next) => {
    try {
        // Accept cityId from query param, default to 'bengaluru'
        const cityId = req.query.cityId || 'bengaluru';

        // Fetch the most recent environmental reading for this city
        const latest = await EnvironmentalData.findOne({ cityId }).sort({ date: -1 });

        if (!latest) {
            return res.status(404).json({
                success: false,
                error: 'No environmental data found. Please run `npm run seed` first.',
            });
        }

        // Run cascade with default heatwave level (can be extended via query param)
        const heatwaveLevel = parseFloat(req.query.heatwaveLevel) || 0;
        const result = computeRisk(latest, heatwaveLevel);

        // Map risk score to a human-readable crisis level
        const getCrisisLevel = (score) => {
            if (score < 0.30) return 'LOW';
            if (score < 0.55) return 'MODERATE';
            if (score < 0.75) return 'HIGH';
            return 'CRITICAL';
        };

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            latest_data: {
                date: latest.date,
                aqi: latest.aqi,
                traffic: latest.traffic,
                water_quality: latest.water_quality,
                industry_emission: latest.industry_emission,
                temperature: latest.temperature || 30,
                drought_index: latest.drought_index || 0,
            },
            risk_score: result.risk_score,
            confidence_interval: result.confidence_interval,
            cascade_effects: result.cascade_effects,
            triggered_systems: result.triggered_systems,
            time_to_impact: result.time_to_impact,
            crisis_threshold: result.crisis_threshold,
            crisis_level: getCrisisLevel(result.risk_score),
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
