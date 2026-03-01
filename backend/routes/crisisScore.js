const express = require('express');
const router = express.Router();
const EnvironmentalData = require('../models/EnvironmentalData');
const { computeCrisisScore } = require('../engine/crisisScoreEngine');
const { estimateImpact } = require('../engine/economicEngine');
const { computeRisk } = require('../engine/cascadeEngine');

/**
 * @route   GET /api/crisis-score
 * @desc    Get the current city-wide crisis score and economic impact
 * @access  Public
 */
router.get('/', async (req, res, next) => {
    try {
        // 1. Get latest record
        const latest = await EnvironmentalData.findOne().sort({ date: -1 });

        if (!latest) {
            return res.status(404).json({ success: false, message: 'No environmental data found' });
        }

        // 2. Compute risks if they aren't stored or for real-time fresh calculation
        // However, we'll try to use the stored ones if they exist, otherwise compute on the fly.
        const cascade = computeRisk(latest);
        const crisisInfo = computeCrisisScore(cascade.cascade_effects);
        const economic = estimateImpact({
            aqi_risk: cascade.cascade_effects.aqi_risk,
            health_risk: cascade.cascade_effects.health_risk,
            traffic_risk: cascade.cascade_effects.traffic_risk,
            industrial_cut: 0 // Baseline has no policy cut
        });

        res.json({
            success: true,
            timestamp: latest.date,
            crisis_score: crisisInfo.score,
            risk_category: crisisInfo.category,
            weighted_contributions: crisisInfo.weighted_contributions,
            economic_impact: economic,
            baseline_metrics: {
                aqi: latest.aqi,
                traffic: latest.traffic,
                water_quality: latest.water_quality
            }
        });

    } catch (err) {
        console.error('Error fetching crisis score:', err.message);
        next(err);
    }
});

module.exports = router;
