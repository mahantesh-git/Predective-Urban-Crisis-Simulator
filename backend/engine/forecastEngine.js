const { predictAQI, predictWater, predictHealth, predictTraffic, predictForest } = require('../services/mlServiceClient');
const fs = require('fs');
const path = require('path');

const CITY_METADATA_PATH = path.join(__dirname, '../../datasets/city_metadata.json');

const getCityMetadata = (cityId) => {
    try {
        if (fs.existsSync(CITY_METADATA_PATH)) {
            const data = JSON.parse(fs.readFileSync(CITY_METADATA_PATH, 'utf8'));
            return data[cityId] || data['bengaluru'];
        }
    } catch (e) {
        console.error('Error loading city metadata:', e);
    }
    return null;
};

/**
 * Forecast Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages ML integration via an adapter pattern:
 *
 *   ML_ENABLED=false  →  mockForecast()    (7-day trend extrapolation, demo mode)
 *   ML_ENABLED=true   →  callMLService()   (real ML microservice with ARIMAX + crisis)
 *
 * Both paths return the SAME base response shape so the rest of the API
 * is ML-agnostic. When ML is active, extra fields are included:
 *   crisis_probability, crisis_status, uncertainty
 *
 * Base response shape:
 * {
 *   aqi_forecast:          number[7],
 *   water_stress_forecast: number[7],
 *   confidence_bands: {
 *     aqi:   { lower: number[7], upper: number[7] },
 *     water: { lower: number[7], upper: number[7] }
 *   },
 *   mode: "mock" | "ml_service",
 *   crisis_probability?: number,      // ML only
 *   crisis_status?: string,           // ML only
 *   uncertainty?: object,             // ML only
 * }
 */

const DEFAULT_FORECAST_DAYS = parseInt(process.env.FORECAST_DAYS || '7', 10);
const MARGIN = parseFloat(process.env.CONFIDENCE_MARGIN || '0.15');

/**
 * Transform the multi-model responses into the standard forecast shape acceptable by the frontend.
 * Stitches together Prophet time-series data with XGBoost Health labels to simulate the old API response.
 */
const transformNewMLResponse = (aqiResult, waterResult, healthResult, trafficResult, forestResult) => {
    const aqi_forecast = aqiResult.forecast.map(f => f.prediction);
    const aqi_lower = aqiResult.forecast.map(f => f.lower_bound);
    const aqi_upper = aqiResult.forecast.map(f => f.upper_bound);

    const water_forecast = waterResult.forecast.map(f => f.prediction);
    const water_lower = waterResult.forecast.map(f => f.lower_bound);
    const water_upper = waterResult.forecast.map(f => f.upper_bound);

    let prob = 0.2;
    // Health Signal
    if (healthResult?.risk_level === 'CRITICAL') prob += 0.4;
    else if (healthResult?.risk_level === 'HIGH') prob += 0.3;
    else if (healthResult?.risk_level === 'MODERATE') prob += 0.15;

    // Traffic Signal
    if (trafficResult?.traffic_status === 'CONGESTED') prob += 0.2;
    else if (trafficResult?.traffic_status === 'HEAVY') prob += 0.1;

    // Forest Signal (High loss increases probability of urban heat/flooding)
    if (forestResult?.predicted_forest_loss > 100) prob += 0.15;

    prob = Math.min(prob, 0.98);

    // Contest Required Outputs Generation
    const maxAqi = Math.max(...aqi_forecast);
    const maxWater = Math.max(...water_forecast);

    // Time-to-Impact Estimate (days until threshold breached)
    let timeToImpact = 'No immediate crisis detected';
    const criticalDayAqi = aqi_forecast.findIndex(val => val > 300);
    const criticalDayWater = water_forecast.findIndex(val => val > 80);

    if (criticalDayAqi !== -1 && criticalDayWater !== -1) {
        timeToImpact = `${Math.min(criticalDayAqi, criticalDayWater)} days (Dual Crisis)`;
    } else if (criticalDayAqi !== -1) {
        timeToImpact = `${criticalDayAqi} days (Severe Smog)`;
    } else if (criticalDayWater !== -1) {
        timeToImpact = `${criticalDayWater} days (Water Shortage)`;
    } else if (prob > 0.6) {
        timeToImpact = `Elevated risk within ${Math.floor(aqi_forecast.length / 3)} days`;
    }

    // Affected Zone Forecast (simulated spatial output based on risk)
    const allZones = ['Industrial Zone North', 'Downtown Core', 'Residential Ring East', 'Waterfront District', 'Tech Park South'];
    let affectedZones = [];
    if (maxAqi > 250) affectedZones.push('Industrial Area', 'Downtown Core');
    if (maxWater > 70) affectedZones.push('Residential District', 'Waterfront Zone');
    if (prob > 0.8) affectedZones.push('Transport Gateway');
    if (affectedZones.length === 0) affectedZones = ['Routine Monitoring Across All Zones'];

    // Recommended Policy Actions (Dynamic Rule-Based Engine)
    const policies = [];

    // AQI Based Triggers
    if (maxAqi > 350) {
        policies.push('Declare Public Health Emergency: Total Industrial Halt', 'Emergency Green-Zone Oxygen Hubs deployment');
    } else if (maxAqi > 200) {
        policies.push('Enact Stage 2 Vehicle Rationing', 'Halt non-essential construction');
    }

    // Water Based Triggers
    if (maxWater > 85) {
        policies.push('Category A Water Rationing (Essential services only)', 'Mandatory IoT leak-detection sweep');
    } else if (maxWater > 60) {
        policies.push('Divert emergency reservoir allocations');
    }

    // Health / Probability Based Triggers
    if (prob > 0.85) {
        policies.push('Pre-emptive hospital surge-capacity activation');
    }

    // Forest Loss Based Triggers
    if (forestResult?.predicted_forest_loss > 50) {
        policies.push('Implement Urban Green Corridor Taskforce', 'Restrict rapid land-conversion permits');
    }

    if (policies.length === 0) {
        policies.push('Maintain standard environmental protocols');
    }

    return {
        aqi_forecast,
        water_stress_forecast: water_forecast,
        confidence_bands: {
            aqi: { lower: aqi_lower, upper: aqi_upper },
            water: { lower: water_lower, upper: water_upper },
        },
        mode: 'ml_service',
        note: 'Powered by 5 dedicated modular ML models (Prophet/XGBoost).',
        crisis_probability: parseFloat(prob.toFixed(2)),
        crisis_status: healthResult?.risk_level || 'UNKNOWN',
        time_to_impact_days: timeToImpact,
        affected_zones: [...new Set(affectedZones)],
        recommended_policies: policies,
        external_signals: {
            traffic: trafficResult?.traffic_status,
            forest_loss_ha: forestResult?.predicted_forest_loss
        }
    };
};

