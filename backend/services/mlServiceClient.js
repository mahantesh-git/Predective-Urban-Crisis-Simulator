const ML_URL = () => process.env.ML_SERVICE_URL || 'http://localhost:8000';

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
        console.warn(`ML ${path} failed or unreachable: ${err.message}`);
        return null;
    }
};

const predictAQI     = (payload) => callMLEndpoint('/predict/aqi',     payload);
const predictWater   = (payload) => callMLEndpoint('/predict/water',   payload);
const predictHealth  = (payload) => callMLEndpoint('/predict/health',  payload);
const predictTraffic = (payload) => callMLEndpoint('/predict/traffic', payload);


const checkMLHealth = async () => {
    try {
        const response = await fetch(`${ML_URL()}/health`, { timeout: 3000 });
        return response.ok;
    } catch {
        return false;   
    }
};

module.exports = {
    predictAQI,
    predictWater,
    predictHealth,
    predictTraffic,
    checkMLHealth,
};
