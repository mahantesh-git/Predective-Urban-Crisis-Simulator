const express = require('express');
const router = express.Router();

const EnvironmentalData = require('../models/EnvironmentalData');
const { computeRisk } = require('../engine/cascadeEngine');

router.get('/', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.days) || 7 ;
        const heatwaveLevel = parseFloat(req.query.heatwaveLevel) || 0;
        const cityId = req.query.cityId;

        let query = {};
        if (cityId) query.cityId = cityId;

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

        const labels = [];
        const aqi = [];
        const traffic = [];
        const water_quality = [];
        const industry_emission = [];
        const risk_scores = [];

        const UTC_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        for (const rec of records) {
            const d = new Date(rec.date);
            const dateStr = `${UTC_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
            const riskResult = computeRisk(rec, heatwaveLevel);

            labels.push(dateStr);
            aqi.push(Math.max(0, rec.aqi));
            traffic.push(Math.max(0, rec.traffic));
            water_quality.push(Math.max(0, rec.water_quality));
            industry_emission.push(Math.max(0, rec.industry_emission));
            risk_scores.push(Math.max(0, riskResult.risk_score));
        }

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
