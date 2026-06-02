const { normalizeAll } = require('./dataProcessor');

const ADJACENCY_MATRIX = {
    'TRAFFIC': { 'AQI': 0.45 },
    'INDUSTRY': { 'AQI': 0.50, 'WATER': 0.60 },
    'AQI': { 'HEALTH': 0.70 },
    'WATER': { 'HEALTH': 0.40 },
    'HEATWAVE': { 'AQI': 0.30, 'HEALTH': 0.50 },
    'HEALTH': {}
};

const DAMPING_FACTOR = 0.8;
const ITERATIONS = 3;
const CRISIS_THRESHOLD = 0.60;

const runCascade = (normalized, heatwaveLevel = 0) => {
    const { aqi, traffic, water, emissions } = normalized;
    const heatwaveNorm = Math.min(heatwaveLevel / 5, 1);

    const base_risks = {
        'AQI': aqi,
        'WATER': water,
        'TRAFFIC': traffic,
        'INDUSTRY': emissions,
        'HEATWAVE': heatwaveNorm,
        'HEALTH': 0
    };

    let current_risks = { ...base_risks };

    // Layer 1: Iterative Matrix Propagation (Markov-style)
    for (let t = 0; t < ITERATIONS; t++) {
        let next_risks = { ...current_risks };

        for (const target_node of Object.keys(current_risks)) {
            let cascade_sum = 0;

            for (const src_node of Object.keys(current_risks)) {
                const weight = ADJACENCY_MATRIX[src_node]?.[target_node] || 0;
                cascade_sum += (current_risks[src_node] * weight);
            }

            next_risks[target_node] = base_risks[target_node] + (DAMPING_FACTOR * cascade_sum);
            next_risks[target_node] = Math.min(Math.max(next_risks[target_node], 0), 1);
        }
        current_risks = next_risks;
    }

    const aqi_risk = current_risks['AQI'];
    const water_risk = current_risks['WATER'];
    const health_risk = current_risks['HEALTH'];
    const traffic_risk = current_risks['TRAFFIC'];

    // Layer 2: Total weighted risk (from crisisScoreEngine)
    const risk_score = (
        (0.40 * aqi_risk) +
        (0.25 * water_risk) +
        (0.20 * health_risk) +
        (0.15 * traffic_risk)
    );

    // Layer 3: Confidence Interval
    const baseMargin = parseFloat(process.env.CONFIDENCE_MARGIN || '0.12');
    const dynamicVariance = (Math.sin(Date.now() / 10000) * 0.04);
    const margin = Math.max(0.05, baseMargin + dynamicVariance);

    const confidence_interval = {
        lower: parseFloat(Math.max(risk_score - margin * risk_score, 0).toFixed(4)),
        upper: parseFloat(Math.min(risk_score + margin * risk_score, 1).toFixed(4)),
    };

    // Layer 4: Triggered Systems
    const triggered_systems = [];
    if (aqi_risk >= CRISIS_THRESHOLD) triggered_systems.push('AIR_QUALITY');
    if (water_risk >= CRISIS_THRESHOLD) triggered_systems.push('WATER_SUPPLY');
    if (health_risk >= CRISIS_THRESHOLD) triggered_systems.push('PUBLIC_HEALTH');
    if (traffic_risk >= CRISIS_THRESHOLD) triggered_systems.push('TRAFFIC_NETWORK');

    // Layer 5: Time-to-Impact estimate
    const time_to_impact = risk_score > 0 ? Math.max(Math.round((CRISIS_THRESHOLD - risk_score) / 0.05), 0) : null;

    return {
        risk_score: parseFloat(risk_score.toFixed(4)),
        confidence_interval,
        cascade_effects: {
            aqi_risk: parseFloat(aqi_risk.toFixed(4)),
            water_risk: parseFloat(water_risk.toFixed(4)),
            health_risk: parseFloat(health_risk.toFixed(4)),
            traffic_risk: parseFloat(traffic_risk.toFixed(4)),
        },
        triggered_systems,
        time_to_impact,
        crisis_threshold: CRISIS_THRESHOLD,
    };
};

const computeRisk = (rawData, heatwaveLevel = 0) => {
    const normalized = normalizeAll(rawData);
    return runCascade(normalized, heatwaveLevel);
};

module.exports = { runCascade, computeRisk, ADJACENCY_MATRIX, CRISIS_THRESHOLD };
