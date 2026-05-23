const EnvironmentalData = require('../models/EnvironmentalData');
const { computeRisk } = require('../engine/cascadeEngine');

const startSimulator = (app, intervalMs = 60000) => {
    console.log(` Sensor Simulator: Started (Interval: ${intervalMs / 1000}s)`);

    setInterval(async () => {
        try {
            
            const cities = await EnvironmentalData.distinct('cityId');
            if (!cities.length) return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (const cityId of cities) {
                const latest = await EnvironmentalData.findOne({ cityId }).sort({ date: -1 });
                if (!latest) continue;

                const vary = (val, max) => {
                    const change = (Math.random() - 0.5) * 0.05 * max;
                    return Math.min(Math.max(val + change, 0), max);
                };

                const newData = {
                    aqi: vary(latest.aqi, 500),
                    traffic: vary(latest.traffic, 100),
                    water_quality: vary(latest.water_quality, 100),
                    industry_emission: vary(latest.industry_emission, 100),
                    temperature: 25 + Math.random() * 15,
                    source: 'sensor',
                    cityId,
                    date: today
                };

                const record = await EnvironmentalData.findOneAndUpdate(
                    { date: today, cityId },
                    newData,
                    { upsert: true, new: true }
                );

                const wss = app.get('wss');
                if (wss) {
                    const alert = {
                        type: 'RISK_UPDATE',
                        cityId,
                        timestamp: new Date().toISOString(),
                        risk_score: computeRisk(record, 0).risk_score,
                        data: {
                            aqi: record.aqi,
                            traffic: record.traffic,
                            water_quality: record.water_quality,
                            industry_emission: record.industry_emission
                        }
                    };
                    wss.clients.forEach(client => {
                        if (client.readyState === 1) client.send(JSON.stringify(alert));
                    });
                }
            }
        } catch (err) {
            console.error(' Simulator Error:', err.message);
        }
    }, intervalMs);

};

const getCrisisLevel = (score) => {
    if (score < 0.30) return 'LOW';
    if (score < 0.55) return 'MODERATE';
    if (score < 0.75) return 'HIGH';
    return 'CRITICAL';
};

module.exports = { startSimulator };
