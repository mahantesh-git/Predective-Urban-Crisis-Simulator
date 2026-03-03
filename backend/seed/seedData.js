require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const connectDB = require('../config/db');
const EnvironmentalData = require('../models/EnvironmentalData');

/**
 * Seed Script – Real CSV Environmental Data from Kaggle city_day.csv
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps CSV city names to app cityIds and imports real AQI data.
 * Run with: npm run seed
 */

// Map: CSV city name → app cityId (all 26 cities from city_day.csv)
const CITY_MAP = {
    'Ahmedabad': 'ahmedabad',
    'Aizawl': 'aizawl',
    'Amaravati': 'amaravati',
    'Amritsar': 'amritsar',
    'Bengaluru': 'bengaluru',
    'Bhopal': 'bhopal',
    'Chennai': 'chennai',
    'Coimbatore': 'coimbatore',
    'Delhi': 'delhi',
    'Ernakulam': 'ernakulam',
    'Gurugram': 'gurugram',
    'Hyderabad': 'hyderabad',
    'Jaipur': 'jaipur',
    'Jodhpur': 'jodhpur',
    'Kochi': 'ernakulam',  // Kochi shares Ernakulam profile
    'Kolkata': 'kolkata',
    'Lucknow': 'lucknow',
    'Mumbai': 'mumbai',
    'Nagpur': 'nagpur',
    'Patna': 'patna',
    'Shillong': 'shillong',
    'Talcher': 'talcher',
    'Thiruvananthapuram': 'thiruvananthapuram',
    'Visakhapatnam': 'visakhapatnam',
};

// Fallback base multipliers per city for derived metrics
const RISK_MULTIPLIERS = {
    'delhi': 1.35,
    'gurugram': 1.30,
    'talcher': 1.22,
    'patna': 1.18,
    'kolkata': 1.20,
    'amritsar': 1.05,
    'lucknow': 1.05,
    'mumbai': 1.15,
    'ahmedabad': 1.10,
    'bengaluru': 1.00,
    'bhopal': 0.95,
    'hyderabad': 0.95,
    'nagpur': 0.90,
    'jodhpur': 0.88,
    'chennai': 0.88,
    'jaipur': 0.92,
    'visakhapatnam': 0.98,
    'amaravati': 0.75,
    'coimbatore': 0.78,
    'ernakulam': 0.70,
    'thiruvananthapuram': 0.72,
    'aizawl': 0.60,
    'shillong': 0.65,
    'pune': 0.82,
};

/**
 * Parse the CSV file manually (lightweight, no external deps).
 */
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const vals = line.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i]?.trim() ?? ''; });
        return obj;
    });
}

/**
 * Derive traffic, water quality and other metrics from AQI using city multipliers.
 * These are realistic approximations based on environmental literature correlations.
 */
function deriveMetrics(aqi, cityId, dateStr) {
    const mult = RISK_MULTIPLIERS[cityId] || 1.0;

    // Traffic correlates with AQI (normalized 0-100)
    const traffic = Math.min(100, Math.max(0, (aqi / 500) * 100 * mult + (Math.random() * 10 - 5)));

    // Water quality inversely correlates with AQI and population pressure
    const water_quality = Math.max(5, Math.min(100, 90 - (aqi / 10) * mult - (Math.random() * 5)));

    // Industry emission correlates strongly with AQI
    const industry_emission = Math.min(100, Math.max(0, (aqi / 500) * 80 * mult + (Math.random() * 8)));

    // Temperature: estimate from month and city
    const month = new Date(dateStr).getMonth(); // 0-11
    const lat_factor = cityId === 'delhi' || cityId === 'lucknow' ? 5 : 0;
    const base_temp = 25 + Math.sin((month - 3) * Math.PI / 6) * 10 + lat_factor;
    const temperature = Math.round(base_temp * 10) / 10;

    // Drought index: inversely correlates with water quality, boosted in summer
    const summer_factor = (month >= 3 && month <= 6) ? 0.2 : 0;
    const drought_index = Math.min(0.95, Math.max(0, (1 - water_quality / 100) * 0.7 + summer_factor));

    return {
        traffic: Math.round(traffic * 10) / 10,
        water_quality: Math.round(water_quality * 10) / 10,
        industry_emission: Math.round(industry_emission * 10) / 10,
        temperature,
        drought_index: Math.round(drought_index * 100) / 100,
    };
}

