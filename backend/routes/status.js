const express = require('express');
const router = express.Router();

const EnvironmentalData = require('../models/EnvironmentalData');
const { computeRisk } = require('../engine/cascadeEngine');

router.get('/', async (req, res, next) => {
    try {
        const cityId = req.query.cityId || 'bengaluru';

        let latest = await EnvironmentalData.findOne({ cityId }).sort({ date: -1 });
        if (!latest) {
            latest = await EnvironmentalData.findOne({ cityId: 'bengaluru' }).sort({ date: -1 });
        }

        if (!latest) {
            return res.status(404).json({
                success: false,
                error: 'No environmental data found. Please run `npm run seed` first.',
            });
        }

        const heatwaveLevel = parseFloat(req.query.heatwaveLevel) || 0;
        const result = computeRisk(latest, heatwaveLevel);

        const getCrisisLevel = (score) => {
            if (score < 0.30) return 'LOW';
            if (score < 0.55) return 'MODERATE';
            if (score < 0.75) return 'HIGH';
            return 'CRITICAL';
        };

        res.json({
            success: true,
            latest_data: {
                aqi: Math.max(0, latest.aqi),
                traffic: Math.max(0, latest.traffic),
                water_quality: Math.max(0, latest.water_quality),
                industry_emission: Math.max(0, latest.industry_emission),
            },
            risk_score: result.risk_score,
            cascade_effects: result.cascade_effects,
            triggered_systems: result.triggered_systems,
            crisis_level: getCrisisLevel(result.risk_score),
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
