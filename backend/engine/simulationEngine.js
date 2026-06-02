const { normalizeAll } = require('./dataProcessor');
const { runCascade } = require('./cascadeEngine');

const clamp = (val, min, max) => Math.min(Math.max(val, min), max); 

const runSimulation = (baseline, policyInput = {}) => {
    const {
        trafficReduction = 0,
        industrialCut = 0,
        heatwaveLevel = 0,
        waterConservation = 0,
        greenSpaceExpansion = 0,
    } = policyInput;

    const adjusted = {
        aqi: baseline.aqi,
        traffic: clamp(baseline.traffic * (1 - trafficReduction / 100), 0, 100),
        water_quality: clamp(baseline.water_quality * (1 + (waterConservation / 100) * 0.3), 0, 100), 
        industry_emission: clamp(baseline.industry_emission * (1 - industrialCut / 100), 0, 100),
    };

    adjusted.aqi = clamp(
        baseline.aqi * (
            1 -
            (trafficReduction / 100) * 0.40 -
            (industrialCut / 100) * 0.50 -
            (greenSpaceExpansion / 100) * 0.15
        ),
        0,
        500
    );

    const effectiveHeatwave = clamp(heatwaveLevel - (greenSpaceExpansion / 100) * 1.0, 0, 5);
    const normalized = normalizeAll(adjusted);
    const cascadeResult = runCascade(normalized, effectiveHeatwave);

    return {
        ...cascadeResult,
        adjusted_data: adjusted,
        policy_applied: {
            trafficReduction,
            industrialCut,
            heatwaveLevel,
            waterConservation,
            greenSpaceExpansion,
        },
    };
};

module.exports = { runSimulation };