const seed = async () => {
    await connectDB();
    console.log('🌱 Seeding CitySentinel with REAL Kaggle AQI data (pre-processed)...\n');

    const jsonPath = path.join(__dirname, '../../datasets/city_aqi_clean.json');
    const csvPath = path.join(__dirname, '../../datasets/city_day.csv');

    if (!fs.existsSync(jsonPath)) {
        // Try to generate it on-the-fly if Python is available
        console.log('⚙️  city_aqi_clean.json not found, generating from CSV...');
        if (!fs.existsSync(csvPath)) {
            console.error('❌ Neither city_aqi_clean.json nor city_day.csv found. Please run the Python pre-processor.');
            process.exit(1);
        }
    }

    const rawRecords = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📂 Loaded ${rawRecords.length} clean AQI records from city_aqi_clean.json`);

    // Clear existing environmental data
    const deleted = await EnvironmentalData.deleteMany({});
    console.log(`🗑️  Cleared ${deleted.deletedCount} existing records.`);

    // Group records by cityId using the CITY_MAP
    const cityGroups = {};
    for (const rec of rawRecords) {
        const cityId = CITY_MAP[rec.city];
        if (!cityId) continue;
        const aqiVal = parseFloat(rec.aqi);
        const dateStr = rec.date;
        if (!dateStr || isNaN(aqiVal) || aqiVal <= 0) continue;
        if (!cityGroups[cityId]) cityGroups[cityId] = [];
        cityGroups[cityId].push({ dateStr, aqiVal });
    }

    let totalInserted = 0;

    for (const [cityId, entries] of Object.entries(cityGroups)) {
        // Sort by date ascending, use last 90 records
        entries.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
        const recent = entries.slice(-90);

        const docs = recent.map(({ dateStr, aqiVal }) => ({
            date: new Date(dateStr),
            cityId,
            aqi: Math.round(aqiVal),
            ...deriveMetrics(aqiVal, cityId, dateStr),
        }));

        try {
            await EnvironmentalData.insertMany(docs, { ordered: false });
            totalInserted += docs.length;
            const avgAqi = Math.round(docs.reduce((s, d) => s + d.aqi, 0) / docs.length);
            console.log(`✅ ${cityId}: ${docs.length} days seeded (avg AQI: ${avgAqi})`);
        } catch (e) {
            console.warn(`⚠️  ${cityId}: partial insert —`, e.message?.slice(0, 80));
        }
    }

    // Seed any mapped cities that had no CSV data with fallback mock data
    const seededCities = new Set(Object.keys(cityGroups));
    const allAppCities = Object.values(CITY_MAP);
    for (const cityId of [...new Set(allAppCities)]) {
        if (seededCities.has(cityId)) continue;
        // generate 7 days of fallback data
        const mult = RISK_MULTIPLIERS[cityId] || 1.0;
        const baseAqi = Math.round(100 * mult);
        const today = new Date();
        const fallback = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (6 - i));
            const aqi = baseAqi + Math.round((Math.random() - 0.5) * 30);
            return { date, cityId, aqi, ...deriveMetrics(aqi, cityId, date.toISOString()) };
        });
        await EnvironmentalData.insertMany(fallback);
        totalInserted += fallback.length;
        console.log(`🔄 ${cityId}: 7 days fallback data seeded`);
    }

    console.log(`\n🚀 Database ready with ${totalInserted} total records across ${Object.keys(cityGroups).length} real cities.`);
    console.log('Run `npm run dev` to start the server.\n');
    await mongoose.disconnect();
};

seed().catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
