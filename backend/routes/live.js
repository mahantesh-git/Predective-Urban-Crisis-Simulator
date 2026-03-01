const express = require('express');
const router = express.Router();
const axios = require('axios');
const EnvironmentalData = require('../models/EnvironmentalData');

const LAT = 12.9716;
const LON = 77.5946;

router.get('/sync', async (req, res, next) => {
    try {
        console.log('🔄 Syncing real-time data from Open-Meteo API...');

        // 1. Fetch Live Weather Data
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,precipitation&timezone=Asia%2FKolkata`;
        const weatherRes = await axios.get(weatherUrl);
        const currentTemp = weatherRes.data.current.temperature_2m;
        const currentHumidity = weatherRes.data.current.relative_humidity_2m;
        // Optionally precipitation but not tightly mapped to EnvironmentalData

        // 2. Fetch Live Air Quality Data
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}&current=us_aqi&timezone=Asia%2FKolkata`;
        const aqiRes = await axios.get(aqiUrl);
        const currentAqi = aqiRes.data.current.us_aqi;

        // 3. Derived/Synthetic Values for Demo
        // Since we don't have a live "traffic" or "water quality" API, we derive them realistically based on AQI to match the training distributions
        let base_water = 80 - (currentAqi / 20) + (Math.random() * 5 - 2.5);
        let traffic_density = currentAqi * 1.5 + (Math.random() * 20 - 10);

        // Convert traffic density (0-1000) to a 0-100 scale for the DB
        let db_traffic = (traffic_density / 1000) * 100;

        let industry_emission = (currentAqi / 500) * 100 + (Math.random() * 10 - 5);

        // Normalize ranges
        base_water = Math.min(Math.max(base_water, 0), 100);
        db_traffic = Math.min(Math.max(db_traffic, 0), 100);
        industry_emission = Math.min(Math.max(industry_emission, 0), 100);
        const drought_index = 1 - (base_water / 100);

        // 4. Upsert today's data record in DB
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const realTimeData = {
            date: today,
            aqi: Math.min(Math.max(currentAqi, 0), 500),
            traffic: parseFloat(db_traffic.toFixed(2)),
            water_quality: parseFloat(base_water.toFixed(2)),
            industry_emission: parseFloat(industry_emission.toFixed(2)),
            temperature: currentTemp,
            drought_index: parseFloat(drought_index.toFixed(2)),
            source: 'api'
        };

        const updatedRecord = await EnvironmentalData.findOneAndUpdate(
            { date: today },
            { $set: realTimeData },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            message: 'Real-time data synchronized successfully',
            data: updatedRecord,
            raw_sources: {
                weather: weatherRes.data.current,
                aqi: aqiRes.data.current
            }
        });

    } catch (err) {
        console.error('❌ Live Sync error:', err.message);
        next(err);
    }
});

module.exports = router;
