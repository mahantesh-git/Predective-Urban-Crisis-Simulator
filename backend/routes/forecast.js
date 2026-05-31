const express = require('express');
const router = express.Router();

const EnvironmentalData = require('../models/EnvironmentalData');
const { generateForecast } = require('../engine/forecastEngine');

router.get('/', async (req, res, next) => {
    try {
        const cityId = req.query.cityId || 'bengaluru';

        const defaultDays = parseInt(process.env.FORECAST_DAYS || '7', 10);
        const requestedDays = parseInt(req.query.days || defaultDays, 10);
        const forecastDays = Math.min(Math.max(requestedDays, 1), 365); 

        const historicalData = await EnvironmentalData.find({ cityId }).sort({ date: 1 });

        if (!historicalData.length) {
            return res.status(404).json({
                success: false,
                error: `No environmental data found for city '${cityId}'. Please run \`npm run seed\` first.`,
            });
        }

        const forecast = await generateForecast(historicalData, forecastDays);

        const today = new Date();
        const labels = Array.from({ length: forecastDays }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() + i + 1);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const response = {
            success: true,
            mode: forecast.mode,
            labels,
            aqi_forecast: forecast.aqi_forecast,
            water_stress_forecast: forecast.water_stress_forecast,
            confidence_bands: forecast.confidence_bands,
        };

        if (forecast.crisis_probability !== undefined) {
            response.crisis_probability = forecast.crisis_probability;
            response.crisis_status = forecast.crisis_status;
            response.time_to_impact_days = forecast.time_to_impact_days;
            response.affected_zones = forecast.affected_zones;
            response.recommended_policies = forecast.recommended_policies;
        }

        if (forecast.explainable_ai !== undefined) {
            response.explainable_ai = forecast.explainable_ai;
        }

        res.json(response);
    } catch (err) {
        next(err);
    }
});

router.post('/scenario', async (req, res, next) => {
    try {
        const { scenario_traffic_delta = 0, scenario_industry_delta = 0, days_ahead = 7 } = req.body;

        const history = await EnvironmentalData.find().sort({ date: -1 }).limit(14).lean();
        history.reverse(); 

        const history_aqi = history.map(h => h.aqi);
        const history_water = history.map(h => h.water_quality);

        if (!process.env.ML_URL) {
            process.env.ML_URL = 'http://localhost:8001';
        }

        const fetch = require('node-fetch');
        const mlResponse = await fetch(`${process.env.ML_URL}/forecast/multi-horizon/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                history_aqi,
                history_water,
                horizon_days: days_ahead,
                scenario_traffic_delta,
                scenario_industry_delta
            })
        });

        if (!mlResponse.ok) {
            throw new Error(`ML Service responded with ${mlResponse.status}`);
        }

        const mlData = await mlResponse.json();

        res.json({
            success: true,
            mode: mlData.model_strategy_used,
            labels: mlData.labels,
            aqi_forecast: mlData.forecasts.aqi.map(v => Math.max(0, v + (scenario_traffic_delta * 0.4))),
            water_stress_forecast: mlData.forecasts.water_stress.map(v => Math.max(0, v + (scenario_industry_delta * 0.2))),
            confidence_bands: mlData.confidence_intervals,
            explainable_ai: mlData.explainable_ai
        });

    } catch (err) {
        console.error('Failed to query ML scenario endpoint:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
