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
        const limit = parseInt(req.query.days) || 7 ;
        const heatwaveLevel = parseFloat(req.query.heatwaveLevel) || 0;
        const cityId = req.query.cityId;

        // Fallback: if no data for this city, use bengaluru as baseline
        let query = {};
        if (cityId) query.cityId = cityId;

        // Use aggregation to group by day and get the latest reading per day
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const pipeline = [
            { $match: query },
            {
                $group: {
                    _id: {
                        cityId: "$cityId",
                        year: { $year: "$date" },
                        month: { $month: "$date" },
                        day: { $dayOfMonth: "$date" }
                    },
                    latestRecord: { $last: "$$ROOT" },
                    date: { $first: "$date" }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
            { $limit: limit },
            { $replaceRoot: { newRoot: "$latestRecord" } }
        ];

        let records = await EnvironmentalData.aggregate(pipeline);

        if (!records.length && cityId && cityId !== 'bengaluru') {
            pipeline[0].$match = { cityId: 'bengaluru' };
            records = await EnvironmentalData.aggregate(pipeline);
        }

        records.sort((a, b) => new Date(b.date) - new Date(a.date));

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

        for (const rec of records) {
            const dateStr = new Date(rec.date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
            });
            const riskResult = computeRisk(rec, heatwaveLevel);

            labels.push(dateStr);
            aqi.push(Math.max(0, rec.aqi));
            traffic.push(Math.max(0, rec.traffic));
            water_quality.push(Math.max(0, rec.water_quality));
            industry_emission.push(Math.max(0, rec.industry_emission));
            risk_scores.push(Math.max(0, riskResult.risk_score));
        }

        // ── Trend direction ────────────────────────────────────────────────────────
        const firstRisk = risk_scores[0];
        const lastRisk = risk_scores[risk_scores.length - 1];
        const delta = lastRisk - firstRisk;

        const trendDirection = Math.abs(delta) < 0.05
            ? 'STABLE'
            : delta > 0 ? 'WORSENING' : 'IMPROVING';

        res.json({
            success: true,
            trend_direction: trendDirection,
            chart_data: {
                labels,
                aqi,
                traffic,
                water_quality,
                industry_emission,
                risk_scores,
            },
            summary: {
                avg_aqi: parseFloat((aqi.reduce((a, b) => a + b, 0) / aqi.length).toFixed(1)),
                avg_water_quality: parseFloat((water_quality.reduce((a, b) => a + b, 0) / water_quality.length).toFixed(1)),
            },
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