/**
 * Simple deterministic water stress forecast (used as fallback).
 */
const mockWaterForecast = (historicalData, days = DEFAULT_FORECAST_DAYS) => {
    const waterSeries = historicalData.map((d) => 100 - d.water_quality);
    const n = waterSeries.length;
    const slope = n >= 2 ? (waterSeries[n - 1] - waterSeries[0]) / (n - 1) : 0;
    const lastWater = waterSeries[n - 1] || 50;
    const noise = (i, scale) => Math.sin(i * 1.7 + 0.5) * scale;

    const forecast = [];
    const lower = [];
    const upper = [];

    for (let i = 1; i <= days; i++) {
        const pred = Math.min(Math.max(lastWater + slope * i + noise(i, 3), 0), 100);
        const margin = pred * MARGIN * (1 + i * 0.05);
        forecast.push(parseFloat(pred.toFixed(2)));
        lower.push(parseFloat(Math.max(pred - margin, 0).toFixed(2)));
        upper.push(parseFloat(Math.min(pred + margin, 100).toFixed(2)));
    }

    return { forecast, bands: { lower, upper } };
};

/**
 * Gaussian-noise mock forecast (full demo mode — no ML).
 */
const mockForecast = (historicalData, days = DEFAULT_FORECAST_DAYS) => {
    const n = historicalData.length;

    const computeSlope = (series) => {
        if (series.length < 2) return 0;
        return (series[series.length - 1] - series[0]) / (series.length - 1);
    };

    const noise = (i, scale) => Math.sin(i * 1.7 + 0.5) * scale;

    const aqiSeries = historicalData.map((d) => d.aqi);
    const waterSeries = historicalData.map((d) => 100 - d.water_quality);

    const aqiSlope = computeSlope(aqiSeries);
    const waterSlope = computeSlope(waterSeries);
    const lastAqi = aqiSeries[n - 1];
    const lastWater = waterSeries[n - 1];

    const aqi_forecast = [];
    const water_stress_forecast = [];
    const aqi_lower = [], aqi_upper = [];
    const water_lower = [], water_upper = [];

    for (let i = 1; i <= days; i++) {
        const aqiPred = Math.min(Math.max(lastAqi + aqiSlope * i + noise(i, 8), 0), 500);
        const waterPred = Math.min(Math.max(lastWater + waterSlope * i + noise(i, 3), 0), 100);

        aqi_forecast.push(parseFloat(aqiPred.toFixed(2)));
        water_stress_forecast.push(parseFloat(waterPred.toFixed(2)));

        const aqiMargin = aqiPred * MARGIN * (1 + i * 0.05);
        const waterMargin = waterPred * MARGIN * (1 + i * 0.05);

        aqi_lower.push(parseFloat(Math.max(aqiPred - aqiMargin, 0).toFixed(2)));
        aqi_upper.push(parseFloat(Math.min(aqiPred + aqiMargin, 500).toFixed(2)));
        water_lower.push(parseFloat(Math.max(waterPred - waterMargin, 0).toFixed(2)));
        water_upper.push(parseFloat(Math.min(waterPred + waterMargin, 100).toFixed(2)));
    }

    // Fallback Mock output for Contest Requirements
    const maxAqi = Math.max(...aqi_forecast);
    const maxWater = Math.max(...water_stress_forecast);
    const prob = (maxAqi / 500) * 0.5 + (maxWater / 100) * 0.5;

    return {
        aqi_forecast,
        water_stress_forecast,
        confidence_bands: {
            aqi: { lower: aqi_lower, upper: aqi_upper },
            water: { lower: water_lower, upper: water_upper },
        },
        mode: 'mock',
        note: 'Set ML_ENABLED=true in .env to switch to real ML microservice.',
        crisis_probability: prob,
        time_to_impact_days: maxAqi > 250 ? `${Math.floor(days / 2)} days (Est.)` : 'No immediate crisis',
        affected_zones: maxAqi > 200 ? ['Industrial Zone North', 'Downtown Core'] : ['Routine Monitoring'],
        recommended_policies: maxAqi > 250
            ? ['Mandatory Remote Work (IT/Admin sectors)', 'High-Capacity Air Purifier Installations', 'Halt Heavy Logistics']
            : maxAqi > 150
                ? ['Voluntary traffic reduction', 'Industrial monitoring', 'City-wide sensor recalibration']
                : ['Maintain current protocols', 'Bi-weekly environmental audit'],
    };
};

