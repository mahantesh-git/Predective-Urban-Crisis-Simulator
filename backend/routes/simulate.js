const express = require('express');
const router = express.Router();

const EnvironmentalData = require('../models/EnvironmentalData');
const { computeRisk } = require('../engine/cascadeEngine');
const { runSimulation } = require('../engine/simulationEngine');
const { simulateValidationRules, validate } = require('../middleware/validator');

router.post('/', simulateValidationRules, validate, async (req, res, next) => {
    try {
        const {
            trafficReduction = 0,
            industrialCut = 0,
            heatwaveLevel = 0,
            waterConservation = 0,
            greenSpaceExpansion = 0,
            cityId = 'bengaluru',
        } = req.body;

        let baseline = await EnvironmentalData.findOne({ cityId }).sort({ date: -1 });
        if (!baseline) {
            baseline = await EnvironmentalData.findOne({ cityId: 'bengaluru' }).sort({ date: -1 });
        }

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

        res.status(200).json({
            success: true,
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
        });
    } catch (err) {
        next(err);
    }
});


const getCrisisLevel = (score) => {
    if (score < 0.30) return 'LOW';
    if (score < 0.55) return 'MODERATE';
    if (score < 0.75) return 'HIGH';
    return 'CRITICAL';
};


router.post('/compare', async (req, res, next) => {
    try {
        const { scenarios, cityId = 'bengaluru' } = req.body;
        if (!scenarios || !Array.isArray(scenarios) || scenarios.length < 2) {
            console.log("Error: Scenarios not provided")
            return res.status(400).json({ success: false, error: 'Provide at least 2 scenarios (max 5).' });
        }
        if (scenarios.length > 5) {
            return res.status(400).json({ success: false, error: 'Maximum 5 scenarios per comparison.' });
        }
        let baseline = await EnvironmentalData.findOne({cityId}).sort({ date: -1 });
        if (!baseline) {
            baseline = await EnvironmentalData.findOne({ cityId: 'bengaluru' }).sort({ date: -1 });
        }
        if (!baseline) return res.status(404).json({ success: false, error: 'No environmental data found.' });

        const baselineRisk = computeRisk(baseline, 0);
        
        const history = await EnvironmentalData.find({ cityId }).sort({ date: -1 }).limit(14).lean();
        history.reverse();
        const history_aqi = history.map(h => h.aqi);
        const history_water = history.map(h => h.water_quality);
        const fetch = require('node-fetch');

        const results = await Promise.all(scenarios.map(async (s, idx) => {
            const policy = { 
                trafficReduction: s.trafficReduction || 0, 
                industrialCut: s.industrialCut || 0, 
                heatwaveLevel: s.heatwaveLevel || 0,
                waterConservation: s.waterConservation || 0,
                greenSpaceExpansion: s.greenSpaceExpansion || 0
            };
            const sim = runSimulation(baseline, policy);
            const reduction = parseFloat((baselineRisk.risk_score - sim.risk_score).toFixed(4));
            
            let ml_aqi = null;
            let ml_water = null;
            
            try {
                const mlUrl = process.env.ML_URL || 'http://localhost:8001';
                const mlRes = await fetch(`${mlUrl}/forecast/multi-horizon/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        history_aqi,
                        history_water,
                        horizon_days: 7,
                        scenario_traffic_delta: -(policy.trafficReduction / 100),
                        scenario_industry_delta: -(policy.industrialCut / 100)
                    })
                });
                
                if (mlRes.ok) {
                    const mlData = await mlRes.json();
                    if (mlData.forecasts) {
                        const aqiArr = mlData.forecasts.aqi;
                        const waterArr = mlData.forecasts.water_stress;
                        if (aqiArr && aqiArr.length > 0) {
                            ml_aqi = Math.round(aqiArr.reduce((a, b) => a + b, 0) / aqiArr.length);
                        }
                        if (waterArr && waterArr.length > 0) {
                            ml_water = parseFloat((waterArr.reduce((a, b) => a + b, 0) / waterArr.length).toFixed(2));
                        }
                    }
                }
            } catch (err) {
                console.warn(`ML comparison failed for ${s.label}:`, err.message);
            }

            return {
                label: s.label || `Scenario ${idx + 1}`,
                policy,
                risk_score: sim.risk_score,
                crisis_level: getCrisisLevel(sim.risk_score),
                percentage_improvement: baselineRisk.risk_score > 0
                    ? parseFloat(((reduction / baselineRisk.risk_score) * 100).toFixed(2)) : 0,
                triggered_systems: sim.triggered_systems,
                ml_aqi,
                ml_water
            };
        }));
        
        results.sort((a, b) => b.percentage_improvement - a.percentage_improvement);
        res.json({
            success: true,
            baseline_risk: baselineRisk.risk_score,
            total_scenarios: results.length,
            winner: results[0].label,
            comparison: results,
        });
    } catch (err) { next(err); }
});

module.exports = router;
