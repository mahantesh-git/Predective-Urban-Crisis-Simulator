/**
 * ML Service Client – Adapter Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * HTTP adapter between the backend and the ML microservice (FastAPI).
 *
 * Supported ML endpoints:
 *   POST /predict                    — 7-day forecast + crisis probability
 *   POST /train                     — Train/retrain ML models
 *   GET  /health                    — Health check
 *   GET  /deforestation/overview    — Deforestation dataset summary
 *   GET  /deforestation/risk        — State-level deforestation risk scores
 *   GET  /deforestation/national    — National deforestation trend
 *   GET  /deforestation/state/:name — State-specific trend
 *   GET  /deforestation/rankings    — Top/bottom state rankings
 *   POST /deforestation/compare     — Compare states on a metric
 */

const fetch = require('node-fetch');

const ML_URL = () => process.env.ML_SERVICE_URL || 'http://localhost:8000';

// ─── Smart City ML Endpoints  ───────────────────────────────────────────────

/**
 * Generic POST proxy for new Smart City ML endpoints.
 */
const callMLEndpoint = async (path, payload) => {
    const url = `${ML_URL()}${path}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            timeout: 10000,
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`ML ${path} responded ${response.status}: ${body}`);
        }
        return await response.json();
    } catch (err) {
        console.warn(`⚠️  ML ${path} failed or unreachable: ${err.message}`);
        return null;
    }
};

const predictAQI = (payload) => callMLEndpoint('/predict/aqi', payload);
const predictWater = (payload) => callMLEndpoint('/predict/water', payload);
const predictHealth = (payload) => callMLEndpoint('/predict/health', payload);
const predictTraffic = (payload) => callMLEndpoint('/predict/traffic', payload);
const predictForest = (payload) => callMLEndpoint('/predict/forest', payload);

/**
 * Check if the ML service is healthy.
 * @returns {Promise<boolean>}
 */
const checkMLHealth = async () => {
    try {
        const response = await fetch(`${ML_URL()}/health`, { timeout: 3000 });
        return response.ok;
    } catch {
        return false;
    }
};

// ─── Deforestation ──────────────────────────────────────────────────────────

/**
 * Generic GET proxy for ML deforestation endpoints.
 * @param {string} path - Path after /deforestation (e.g. '/overview', '/risk?year=2023')
 * @returns {Promise<Object|null>}
 */
const fetchDeforestationData = async (path) => {
    const url = `${ML_URL()}/deforestation${path}`;
    try {
        const response = await fetch(url, { timeout: 8000 });
        if (!response.ok) throw new Error(`ML responded ${response.status}`);
        return await response.json();
    } catch (err) {
        console.warn(`⚠️  ML deforestation${path} failed: ${err.message}`);
        return null;
    }
};

/**
 * POST proxy for ML deforestation compare endpoint.
 * @param {Object} payload - { states: string[], metric: string }
 * @returns {Promise<Object|null>}
 */
const compareDeforestationStates = async (payload) => {
    const url = `${ML_URL()}/deforestation/compare`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            timeout: 8000,
        });
        if (!response.ok) throw new Error(`ML responded ${response.status}`);
        return await response.json();
    } catch (err) {
        console.warn(`⚠️  ML deforestation compare failed: ${err.message}`);
        return null;
    }
};

module.exports = {
    predictAQI,
    predictWater,
    predictHealth,
    predictTraffic,
    predictForest,
    checkMLHealth,
    fetchDeforestationData,
    compareDeforestationStates,
};
