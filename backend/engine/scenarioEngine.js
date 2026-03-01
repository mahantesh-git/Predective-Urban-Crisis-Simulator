/**
 * ScenarioInjectionEngine
 * ─────────────────────────────────────────────────────────────────────────────
 * Allows dynamic injection of high-level catastrophic scenarios into the baseline.
 * Each scenario maps to specific environmental parameter adjustments.
 */

const { normalizeAll } = require('./dataProcessor');
const { runCascade } = require('./cascadeEngine');

// Pre-defined scenario modifiers
const SCENARIO_MAP = {
    HEATWAVE: {
        temperature_offset: +10,
        health_modifier: +0.4,
        water_modifier: -0.2
    },
    FLOOD: {
        water_quality_modifier: -0.4,
        traffic_modifier: +0.5,
        health_modifier: +0.3
    },
    DROUGHT: {
        water_quality_modifier: -0.5,
        temperature_offset: +5,
        drought_index_offset: +0.8
    },
    INDUSTRIAL_ACCIDENT: {
        industry_modifier: +1.0, // forces max
        aqi_modifier: +0.6,
        health_modifier: +0.5
    },
    TRAFFIC_SURGE: {
        traffic_modifier: +0.8,
        aqi_modifier: +0.3
    }
};

/**
 * Clamp value to 0-1 range (for normalized inputs) or specific ranges
 */
const clamp = (val, min = 0, max = 1) => Math.min(Math.max(val, min), max);

/**
 * Apply a scenario to a baseline data object
 * 
 * @param {Object} baseline - Raw EnvironmentalData
 * @param {String} scenarioId - Key from SCENARIO_MAP
 * @returns {Object} Adjusted risk snapshot
 */
const injectScenario = (baseline, scenarioId) => {
    const mods = SCENARIO_MAP[scenarioId];
    if (!mods) throw new Error(`Unknown scenario: ${scenarioId}`);

    // Base normalization
    const norm = normalizeAll(baseline);

    // Apply Modifiers to normalized data
    const adjustedNorm = {
        aqi: clamp(norm.aqi + (mods.aqi_modifier || 0)),
        traffic: clamp(norm.traffic + (mods.traffic_modifier || 0)),
        water: clamp(norm.water + (mods.water_quality_modifier || 0)),
        emissions: clamp(norm.emissions + (mods.industry_modifier || 0))
    };

    // Run cascade with adjusted data. Note we synthesize an increased heatwave level if requested.
    const baseHeatwave = 0; // standard baseline is 0
    const effectiveHeatwave = clamp(baseHeatwave + (mods.temperature_offset ? (mods.temperature_offset / 10) : 0), 0, 5);

    const cascadeResult = runCascade(adjustedNorm, effectiveHeatwave);

    // Apply direct health modifiers post-cascade if the scenario specifically damages health (like a chemical leak)
    if (mods.health_modifier) {
        cascadeResult.cascade_effects.health_risk = clamp(cascadeResult.cascade_effects.health_risk + mods.health_modifier);

        // Recalculate total risk score
        cascadeResult.risk_score = (
            cascadeResult.cascade_effects.aqi_risk +
            cascadeResult.cascade_effects.water_risk +
            cascadeResult.cascade_effects.health_risk +
            cascadeResult.cascade_effects.traffic_risk
        ) / 4;
    }

    return {
        scenario: scenarioId,
        applied_modifiers: mods,
        original_risk: runCascade(norm, 0).risk_score,
        adjusted_risk: cascadeResult.risk_score,
        cascade_result: cascadeResult,
        timestamp: new Date()
    };
};

module.exports = { injectScenario, SCENARIO_MAP };
