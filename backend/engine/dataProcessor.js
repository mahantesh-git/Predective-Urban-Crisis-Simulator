const THRESHOLDS = {
    aqi: { min: 0, max: 500 },
    traffic: { min: 0, max: 100 },
    water_quality: { min: 0, max: 100 },
    industry_emission: { min: 0, max: 100 },
};

const normalizeAQI = (value) => {
    return Math.min(Math.max(value / THRESHOLDS.aqi.max, 0), 1);
};

const normalizeTraffic = (value) => {
    return Math.min(Math.max(value / THRESHOLDS.traffic.max, 0), 1);
};
const normalizeWater = (value) => {
    const inverted = THRESHOLDS.water_quality.max - value;
    return Math.min(Math.max(inverted / THRESHOLDS.water_quality.max, 0), 1);
};
const normalizeEmissions = (value) => {
    return Math.min(Math.max(value / THRESHOLDS.industry_emission.max, 0), 1);
};
const validateInput = (data) => {
    const checks = [
        { field: 'aqi', val: data.aqi, ...THRESHOLDS.aqi },
        { field: 'traffic', val: data.traffic, ...THRESHOLDS.traffic },
        { field: 'water_quality', val: data.water_quality, ...THRESHOLDS.water_quality },
        { field: 'industry_emission', val: data.industry_emission, ...THRESHOLDS.industry_emission },
    ];

    for (const { field, val, min, max } of checks) {
        if (val === undefined || val === null) {
            const err = new Error(`Missing required field: ${field}`);
            err.statusCode = 400;
            throw err;
        }
        if (val < min || val > max) {
            const err = new Error(`${field} must be between ${min} and ${max}, got ${val}`);
            err.statusCode = 400;
            throw err;
        }
    }
};
const normalizeAll = (data) => {
    return {
        aqi: normalizeAQI(data.aqi),
        traffic: normalizeTraffic(data.traffic),
        water: normalizeWater(data.water_quality),
        emissions: normalizeEmissions(data.industry_emission),
    };
};

module.exports = {
    normalizeAQI,
    normalizeTraffic,
    normalizeWater,
    normalizeEmissions,
    normalizeAll,
    validateInput,
};
