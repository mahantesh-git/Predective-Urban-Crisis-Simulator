const express = require('express');
const router = express.Router();

const EnvironmentalData = require('../models/EnvironmentalData');
const { computeRisk } = require('../engine/cascadeEngine');
const { computeZoneRisks, generateZoneForecast } = require('../engine/zoneEngine');

/**
 * GET /zones
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns per-zone affected area forecast based on current environmental data.
 * Each zone shows its own risk score, alert level, primary threat, and
 * whether evacuation-level action is recommended.
 *
 * Query params:
 *   heatwaveLevel : 0–5  (optional, default 0)
 *   forecast      : true (optional) – include 7-day zone forecast
 *
 * Response:
 * {
 *   success: true,
 *   global_risk: number,
 *   crisis_level: string,
 *   total_zones: 5,
 *   affected_zones: number,
 *   zones: [ { id, name, type, risk_score, alert_level, primary_threat, ... } ],
 *   zone_forecast: [ { zone_id, zone_name, forecast: [...7 days] } ]  (if ?forecast=true)
 * }
 */
router.get('/', async (req, res, next) => {
    try {
        const cityId = req.query.cityId || 'bengaluru';
        const heatwaveLevel = parseFloat(req.query.heatwaveLevel) || 0;
        const includeForecast = req.query.forecast === 'true';

        // Get latest environmental reading for this city
        const latest = await EnvironmentalData.findOne({ cityId }).sort({ date: -1 });

        if (!latest) {
            return res.status(404).json({
                success: false,
                error: 'No environmental data found. Please run `npm run seed` first.',
            });
        }

        // Run global cascade
        const cascadeResult = computeRisk(latest, heatwaveLevel);
        const globalRisk = cascadeResult.risk_score;
        const cascadeEffects = cascadeResult.cascade_effects;

        // Compute per-zone risks
        const zones = computeZoneRisks(cascadeEffects, globalRisk, cityId);

        // Sort by risk (highest first) for prioritized response
        zones.sort((a, b) => b.risk_score - a.risk_score);

        const affectedZones = zones.filter((z) => z.is_affected);
        const evacuationZones = zones.filter((z) => z.evacuation_priority);

        const getCrisisLevel = (score) => {
            if (score < 0.30) return 'LOW';
            if (score < 0.55) return 'MODERATE';
            if (score < 0.75) return 'HIGH';
            return 'CRITICAL';
        };

        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            global_risk: globalRisk,
            crisis_level: getCrisisLevel(globalRisk),
            global_cascade: cascadeEffects,
            total_zones: zones.length,
            affected_zones: affectedZones.length,
            evacuation_priority_zones: evacuationZones.map((z) => z.name),
            zones,
        };

        // Include 7-day zone forecast if requested
        if (includeForecast) {
            const historicalData = await EnvironmentalData.find({ cityId }).sort({ date: 1 });
            response.zone_forecast = generateZoneForecast(zones, historicalData);
        }

        res.json(response);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /zones/:id
 * Returns detailed info for a single zone.
 */
router.get('/:id', async (req, res, next) => {
    try {
        const heatwaveLevel = parseFloat(req.query.heatwaveLevel) || 0;
        const { getCityZones } = require('../engine/zoneEngine');
        const cityId = req.query.cityId || 'bengaluru';
        const cityZones = getCityZones(cityId);

        const zoneDef = cityZones.find((z) => z.id === req.params.id);
        if (!zoneDef) {
            return res.status(404).json({
                success: false,
                error: `Zone '${req.params.id}' not found.`,
                available_zones: cityZones.map((z) => z.id),
            });
        }
        const latest = await EnvironmentalData.findOne({ cityId }).sort({ date: -1 });
        if (!latest) {
            return res.status(404).json({ success: false, error: 'No environmental data found.' });
        }

        const cascadeResult = computeRisk(latest, heatwaveLevel);
        const zones = computeZoneRisks(cascadeResult.cascade_effects, cascadeResult.risk_score, cityId);
        const zoneData = zones.find((z) => z.id === req.params.id);

        // 7-day forecast always included for single zone
        const historicalData = await EnvironmentalData.find({ cityId }).sort({ date: 1 });
        const { generateZoneForecast } = require('../engine/zoneEngine');
        const forecast = generateZoneForecast([zoneData], historicalData, cityId);

        res.json({
            success: true,
            global_risk: cascadeResult.risk_score,
            zone: zoneData,
            forecast: forecast[0]?.forecast || [],
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
