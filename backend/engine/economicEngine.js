/**
 * EconomicImpactEngine
 * ─────────────────────────────────────────────────────────────────────────────
 * Translates environmental and urban risk into estimated economic loss.
 *
 * Models:
 * 1. Productivity Loss: Based on traffic congestion and health alerts.
 * 2. Healthcare Burden: Based on AQI and Health risk levels.
 * 3. Industrial Impact: Based on emission mandates and regulatory cuts.
 */

// Heuristic Coefficients (Simulation values)
const COEFFICIENTS = {
    HEALTH_BURDEN_BASE: 50000,    // USD per risk point
    PRODUCTIVITY_LOSS_BASE: 25000, // USD per traffic/health point
    INDUSTRIAL_CUT_COST: 15000     // USD per emission reduction point
};

/**
 * Estimate Economic Impact of the current crisis state.
 *
 * @param {Object} riskSnapshot - { aqi_risk, health_risk, traffic_risk, industrial_cut }
 * @returns {Object} Impact metrics in USD and percentages
 */
const estimateImpact = (riskSnapshot) => {
    const {
        aqi_risk = 0,
        health_risk = 0,
        traffic_risk = 0,
        industrial_cut = 0 // % reduction applied 
    } = riskSnapshot;

    // 1. Healthcare Burden (Driven by AQI + Health emergent risk)
    const healthcare_cost = (aqi_risk * 0.6 + health_risk * 1.0) * COEFFICIENTS.HEALTH_BURDEN_BASE;

    // 2. Productivity Drop (Driven by Traffic + Health)
    const productivity_loss = (traffic_risk * 0.7 + health_risk * 0.3) * COEFFICIENTS.PRODUCTIVITY_LOSS_BASE;
    const productivity_drop_percent = (traffic_risk * 0.8 + health_risk * 0.2) * 15; // Max 15% drop

    // 3. Industrial Output Loss
    const industrial_loss = (industrial_cut / 100) * COEFFICIENTS.INDUSTRIAL_CUT_COST * 100;

    const estimated_loss_usd = healthcare_cost + productivity_loss + industrial_loss;

    return {
        estimated_loss_usd: Math.round(estimated_loss_usd),
        healthcare_burden: Math.round(healthcare_cost),
        productivity_drop_percent: parseFloat(productivity_drop_percent.toFixed(2)),
        industrial_output_loss: Math.round(industrial_loss),
        currency: 'USD',
        timestamp: new Date()
    };
};

module.exports = { estimateImpact, COEFFICIENTS };
