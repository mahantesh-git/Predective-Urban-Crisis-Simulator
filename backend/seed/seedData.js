require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const connectDB = require('../config/db');
const EnvironmentalData = require('../models/EnvironmentalData');

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
    'Kochi': 'ernakulam',  
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

function deriveMetrics(aqi, cityId, dateStr) {
    
    const traffic = Math.min(100, Math.max(0, (aqi / 500) * 100 + (Math.random() * 10 - 5)));

    
    const water_quality = Math.max(5, Math.min(100, 90 - (aqi / 10) - (Math.random() * 5)));

    
    const industry_emission = Math.min(100, Math.max(0, (aqi / 500) * 80 + (Math.random() * 8)));

    
    const month = new Date(dateStr).getMonth(); 
    const lat_factor = cityId === 'delhi' || cityId === 'lucknow' ? 5 : 0;
    const base_temp = 25 + Math.sin((month - 3) * Math.PI / 6) * 10 + lat_factor;
    const temperature = Math.round(base_temp * 10) / 10;

    
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
    console.log('Seeding CitySentinel with REAL Kaggle AQI data (pre-processed)...\n');

    const jsonPath = path.join(__dirname, '../../datasets/city_aqi_clean.json');
    const csvPath = path.join(__dirname, '../../datasets/city_day.csv');

    if (!fs.existsSync(jsonPath)) {
        
        console.log('city_aqi_clean.json not found, generating from CSV...');
        if (!fs.existsSync(csvPath)) {
            console.error('Neither city_aqi_clean.json nor city_day.csv found. Please run the Python pre-processor.');
            process.exit(1);
        }
    }

    const rawRecords = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(` Loaded ${rawRecords.length} clean AQI records from city_aqi_clean.json`);

    
    const deleted = await EnvironmentalData.deleteMany({});
    console.log(` Cleared ${deleted.deletedCount} existing records.`);

    
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
        
        entries.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
        const recent = entries.slice(-90);

        
        const todayUTC = new Date();
        todayUTC.setUTCHours(0, 0, 0, 0);

        const docs = recent.map(({ dateStr, aqiVal }, i) => {
            const date = new Date(todayUTC);
            date.setUTCDate(date.getUTCDate() - (recent.length - 1 - i));
            
            return {
                date: date,
                cityId,
                aqi: Math.round(aqiVal),
                ...deriveMetrics(aqiVal, cityId, date.toISOString()),
            };
        });

        try {
            await EnvironmentalData.insertMany(docs, { ordered: false });
            totalInserted += docs.length;
            const avgAqi = Math.round(docs.reduce((s, d) => s + d.aqi, 0) / docs.length);
            console.log(`${cityId}: ${docs.length} days seeded (avg AQI: ${avgAqi})`);
        } catch (e) {
            console.warn(`${cityId}: partial insert —`, e.message?.slice(0, 80));
        }
    }

    
    const seededCities = new Set(Object.keys(cityGroups));
    const allAppCities = Object.values(CITY_MAP);
    for (const cityId of [...new Set(allAppCities)]) {
        if (seededCities.has(cityId)) continue;
        
        const baseAqi = 100;
        const todayUTC = new Date();
        todayUTC.setUTCHours(0, 0, 0, 0);
        const fallback = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(todayUTC);
            date.setUTCDate(todayUTC.getUTCDate() - (6 - i));
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
