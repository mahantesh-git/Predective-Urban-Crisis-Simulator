const { runSimulation } = require('./simulationEngine');

const INTERVENTIONS = [
    {
        id: 'reduce_traffic_20',
        name: 'Implement Traffic Restrictions (20%)',
        category: 'TRAFFIC',
        description: 'Odd-even vehicle scheme or congestion pricing to reduce traffic by 20%.',
        policy: { trafficReduction: 20, industrialCut: 0, heatwaveLevel: 0 },
        cost_proxy: 'LOW',
    },
    {
        id: 'reduce_traffic_40',
        name: 'Major Traffic Overhaul (40%)',
        category: 'TRAFFIC',
        description: 'Mass transit expansion + work-from-home mandates to cut traffic by 40%.',
        policy: { trafficReduction: 40, industrialCut: 0, heatwaveLevel: 0 },
        cost_proxy: 'HIGH',
    },
    {
        id: 'reduce_industry_20',
        name: 'Industrial Emission Cap (20%)',
        category: 'INDUSTRY',
        description: 'Issue emission quotas and enforce clean-energy transitions for 20% cut.',
        policy: { trafficReduction: 0, industrialCut: 20, heatwaveLevel: 0 },
        cost_proxy: 'MEDIUM',
    },
    {
        id: 'reduce_industry_35',
        name: 'Industrial Shutdown Protocol (35%)',
        category: 'INDUSTRY',
        description: 'Temporary shutdown of heavy industry clusters during crisis.',
        policy: { trafficReduction: 0, industrialCut: 35, heatwaveLevel: 0 },
        cost_proxy: 'HIGH',
    },
    {
        id: 'combined_traffic_industry',
        name: 'Combined Traffic + Industry Action',
        category: 'COMBINED',
        description: 'Simultaneous traffic reduction (20%) and industrial cut (20%) for compound impact.',
        policy: { trafficReduction: 20, industrialCut: 20, heatwaveLevel: 0 },
        cost_proxy: 'HIGH',
    },
    {
        id: 'heatwave_mitigation',
        name: 'Urban Heat Mitigation (Green Cover)',
        category: 'HEATWAVE',
        description: 'Urban greening and reflective surfaces to reduce effective heatwave severity.',
        policy: { trafficReduction: 0, industrialCut: 0, heatwaveLevel: 0 },
        cost_proxy: 'MEDIUM',
        heatwave_override: true,
    },
];

const COST_WEIGHTS = { LOW: 1.5, MEDIUM: 1.0, HIGH: 0.7 };

const generateRecommendations = (baselineData, currentRisk, currentHeatwave = 0) => {
    const scoredInterventions = INTERVENTIONS.map((intervention) => {
        const policy = { ...intervention.policy };

        if (intervention.heatwave_override) {
            policy.heatwaveLevel = 0;
        } else {
            policy.heatwaveLevel = currentHeatwave;
        }

        const simResult = runSimulation(baselineData, policy);
        const newRisk = simResult.risk_score;

        const riskDelta = parseFloat((currentRisk - newRisk).toFixed(4));
        const costWeight = COST_WEIGHTS[intervention.cost_proxy] || 1.0;
        const efficiency = parseFloat((riskDelta * costWeight).toFixed(4));

        return {
            id: intervention.id,
            name: intervention.name,
            category: intervention.category,
            description: intervention.description,
            cost_proxy: intervention.cost_proxy,
            baseline_risk: parseFloat(currentRisk.toFixed(4)),
            projected_risk: parseFloat(newRisk.toFixed(4)),
            risk_reduction: riskDelta,
            efficiency_score: efficiency,
            cascade_impact: simResult.cascade_effects,
            expected_systems_resolved: simResult.triggered_systems.length === 0
                ? ['ALL']
                : simResult.triggered_systems,
        };
    });

    scoredInterventions.sort((a, b) => b.efficiency_score - a.efficiency_score);

    return scoredInterventions.map((item, idx) => ({
        rank: idx + 1,
        ...item,
    }));
};

module.exports = { generateRecommendations };
