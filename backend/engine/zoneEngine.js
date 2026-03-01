/**
 * Zone Engine – Affected Zone Forecast
 * ─────────────────────────────────────────────────────────────────────────────
 * Divides the city into 5 functional zones, each with a distinct
 * environmental exposure profile. Computes per-zone risk scores by
 * weighting the global cascade results against each zone's sensitivity.
 *
 * Zones:
 *  1. Industrial Corridor   – high emission + AQI exposure
 *  2. Residential District  – high health + water exposure
 *  3. Commercial Hub        – high traffic + AQI exposure
 *  4. Waterfront Zone       – high water contamination exposure
 *  5. Transport Gateway     – maximum traffic exposure
 *
 * Each zone has sensitivity weights (0–1) for each cascade sub-system.
 * Zone risk = Σ(sensitivity × cascade_effect_score)
 */

// ── Zone Definitions ─────────────────────────────────────────────────────────
const ZONES = [
    {
        id: 'zone_industrial',
        name: 'Peenya Industrial Area',
        type: 'INDUSTRIAL',
        description: 'One of Asia\'s largest industrial estates. Primary source of factory emissions and heavy vehicle pollution in Bengaluru.',
        coordinates: { lat: 13.028, lng: 77.518 },
        population: 23000,
        sensitivity: {
            aqi_risk: 0.90,
            water_risk: 0.75,
            health_risk: 0.80,
            traffic_risk: 0.50,
        },
        population_density: 'MEDIUM',
        pop_density_norm: 0.5,
        hospital_cap_inv: 0.6,
        historical_crises: 0.8,
        infrastructure_stress: 0.9,
        socioeconomic_sensitivity: 0.7,
        critical_infrastructure: ['Power Plant', 'Waste Treatment', 'Chemical Factory'],
    },
    {
        id: 'zone_residential',
        name: 'Banashankari',
        type: 'RESIDENTIAL',
        description: 'Dense residential neighborhood in South Bengaluru. High population vulnerability to air and water quality degradation.',
        coordinates: { lat: 12.925, lng: 77.545 },
        population: 67000,
        sensitivity: {
            aqi_risk: 0.70,
            water_risk: 0.95,
            health_risk: 0.95,
            traffic_risk: 0.40,
        },
        population_density: 'HIGH',
        pop_density_norm: 0.9,
        hospital_cap_inv: 0.3,
        historical_crises: 0.4,
        infrastructure_stress: 0.5,
        socioeconomic_sensitivity: 0.4,
        critical_infrastructure: ['Hospitals', 'Schools', 'Water Treatment Plant'],
    },
    {
        id: 'zone_commercial',
        name: 'MG Road / CBD',
        type: 'COMMERCIAL',
        description: 'Central Business District around MG Road & Brigade Road. Peak vehicle congestion and commercial activity zone.',
        coordinates: { lat: 12.975, lng: 77.608 },
        population: 45000,
        sensitivity: {
            aqi_risk: 0.80,
            water_risk: 0.40,
            health_risk: 0.65,
            traffic_risk: 0.95,
        },
        population_density: 'HIGH',
        pop_density_norm: 0.8,
        hospital_cap_inv: 0.2, // Good hospitals nearby
        historical_crises: 0.3,
        infrastructure_stress: 0.8,
        socioeconomic_sensitivity: 0.2,
        critical_infrastructure: ['Business Parks', 'Metro Station', 'Shopping Centers'],
    },
    {
        id: 'zone_waterfront',
        name: 'Bellandur Lake Zone',
        type: 'ECOLOGICAL',
        description: 'Bellandur Lake — Bengaluru\'s largest lake, prone to foam and pollution events. Critical ecological and water-stress hotspot.',
        coordinates: { lat: 12.924, lng: 77.672 },
        population: 12000,
        sensitivity: {
            aqi_risk: 0.50,
            water_risk: 1.00,
            health_risk: 0.60,
            traffic_risk: 0.30,
        },
        population_density: 'LOW',
        pop_density_norm: 0.2,
        hospital_cap_inv: 0.7,
        historical_crises: 0.9,
        infrastructure_stress: 0.6,
        socioeconomic_sensitivity: 0.5,
        critical_infrastructure: ['Lake Reservoir', 'Pumping Station', 'Sewage Treatment'],
    },
    {
        id: 'zone_transport',
        name: 'Silk Board Junction',
        type: 'TRANSPORT',
        description: 'Bengaluru\'s most congested traffic hotspot. Major interchange for Outer Ring Road and Electronic City flyover traffic.',
        coordinates: { lat: 12.917, lng: 77.622 },
        population: 18000,
        sensitivity: {
            aqi_risk: 0.85,
            water_risk: 0.35,
            health_risk: 0.55,
            traffic_risk: 1.00,
        },
        population_density: 'LOW',
        pop_density_norm: 0.3,
        hospital_cap_inv: 0.5,
        historical_crises: 0.6,
        infrastructure_stress: 1.0,
        socioeconomic_sensitivity: 0.6,
        critical_infrastructure: ['Highway Junction', 'Bus Terminal', 'Freight Depot'],
    },
];

