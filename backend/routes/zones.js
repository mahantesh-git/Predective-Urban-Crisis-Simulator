const express = require('express');
const router = express.Router();

const EnvironmentalData = require('../models/EnvironmentalData');
const { computeRisk } = require('../engine/cascadeEngine');
const { computeZoneRisks, generateZoneForecast, getCityZones } = require('../engine/zoneEngine');

router.get('/', async (req, res, next) => {
    try {
        const cityId = req.query.cityId || 'bengaluru';
        const heatwaveLevel = parseFloat(req.query.heatwaveLevel) || 0;
        const includeForecast = req.query.forecast === 'true';

        let latest = await EnvironmentalData.findOne({ cityId }).sort({ date: -1 });
        if (!latest) {
            latest = await EnvironmentalData.findOne({ cityId: 'bengaluru' }).sort({ date: -1 });
        }

        if (!latest) {
            return res.status(404).json({
                success: false,
                error: 'No environmental data found.',
            });
        }

        const cascadeResult = computeRisk(latest, heatwaveLevel);
        const cascadeEffects = cascadeResult.cascade_effects;
        const zones = computeZoneRisks(cascadeEffects, cityId);
        zones.sort((a, b) => b.risk_score - a.risk_score);

        const response = {
            success: true,
            zones,
        };

        if (includeForecast) {
            const historicalData = await EnvironmentalData.find({ cityId }).sort({ date: 1 });
            response.zone_forecast = generateZoneForecast(zones, historicalData);
        }

        res.json(response);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const heatwaveLevel = parseFloat(req.query.heatwaveLevel) || 0;
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
        const zones = computeZoneRisks(cascadeResult.cascade_effects, cityId);
        const zoneData = zones.find((z) => z.id === req.params.id);
        const historicalData = await EnvironmentalData.find({ cityId }).sort({ date: 1 });
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
