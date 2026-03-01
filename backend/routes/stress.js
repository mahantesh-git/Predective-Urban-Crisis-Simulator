const express = require('express');
const router = express.Router();
const EnvironmentalData = require('../models/EnvironmentalData');
const { runStressTest } = require('../engine/stressTestEngine');

/**
 * @route   GET /api/simulate/stress-test
 * @desc    Run a Monte Carlo stress test on the current city state
 * @access  Public
 */
router.get('/stress-test', async (req, res, next) => {
    try {
        const iterations = parseInt(req.query.iterations, 10) || 1000;
        const variance = parseFloat(req.query.variance) || 0.15;

        // Cap iterations to prevent event loop blocking
        if (iterations > 5000) {
            return res.status(400).json({ success: false, message: 'Max iterations allowed is 5000.' });
        }

        const latest = await EnvironmentalData.findOne().sort({ date: -1 });
        if (!latest) {
            return res.status(404).json({ success: false, message: 'No baseline data found.' });
        }

        // Run Monte Carlo
        const stressResult = runStressTest(latest, iterations, variance);

        res.json({
            success: true,
            data: stressResult
        });

    } catch (err) {
        console.error(`Error in /api/simulate/stress-test:`, err.message);
        next(err);
    }
});

module.exports = router;