const generateForecast = async (historicalData, days = DEFAULT_FORECAST_DAYS) => {
    const mlEnabled = process.env.ML_ENABLED === 'true';
    const cityId = historicalData[0]?.cityId || 'bengaluru';

    if (mlEnabled) {
        const latest = historicalData[historicalData.length - 1] || {};
        const meta = getCityMetadata(cityId);

        const [aqiResult, waterResult, healthResult, trafficResult, forestResult] = await Promise.all([
            predictAQI({ days }),
            predictWater({ days }),
            predictHealth({
                aqi: latest.aqi || 100,
                temperature: latest.temperature || 30.0,
                humidity: 60.0,
                population_density: meta.pop_density,
                water_quality_index: latest.water_quality || 50.0,
                hospital_beds_per1k: meta.hospital_beds_per1k,
                literacy_rate: meta.literacy_rate,
                month: new Date().getMonth() + 1,
                monsoon: (new Date().getMonth() + 1 >= 6 && new Date().getMonth() + 1 <= 9) ? 1 : 0,
                avg_rainfall: meta.avg_rainfall,
                max_temp: meta.max_temp
            }),
            predictTraffic({
                time_of_day: new Date().getHours(),
                day_of_week: new Date().getDay(),
                traffic_density: (latest.traffic || 0) * 1.5, // Scale to density
                temperature: latest.temperature || 30.0,
                population_density: meta.pop_density,
                household_density: meta.household_density,
                month: new Date().getMonth() + 1,
                summer: (new Date().getMonth() + 1 >= 3 && new Date().getMonth() + 1 <= 6) ? 1 : 0
            }),
            predictForest({
                rainfall: (meta.avg_rainfall / 365) * 2,
                urban_expansion_rate: 0.5 + meta.workforce_ratio * 2 - meta.literacy_rate,
                forest_cover_ha: 100000 - meta.pop_density * 5,
                population_density: meta.pop_density,
                avg_rainfall: meta.avg_rainfall,
                workforce_ratio: meta.workforce_ratio
            })
        ]);

        if (aqiResult && waterResult && healthResult) {
            return transformNewMLResponse(aqiResult, waterResult, healthResult, trafficResult, forestResult);
        }

        console.warn('Falling back to mock forecast due to partial model service failure.');
    }

    return mockForecast(historicalData, days);
};

module.exports = { generateForecast, mockForecast };
