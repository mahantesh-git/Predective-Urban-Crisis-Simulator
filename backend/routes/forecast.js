const express = require('express');
const router = express.Router();

const EnvironmentalData = require('../models/EnvironmentalData');
const { generateForecast } = require('../engine/forecastEngine');

/**
 * GET /forecast
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns a 7-day AQI + water stress forecast with confidence bands.
 *
 * In demo mode (ML_ENABLED=false), uses deterministic trend extrapolation.
 * In production mode (ML_ENABLED=true), delegates to the ML microservice.
 *
 * Response:
 * {
 *   success: true,
 *   forecast_days: 7,
 *   based_on_days: number,
 *   mode: "mock" | "ml_service",
 *   aqi_forecast: number[7],
 *   water_stress_forecast: number[7],
 *   confidence_bands: {
 *     aqi:   { lower: number[7], upper: number[7] },
 *     water: { lower: number[7], upper: number[7] }
 *   },
 *   labels: string[7],
 *   crisis_probability?: number,       // ML only
 *   crisis_status?: string,            // ML only
 *   uncertainty?: object,              // ML only
 * }
 */
router.get('/', async (req, res, next) => {
    try {
        // Allow frontend to request a custom number of days via ?days=N
        const defaultDays = parseInt(process.env.FORECAST_DAYS || '7', 10);
        const requestedDays = parseInt(req.query.days || defaultDays, 10);
        const forecastDays = Math.min(Math.max(requestedDays, 7), 365); // clamp 7–365

        // Fetch all available historical data sorted oldest → newest
        const historicalData = await EnvironmentalData.find().sort({ date: 1 });

        if (!historicalData.length) {
            return res.status(404).json({
                success: false,
                error: 'No environmental data found. Please run `npm run seed` first.',
            });
        }

        const forecast = await generateForecast(historicalData, forecastDays);

        // Generate human-readable day labels starting from tomorrow
        const today = new Date();
        const labels = Array.from({ length: forecastDays }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() + i + 1);
            return `Day ${i + 1} (${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
        });

        const response = {
            success: true,
            forecast_days: forecastDays,
            based_on_days: historicalData.length,
            mode: forecast.mode,
            note: forecast.note,
            labels,
            aqi_forecast: forecast.aqi_forecast,
            water_stress_forecast: forecast.water_stress_forecast,
            confidence_bands: forecast.confidence_bands,
        };

        // Include ML-specific fields when available
        if (forecast.crisis_probability !== undefined) {
            response.crisis_probability = forecast.crisis_probability;
            response.crisis_status = forecast.crisis_status;
            response.time_to_impact_days = forecast.time_to_impact_days;
            response.affected_zones = forecast.affected_zones;
            response.recommended_policies = forecast.recommended_policies;
        }
        if (forecast.uncertainty) {
            response.uncertainty = forecast.uncertainty;
        }
        if (forecast.ml_metadata) {
            response.ml_metadata = forecast.ml_metadata;
        }

        res.json(response);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /forecast/scenario
 * Generates an ML forecast modified by a policy scenario.
 */
router.post('/scenario', async (req, res, next) => {
    try {
        const { scenario_traffic_delta = 0, scenario_industry_delta = 0, days_ahead = 7 } = req.body;

        // Fetch recent historical data to seed the ML model
        const history = await EnvironmentalData.find().sort({ date: -1 }).limit(14).lean();
        history.reverse(); // oldest to newest

        const history_aqi = history.map(h => h.aqi);
        const history_water = history.map(h => h.water_quality);

        if (!process.env.ML_URL) {
            process.env.ML_URL = 'http://localhost:8001';
        }

        // Forward to python microservice
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
            aqi_forecast: mlData.forecasts.aqi,
            water_stress_forecast: mlData.forecasts.water_stress,
            confidence_bands: mlData.confidence_intervals,
            explainable_ai: mlData.explainable_ai
        });

    } catch (err) {
        console.error('Failed to query ML scenario endpoint:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
