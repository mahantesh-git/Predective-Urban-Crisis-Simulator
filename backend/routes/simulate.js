const express = require('express');
const router = express.Router();

const EnvironmentalData = require('../models/EnvironmentalData');
const Simulation = require('../models/Simulation');
const { computeRisk } = require('../engine/cascadeEngine');
const { runSimulation } = require('../engine/simulationEngine');
const { simulateValidationRules, validate } = require('../middleware/validator');

/**
 * POST /simulate
 * ─────────────────────────────────────────────────────────────────────────────
 * Accepts policy parameters, applies them to the latest environmental data,
 * runs the cascade simulation, persists the result, and returns the impact.
 *
 * Request body:
 * {
 *   trafficReduction : number (0–100)   optional, default 0
 *   industrialCut    : number (0–100)   optional, default 0
 *   heatwaveLevel    : number (0–5)     optional, default 0
 * }
 *
 * Response:
 * {
 *   success: true,
 *   simulation_id: string,
 *   baseline: { risk_score, cascade_effects },
 *   result:   { risk_score, cascade_effects, triggered_systems, time_to_impact },
 *   delta:    { risk_reduction, percentage_improvement },
 *   adjusted_data: { aqi, traffic, water_quality, industry_emission },
 *   policy_applied: { trafficReduction, industrialCut, heatwaveLevel },
 *   saved: true
 * }
 */
router.post('/', simulateValidationRules, validate, async (req, res, next) => {
    try {
        const {
            trafficReduction = 0,
            industrialCut = 0,
            heatwaveLevel = 0,
            waterConservation = 0,
            greenSpaceExpansion = 0,
        } = req.body;

        // Get the most recent environmental reading as baseline
        const baseline = await EnvironmentalData.findOne().sort({ date: -1 });

        if (!baseline) {
            return res.status(404).json({
                success: false,
                error: 'No environmental data found. Please run `npm run seed` first.',
            });
        }

        // Compute baseline risk (no policy applied)
        const baselineRisk = computeRisk(baseline, heatwaveLevel);

        // Run simulation with policy applied
        const simResult = runSimulation(baseline, {
            trafficReduction,
            industrialCut,
            heatwaveLevel,
            waterConservation,
            greenSpaceExpansion
        });

        // Compute improvement delta
        const riskReduction = parseFloat((baselineRisk.risk_score - simResult.risk_score).toFixed(4));
        const percentImprovement = baselineRisk.risk_score > 0
            ? parseFloat(((riskReduction / baselineRisk.risk_score) * 100).toFixed(2))
            : 0;

        // Persist simulation result
        const saved = await Simulation.create({
            input_parameters: {
                trafficReduction,
                industrialCut,
                heatwaveLevel,
                waterConservation,
                greenSpaceExpansion
            },
            baseline_data: {
                aqi: baseline.aqi,
                traffic: baseline.traffic,
                water_quality: baseline.water_quality,
                industry_emission: baseline.industry_emission,
            },
            risk_score: simResult.risk_score,
            confidence_interval: simResult.confidence_interval,
            cascade_effects: simResult.cascade_effects,
            time_to_impact: simResult.time_to_impact,
            triggered_systems: simResult.triggered_systems,
        });

        res.status(201).json({
            success: true,
            simulation_id: saved._id,
            baseline: {
                risk_score: baselineRisk.risk_score,
                cascade_effects: baselineRisk.cascade_effects,
                triggered_systems: baselineRisk.triggered_systems,
                time_to_impact: baselineRisk.time_to_impact,
                crisis_level: getCrisisLevel(baselineRisk.risk_score),
            },
            result: {
                risk_score: simResult.risk_score,
                confidence_interval: simResult.confidence_interval,
                cascade_effects: simResult.cascade_effects,
                triggered_systems: simResult.triggered_systems,
                time_to_impact: simResult.time_to_impact,
                crisis_level: getCrisisLevel(simResult.risk_score),
            },
            delta: {
                risk_reduction: riskReduction,
                percentage_improvement: percentImprovement,
            },
            adjusted_data: simResult.adjusted_data,
            policy_applied: simResult.policy_applied,
            saved: true,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /simulate/history
 * Returns the last 10 saved simulation records.
 */
router.get('/history', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const history = await Simulation.find()
            .sort({ timestamp: -1 })
            .limit(limit)
            .select('-__v');

        res.json({ success: true, count: history.length, history });
    } catch (err) {
        next(err);
    }
});

// ── Helpers ──────────────────────────────────────────────────────────────────
const getCrisisLevel = (score) => {
    if (score < 0.30) return 'LOW';
    if (score < 0.55) return 'MODERATE';
    if (score < 0.75) return 'HIGH';
    return 'CRITICAL';
};

/**
 * POST /simulate/compare
 * Run up to 5 policy scenarios side-by-side, returns ranked comparison table.
 */
router.post('/compare', async (req, res, next) => {
    try {
        const { scenarios } = req.body;
        if (!scenarios || !Array.isArray(scenarios) || scenarios.length < 2) {
            return res.status(400).json({ success: false, error: 'Provide at least 2 scenarios (max 5).' });
        }
        if (scenarios.length > 5) {
            return res.status(400).json({ success: false, error: 'Maximum 5 scenarios per comparison.' });
        }
        const baseline = await EnvironmentalData.findOne().sort({ date: -1 });
        if (!baseline) return res.status(404).json({ success: false, error: 'No environmental data found.' });

        const baselineRisk = computeRisk(baseline, 0);
        const results = scenarios.map((s, idx) => {
            const policy = { trafficReduction: s.trafficReduction || 0, industrialCut: s.industrialCut || 0, heatwaveLevel: s.heatwaveLevel || 0 };
            const sim = runSimulation(baseline, policy);
            const reduction = parseFloat((baselineRisk.risk_score - sim.risk_score).toFixed(4));
            return {
                scenario_index: idx + 1,
                label: s.label || `Scenario ${idx + 1}`,
                policy,
                risk_score: sim.risk_score,
                crisis_level: getCrisisLevel(sim.risk_score),
                risk_reduction: reduction,
                percentage_improvement: baselineRisk.risk_score > 0
                    ? parseFloat(((reduction / baselineRisk.risk_score) * 100).toFixed(2)) : 0,
                cascade_effects: sim.cascade_effects,
                triggered_systems: sim.triggered_systems,
            };
        });
        results.sort((a, b) => b.risk_reduction - a.risk_reduction);
        results.forEach((r, i) => { r.rank = i + 1; });
        res.json({
            success: true,
            baseline_risk: baselineRisk.risk_score,
            crisis_level: getCrisisLevel(baselineRisk.risk_score),
            winner: results[0].label,
            total_scenarios: results.length,
            comparison: results,
        });
    } catch (err) { next(err); }
});

module.exports = router;