// Alert thresholds per zone risk score
const ZONE_ALERT_LEVELS = {
    SAFE: { max: 0.35, color: '#22c55e', label: 'SAFE' },
    WATCH: { max: 0.55, color: '#eab308', label: 'WATCH' },
    WARNING: { max: 0.70, color: '#f97316', label: 'WARNING' },
    CRITICAL: { max: 1.00, color: '#ef4444', label: 'CRITICAL' },
};

/**
 * Get alert level object for a given zone risk score.
 * @param {number} score - 0 to 1
 */
const getAlertLevel = (score) => {
    if (score <= ZONE_ALERT_LEVELS.SAFE.max) return ZONE_ALERT_LEVELS.SAFE;
    if (score <= ZONE_ALERT_LEVELS.WATCH.max) return ZONE_ALERT_LEVELS.WATCH;
    if (score <= ZONE_ALERT_LEVELS.WARNING.max) return ZONE_ALERT_LEVELS.WARNING;
    return ZONE_ALERT_LEVELS.CRITICAL;
};

/**
 * Compute per-zone risk scores from cascade engine output.
 *
 * @param {Object} cascadeEffects - { aqi_risk, water_risk, health_risk, traffic_risk }
 * @param {number} globalRisk     - Overall city risk_score
 * @returns {Array} List of zone objects with computed risk data
 */
