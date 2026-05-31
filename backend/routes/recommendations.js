const express = require('express');
const router = express.Router();

const EnvironmentalData = require('../models/EnvironmentalData');
const { computeRisk } = require('../engine/cascadeEngine');
const { generateRecommendations } = require('../engine/recommendationEngine');

router.get('/', async (req, res, next) => {
    try {
        const cityId = req.query.cityId || 'bengaluru';
        const heatwaveLevel = parseFloat(req.query.heatwaveLevel) || 0;
        const limit = parseInt(req.query.limit) || null;

        const latest = await EnvironmentalData.findOne({ cityId }).sort({ date: -1 });

        if (!latest) {
            return res.status(404).json({
                success: false,
                error: 'No environmental data found. Please run `npm run seed` first.',
            });
        }

        const baselineResult = computeRisk(latest, heatwaveLevel);
        const baselineRisk = Math.min(1.0, baselineResult.risk_score);

        let recommendations = generateRecommendations(latest, baselineRisk, heatwaveLevel);

        if (limit) {
            recommendations = recommendations.slice(0, limit);
        }

        const getCrisisLevel = (score) => {
            if (score < 0.30) return 'LOW';
            if (score < 0.55) return 'MODERATE';
            if (score < 0.75) return 'HIGH';
            return 'CRITICAL';
        };

        res.json({
            success: true,
            baseline_risk: baselineRisk,
            crisis_level: getCrisisLevel(baselineRisk),
            triggered_systems: baselineResult.triggered_systems,
            total_interventions: recommendations.length,
            recommendations,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
