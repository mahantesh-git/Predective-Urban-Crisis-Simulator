/**
 * CrisisScoreEngine
 * ─────────────────────────────────────────────────────────────────────────────
 * Aggregates all normalized subsystem risks into a single city-wide Crisis Score (0–100).
 *
 * Implements a Weighted Sum Model (WSM):
 * CrisisScore = Σ (Risk_i × Weight_i) × 100
 */

const WEIGHTS = {
    aqi_risk: 0.40,
    water_risk: 0.25,
    health_risk: 0.20,
    traffic_risk: 0.15
};

/**
 * Get Risk Category based on score
 * @param {number} score 0-100
 */
const getCategory = (score) => {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MODERATE';
    return 'LOW';
};

/**
 * Compute the aggregate Crisis Score from cascade effects.
 *
 * @param {Object} cascadeEffects - { aqi_risk, water_risk, health_risk, traffic_risk }
 * @returns {Object} { score, category, weighted_contributions }
 */
const computeCrisisScore = (cascadeEffects) => {
    const { aqi_risk, water_risk, health_risk, traffic_risk } = cascadeEffects;

    // Map inputs to weights
    const inputs = {
        aqi_risk,
        water_risk,
        health_risk,
        traffic_risk
    };

    let totalScore = 0;
    const weighted_contributions = {};

    Object.keys(WEIGHTS).forEach(key => {
        const contribution = (inputs[key] || 0) * WEIGHTS[key];
        totalScore += contribution;
        weighted_contributions[key] = parseFloat(contribution.toFixed(4));
    });

    const score = parseFloat((totalScore * 100).toFixed(2));

    return {
        score: Math.min(score, 100),
        category: getCategory(score),
        weighted_contributions,
        timestamp: new Date()
    };
};

module.exports = { computeCrisisScore, WEIGHTS };
