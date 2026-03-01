/**
 * Geo-Spatial Risk Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Translates zone-based risk metrics into GeoJSON format.
 * Enables high-fidelity temporal visualization of risk propagation.
 */

const { ZONES } = require('./zoneEngine');

/**
 * Generate a simple square polygon around a point.
 * @param {number} lat 
 * @param {number} lng 
 * @param {number} size Degrees offset
 */
const generatePolygon = (lat, lng, size = 0.01) => {
    return [
        [lng - size, lat - size],
        [lng + size, lat - size],
        [lng + size, lat + size],
        [lng - size, lat + size],
        [lng - size, lat - size]
    ];
};

/**
 * Convert Zone Risk Results to a GeoJSON FeatureCollection.
 *
 * @param {Array} zoneResults - Output from zoneEngine.computeZoneRisks()
 * @returns {Object} GeoJSON FeatureCollection
 */
const generateGeoJSON = (zoneResults) => {
    const currentZONES = ZONES;

    const features = zoneResults.map(zone => {
        // Find matching zone to get coordinates
        const sourceZone = currentZONES.find(z => z.id === zone.id);
        const coords = sourceZone ? sourceZone.coordinates : { lat: 12.97, lng: 77.59 };

        return {
            type: 'Feature',
            id: zone.id,
            geometry: {
                type: 'Polygon',
                coordinates: [generatePolygon(coords.lat, coords.lng, 0.015)]
            },
            properties: {
                name: zone.name,
                type: zone.type,
                risk_score: zone.risk_score,
                alert_level: zone.alert_level,
                primary_threat: zone.primary_threat,
                population: zone.population,
                evacuation_priority: zone.evacuation_priority,
                color: zone.alert_color
            }
        };
    });

    return {
        type: 'FeatureCollection',
        features
    };
};

module.exports = { generateGeoJSON };
