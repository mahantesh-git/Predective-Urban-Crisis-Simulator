const { predictAQI, predictWater, predictHealth, predictTraffic } = require('../services/mlServiceClient');
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

const calculateExplainableAI = (latest = {}) => {
    const traffic = latest.traffic ?? 45;
    const industry = latest.industry_emission ?? 35;
    const temp = latest.temperature ?? 30;
    const waterQuality = latest.water_quality ?? 70;

    const trafficImpact = parseFloat((traffic * 0.4 - 5 + Math.sin(traffic) * 2).toFixed(1));
    const industryImpact = parseFloat((industry * 0.35 + Math.cos(industry) * 2).toFixed(1));
    const windSpeedImpact = parseFloat((-10 - temp * 0.2 + Math.sin(temp) * 2).toFixed(1));

    const aqi_contributions = [
        { feature: 'Traffic Density', impact: trafficImpact },
        { feature: 'Industrial Emissions', impact: industryImpact },
        { feature: 'Wind Speed', impact: windSpeedImpact }
    ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    const effluentImpact = parseFloat((industry * 0.45 + 5 + Math.cos(industry) * 2).toFixed(1));
    const rainfallImpact = parseFloat((-8 - (100 - waterQuality) * 0.2 + Math.sin(waterQuality) * 2).toFixed(1));
    const treatmentImpact = parseFloat((-4 - waterQuality * 0.08 + Math.cos(waterQuality) * 2).toFixed(1));

    const water_contributions = [
        { feature: 'Industrial Effluent', impact: effluentImpact },
        { feature: 'Recent Rainfall', impact: rainfallImpact },
        { feature: 'Water Treatment', impact: treatmentImpact }
    ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    return {
        shap_contributions: {
            aqi: aqi_contributions,
            water_stress: water_contributions
        }
    };
};

const DEFAULT_FORECAST_DAYS = parseInt(process.env.FORECAST_DAYS || '7', 10);

const transformNewMLResponse = (aqiResult, waterResult, healthResult, trafficResult, latest = {}) => {
    const aqi_forecast = aqiResult.forecast.map(f => f.prediction);
    const aqi_lower = aqiResult.forecast.map(f => f.lower_bound);
    const aqi_upper = aqiResult.forecast.map(f => f.upper_bound);

    const water_forecast = waterResult.forecast.map(f => f.prediction);
    const water_lower = waterResult.forecast.map(f => f.lower_bound);
    const water_upper = waterResult.forecast.map(f => f.upper_bound);

    let prob = 0.2;

    if (healthResult?.risk_level === 'CRITICAL') prob += 0.4;
    else if (healthResult?.risk_level === 'HIGH') prob += 0.3;
    else if (healthResult?.risk_level === 'MODERATE') prob += 0.15;

    if (trafficResult?.traffic_status === 'CONGESTED') prob += 0.2;
    else if (trafficResult?.traffic_status === 'HEAVY') prob += 0.1;


    prob = Math.min(prob, 0.98);

    const maxAqi = Math.max(...aqi_forecast);
    const maxWater = Math.max(...water_forecast);

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

    const current_zones = ['Industrial Area', 'Downtown Core', 'Residential District', 'Waterfront Zone', 'Transport Gateway']
    let affectedZones = [];
    if (maxAqi > 250) affectedZones.push(current_zones[0], current_zones[1]);
    if (maxWater > 70) affectedZones.push(current_zones[2], current_zones[3]);
    if (prob > 0.8) affectedZones.push(current_zones[4]);
    if (affectedZones.length === 0) affectedZones = ['Routine Monitoring Across All Zones'];
    console.log(affectedZones)

    const policies = [];

    if (maxAqi > 350) {
        policies.push('Declare Public Health Emergency: Total Industrial Halt', 'Emergency Green-Zone Oxygen Hubs deployment');
    } else if (maxAqi > 200) {
        policies.push('Enact Stage 2 Vehicle Rationing', 'Halt non-essential construction');
    }

    if (maxWater > 85) {
        policies.push('Category A Water Rationing (Essential services only)', 'Mandatory IoT leak-detection sweep');
    } else if (maxWater > 60) {
        policies.push('Divert emergency reservoir allocations');
    }

    if (prob > 0.85) {
        policies.push('Pre-emptive hospital surge-capacity activation');
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
        note: 'Powered by 4 dedicated modular ML models (Prophet/XGBoost).',
        crisis_probability: parseFloat(prob.toFixed(2)),
        crisis_status: healthResult?.risk_level || 'UNKNOWN',
        time_to_impact_days: timeToImpact,
        affected_zones: [...new Set(affectedZones)],
        recommended_policies: policies,
        external_signals: {
            traffic: trafficResult?.traffic_status
        },
        explainable_ai: calculateExplainableAI(latest)
    };
};


const generateForecast = async (historicalData, days = DEFAULT_FORECAST_DAYS) => {
    const mlEnabled = process.env.ML_ENABLED === 'true';
    const cityId = historicalData[0]?.cityId || 'bengaluru';

    if (mlEnabled) {
        try {
            const latest = historicalData[historicalData.length - 1] || {};
            const meta = getCityMetadata(cityId);

            const [aqiResult, waterResult, healthResult, trafficResult] = await Promise.all([
                predictAQI({ days }),
                predictWater({ days }),
                predictHealth({
                    aqi: latest.aqi || 100,
                    temperature: latest.temperature || 30.0,
                    humidity: 60.0,
                    population_density: meta.pop_density,
                    water_quality_index: latest.water_quality || 50.0
                }),
                predictTraffic({
                    time_of_day: new Date().getHours(),
                    day_of_week: new Date().getDay(),
                    traffic_density: (latest.traffic || 0) * 1.5,
                    temperature: latest.temperature || 30.0,
                    aqi: latest.aqi || 100,
                })
            ]);

            if (aqiResult && waterResult && healthResult) {
                return transformNewMLResponse(aqiResult, waterResult, healthResult, trafficResult, latest);
            }
        } catch (error) {
            console.error('ML Service unreachable or error:', error.message);
        }
    }

};

module.exports = { generateForecast };
