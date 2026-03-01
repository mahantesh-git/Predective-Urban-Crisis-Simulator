const express = require('express');
const router = express.Router();
const EnvironmentalData = require('../models/EnvironmentalData');
const { injectScenario, SCENARIO_MAP } = require('../engine/scenarioEngine');

/**
 * @route   POST /api/simulate/scenario
 * @desc    Test catastrophic scenarios (Heatwave, Flood, etc)
 * @access  Public
 */
router.post('/scenario', async (req, res, next) => {
    try {
        const { scenarioId } = req.body;

        if (!scenarioId || !SCENARIO_MAP[scenarioId]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or missing scenarioId',
                available_scenarios: Object.keys(SCENARIO_MAP)
            });
        }

        // Get latest baseline
        const latest = await EnvironmentalData.findOne().sort({ date: -1 });
        if (!latest) {
            return res.status(404).json({ success: false, message: 'No baseline data found.' });
        }

        // Inject scenario
        const simulationResult = injectScenario(latest, scenarioId);

        res.json({
            success: true,
            data: simulationResult
        });

    } catch (err) {
        console.error(`Error in /api/simulate/scenario:`, err.message);
        next(err);
    }
});

module.exports = router;
