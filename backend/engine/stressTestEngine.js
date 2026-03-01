/**
 * Monte Carlo StressTestEngine
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs high-volume stochastic simulations to calculate the confidence intervals,
 * worst-case, and best-case risks of the urban environment.
 */

const { normalizeAll } = require('./dataProcessor');
const { runCascade } = require('./cascadeEngine');

/**
 * Generate a random number with a normal (Gaussian) distribution
 * using the Box-Muller transform.
 * 
 * @param {number} mean 
 * @param {number} stdev 
 */
const normalRandom = (mean, stdev) => {
    let u = 1 - Math.random(); // Converting [0,1) to (0,1]
    let v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
};

/**
 * Clamp value between bounds
 */
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/**
 * Perturb baseline data with Gaussian noise
 * 
 * @param {Object} baseline - Normalized data
 * @param {number} variance - Variance percentage (e.g. 0.1 for 10%)
 */
const perturb = (baseline, variance = 0.1) => {
    return {
        aqi: clamp(normalRandom(baseline.aqi, baseline.aqi * variance), 0, 1),
        traffic: clamp(normalRandom(baseline.traffic, baseline.traffic * variance), 0, 1),
        water: clamp(normalRandom(baseline.water, baseline.water * variance), 0, 1),
        emissions: clamp(normalRandom(baseline.emissions, baseline.emissions * variance), 0, 1)
    };
};

/**
 * Run a Monte Carlo simulation.
 * 
 * @param {Object} rawBaseline - Raw EnvironmentalData
 * @param {number} iterations - Number of simulations to run (100-1000)
 * @param {number} variance  - Variance percentage deviation
 */
const runStressTest = (rawBaseline, iterations = 1000, variance = 0.15) => {
    const norm = normalizeAll(rawBaseline);
    const results = [];

    // Run iterations
    for (let i = 0; i < iterations; i++) {
        const noisyData = perturb(norm, variance);
        const result = runCascade(noisyData, 0);
        results.push(result.risk_score);
    }

    // Sort ascending for percentiles
    results.sort((a, b) => a - b);

    // Calculate statistics
    const sum = results.reduce((acc, val) => acc + val, 0);
    const mean = sum / iterations;

    const worst_case = results[results.length - 1]; // max
    const best_case = results[0]; // min

    // Percentiles
    const p05 = results[Math.floor(iterations * 0.05)];
    const p95 = results[Math.floor(iterations * 0.95)];

    return {
        iterations,
        variance_applied: variance,
        mean_risk: parseFloat(mean.toFixed(4)),
        best_case: parseFloat(best_case.toFixed(4)),
        worst_case: parseFloat(worst_case.toFixed(4)),
        confidence_interval_95: {
            lower: parseFloat(p05.toFixed(4)),
            upper: parseFloat(p95.toFixed(4))
        },
        timestamp: new Date()
    };
};

module.exports = { runStressTest, perturb, normalRandom };