const computeZoneRisks = (cascadeEffects, globalRisk) => {
    const margin = parseFloat(process.env.CONFIDENCE_MARGIN || '0.15');

    return ZONES.map((zone) => {
        const { sensitivity } = zone;

        // Weighted zone risk = dot product of sensitivity × cascade effects
        const rawScore =
            (sensitivity.aqi_risk * (cascadeEffects.aqi_risk || 0)) +
            (sensitivity.water_risk * (cascadeEffects.water_risk || 0)) +
            (sensitivity.health_risk * (cascadeEffects.health_risk || 0)) +
            (sensitivity.traffic_risk * (cascadeEffects.traffic_risk || 0));

        // Normalize to 0–1 (max possible is 4.0 if all cascade = 1 and sensitivity = 1)
        const risk_score = parseFloat(Math.min(rawScore / 4, 1).toFixed(4));

        const alert = getAlertLevel(risk_score);

        // Zone-specific confidence interval (higher population = tighter interval)
        const densityFactor = { HIGH: 0.10, MEDIUM: 0.13, LOW: 0.18 }[zone.population_density] || 0.15;
        const confidence_interval = {
            lower: parseFloat(Math.max(risk_score - densityFactor * risk_score, 0).toFixed(4)),
            upper: parseFloat(Math.min(risk_score + densityFactor * risk_score, 1).toFixed(4)),
        };

        // Top contributing system in this zone
        const contributions = {
            AQI: sensitivity.aqi_risk * (cascadeEffects.aqi_risk || 0),
            WATER: sensitivity.water_risk * (cascadeEffects.water_risk || 0),
            HEALTH: sensitivity.health_risk * (cascadeEffects.health_risk || 0),
            TRAFFIC: sensitivity.traffic_risk * (cascadeEffects.traffic_risk || 0),
        };
        const primary_threat = Object.entries(contributions)
            .sort((a, b) => b[1] - a[1])[0][0];

        // ── Enterprise Vulnerability Index calculation ─────────────────────
        // VI_z = 0.30*P_z + 0.25*H_z^{-1} + 0.20*C_z + 0.15*I_z + 0.10*S_z
        const vulnerability_score = parseFloat((
            0.30 * (zone.pop_density_norm || 0) +
            0.25 * (zone.hospital_cap_inv || 0) +
            0.20 * (zone.historical_crises || 0) +
            0.15 * (zone.infrastructure_stress || 0) +
            0.10 * (zone.socioeconomic_sensitivity || 0)
        ).toFixed(4));

        let vulnerability_label = 'LOW';
        if (vulnerability_score >= 0.7) vulnerability_label = 'HIGH';
        else if (vulnerability_score >= 0.4) vulnerability_label = 'MODERATE';

        return {
            id: zone.id,
            name: zone.name,
            type: zone.type,
            description: zone.description,
            coordinates: zone.coordinates,
            population: zone.population ?? null,
            population_density: zone.population_density,
            critical_infrastructure: zone.critical_infrastructure,
            risk_score,
            confidence_interval,
            alert_level: alert.label,
            alert_color: alert.color,
            primary_threat,
            pop_density_norm: zone.pop_density_norm,
            hospital_cap_inv: zone.hospital_cap_inv,
            historical_crises: zone.historical_crises,
            infrastructure_stress: zone.infrastructure_stress,
            socioeconomic_sensitivity: zone.socioeconomic_sensitivity,
            vulnerability_score,
            vulnerability_label,
            is_affected: risk_score > ZONE_ALERT_LEVELS.SAFE.max,
            evacuation_priority: risk_score >= ZONE_ALERT_LEVELS.WARNING.max,
        };
    });
};

/**
 * Generate a 7-day zone forecast by applying a risk trend multiplier per day.
 * @param {Array}  zoneResults - Output from computeZoneRisks()
 * @param {Array}  historicalData - 7-day EnvironmentalData array (oldest→newest)
 * @returns {Object} Per-zone 7-day risk forecast
 */
const generateZoneForecast = (zoneResults, historicalData) => {
    const n = historicalData.length;
    const days = parseInt(process.env.FORECAST_DAYS || '7', 10);

    // Compute global AQI trend slope as a proxy for future risk trend
    const aqiSlope = n >= 2
        ? (historicalData[n - 1].aqi - historicalData[0].aqi) / (n - 1) / 500
        : 0;

    const today = new Date();

    return zoneResults.map((zone) => {
        const forecast = [];
        for (let i = 1; i <= days; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);

            // Project zone risk forward using trend + small zone-specific noise
            const noise = Math.sin(i * 2.1 + zone.id.length) * 0.02;
            const projected = parseFloat(
                Math.min(Math.max(zone.risk_score + aqiSlope * i + noise, 0), 1).toFixed(4)
            );
            const alert = getAlertLevel(projected);

            forecast.push({
                day: i,
                date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                risk_score: projected,
                alert_level: alert.label,
                alert_color: alert.color,
            });
        }
        return { zone_id: zone.id, zone_name: zone.name, forecast };
    });
};

module.exports = { computeZoneRisks, generateZoneForecast, ZONES, getAlertLevel };
