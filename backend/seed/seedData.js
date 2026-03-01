require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const EnvironmentalData = require('../models/EnvironmentalData');

/**
 * Seed Script – 7-Day Mock Environmental Data
 * ─────────────────────────────────────────────────────────────────────────────
 * Inserts 7 days of realistic environmental data simulating a pollution +
 * drought event in an Indian metro city.
 *
 * Run with: npm run seed
 *
 * Data trends:
 *  - AQI: rising 85→218 (pollution event escalating)
 *  - Traffic: moderate daily variation 55–88%
 *  - Water Quality: declining 82→30 (contamination event)
 *  - Industry Emission: rising with weekend dip
 *  - Temperature: seasonal variation 28–38°C
 *  - Drought Index: worsening 0.15→0.55
 */

const generateSeedData = (cityId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Simple hash-like offset based on cityId string for reproducible but different data per city
    const offset = cityId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 20;

    return [
        {
            date: new Date(new Date(today).setDate(today.getDate() - 6)),
            cityId,
            aqi: 85 + offset,
            traffic: 55 + (offset % 10),
            water_quality: 82 - (offset % 5),
            industry_emission: 52 + (offset % 8),
            temperature: 28 + (offset % 3),
            drought_index: 0.15 + (offset / 100),
        },
        {
            date: new Date(new Date(today).setDate(today.getDate() - 5)),
            cityId,
            aqi: 105 + offset,
            traffic: 62 + (offset % 10),
            water_quality: 74 - (offset % 5),
            industry_emission: 60 + (offset % 8),
            temperature: 30 + (offset % 3),
            drought_index: 0.20 + (offset / 100),
        },
        {
            date: new Date(new Date(today).setDate(today.getDate() - 4)),
            cityId,
            aqi: 130 + offset,
            traffic: 70 + (offset % 10),
            water_quality: 65 - (offset % 5),
            industry_emission: 68 + (offset % 8),
            temperature: 32 + (offset % 3),
            drought_index: 0.28 + (offset / 100),
        },
        {
            date: new Date(new Date(today).setDate(today.getDate() - 3)),
            cityId,
            aqi: 155 + offset,
            traffic: 78 + (offset % 10),
            water_quality: 54 - (offset % 5),
            industry_emission: 58 + (offset % 8),
            temperature: 35 + (offset % 3),
            drought_index: 0.35 + (offset / 100),
        },
        {
            date: new Date(new Date(today).setDate(today.getDate() - 2)),
            cityId,
            aqi: 170 + offset,
            traffic: 65 + (offset % 10),
            water_quality: 46 - (offset % 5),
            industry_emission: 55 + (offset % 8),
            temperature: 36 + (offset % 3),
            drought_index: 0.42 + (offset / 100),
        },
        {
            date: new Date(new Date(today).setDate(today.getDate() - 1)),
            cityId,
            aqi: 195 + offset,
            traffic: 82 + (offset % 10),
            water_quality: 38 - (offset % 5),
            industry_emission: 78 + (offset % 8),
            temperature: 37 + (offset % 3),
            drought_index: 0.48 + (offset / 100),
        },
        {
            date: new Date(today),
            cityId,
            aqi: 218 + offset,
            traffic: 88 + (offset % 10),
            water_quality: 30 - (offset % 5),
            industry_emission: 88 + (offset % 8),
            temperature: 38 + (offset % 3),
            drought_index: 0.55 + (offset / 100),
        },
    ];
};

const CITIES = [
    'bengaluru', 'new-delhi', 'mumbai', 'chennai', 'hyderabad',
    'kolkata', 'pune', 'ahmedabad', 'jaipur', 'lucknow'
];

const seed = async () => {
    await connectDB();

    console.log('🌱 Seeding CitySentinel database...\n');

    // Clear existing data
    const deleted = await EnvironmentalData.deleteMany({});
    console.log(`🗑️  Cleared ${deleted.deletedCount} existing records.`);

    let totalInserted = 0;
    for (const cityId of CITIES) {
        const data = generateSeedData(cityId);
        const inserted = await EnvironmentalData.insertMany(data);
        totalInserted += inserted.length;
        console.log(`✅ Inserted 7 days for ${cityId}`);
    }

    console.log(`\n🚀 Database ready with ${totalInserted} total records. Run \`npm run dev\` to start the server.\n`);
    await mongoose.disconnect();
};

seed().catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
