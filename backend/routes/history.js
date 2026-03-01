const express = require('express');
const router = express.Router();

const EnvironmentalData = require('../models/EnvironmentalData');
const { computeRisk } = require('../engine/cascadeEngine');

/**
 * GET /history
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns the full 7-day historical trend formatted for frontend charts.
 * Computes per-day risk scores from stored environmental data.
 *
 * Response:
 * {
 *   success: true,
 *   days: 7,
 *   trend_direction: "WORSENING" | "IMPROVING" | "STABLE",
 *   chart_data: {
 *     labels:             string[],   ← e.g. ["Feb 17", "Feb 18", ...]
 *     aqi:                number[],
 *     traffic:            number[],
 *     water_quality:      number[],
 *     industry_emission:  number[],
 *     risk_scores:        number[],
 *     crisis_levels:      string[]
 *   },
 *   summary: {
 *     peak_risk_day:    string,
 *     peak_risk_score:  number,
 *     avg_risk:         number,
 *     avg_aqi:          number,
 *     avg_water_quality:number
 *   }
 * }
 */
router.get('/', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.days) || 7;
        const heatwaveLevel = parseFloat(req.query.heatwaveLevel) || 0;
        const cityId = req.query.cityId;

        // Fetch historical data oldest → newest for specific city if provided
        let query = {};
        if (cityId) {
            query.cityId = cityId;
        }

        const records = await EnvironmentalData.find(query)
            .sort({ date: 1 })
            .limit(limit);

        if (!records.length) {
            return res.status(404).json({
                success: false,
                error: 'No historical data found. Please run `npm run seed` first.',
            });
        }

        const getCrisisLevel = (score) => {
            if (score < 0.30) return 'LOW';
            if (score < 0.55) return 'MODERATE';
            if (score < 0.75) return 'HIGH';
            return 'CRITICAL';
        };

        // Build per-day chart arrays
        const labels = [];
        const aqi = [];
        const traffic = [];
        const water_quality = [];
        const industry_emission = [];
        const risk_scores = [];
        const crisis_levels = [];
        const cascade_per_day = [];

        for (const rec of records) {
            const dateStr = new Date(rec.date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
            });
            const riskResult = computeRisk(rec, heatwaveLevel);

            labels.push(dateStr);
            aqi.push(rec.aqi);
            traffic.push(rec.traffic);
            water_quality.push(rec.water_quality);
            industry_emission.push(rec.industry_emission);
            risk_scores.push(riskResult.risk_score);
            crisis_levels.push(getCrisisLevel(riskResult.risk_score));
            cascade_per_day.push({
                date: dateStr,
                ...riskResult.cascade_effects,
                risk: riskResult.risk_score,
            });
        }

        // ── Summary stats ──────────────────────────────────────────────────────────
        const avgRisk = risk_scores.reduce((a, b) => a + b, 0) / risk_scores.length;
        const peakIdx = risk_scores.indexOf(Math.max(...risk_scores));
        const firstRisk = risk_scores[0];
        const lastRisk = risk_scores[risk_scores.length - 1];
        const delta = lastRisk - firstRisk;

        const trendDirection = Math.abs(delta) < 0.05
            ? 'STABLE'
            : delta > 0 ? 'WORSENING' : 'IMPROVING';

        res.json({
            success: true,
            days: records.length,
            trend_direction: trendDirection,
            risk_delta: parseFloat(delta.toFixed(4)),
            chart_data: {
                labels,
                aqi,
                traffic,
                water_quality,
                industry_emission,
                risk_scores,
                crisis_levels,
                cascade_per_day,
            },
            summary: {
                peak_risk_day: labels[peakIdx],
                peak_risk_score: risk_scores[peakIdx],
                avg_risk: parseFloat(avgRisk.toFixed(4)),
                avg_aqi: parseFloat((aqi.reduce((a, b) => a + b, 0) / aqi.length).toFixed(1)),
                avg_water_quality: parseFloat((water_quality.reduce((a, b) => a + b, 0) / water_quality.length).toFixed(1)),
            },
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
