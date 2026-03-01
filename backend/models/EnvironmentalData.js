const mongoose = require('mongoose');

/**
 * EnvironmentalData – stores raw sensor/input readings per day.
 * Also accepts real-time single readings via POST /data.
 */
const EnvironmentalDataSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: true,
        },
        cityId: {
            type: String,
            required: true,
            index: true,
        },
        aqi: {
            type: Number,
            required: true,
            min: 0,
            max: 500,
        },
        traffic: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        water_quality: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        industry_emission: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        temperature: {
            type: Number,
            min: -10,
            max: 60,
            default: 30,
        },
        drought_index: {
            type: Number,
            min: 0,
            max: 1,
            default: 0,
        },
        // Optional: source label (seed / api / sensor / manual)
        source: {
            type: String,
            enum: ['seed', 'api', 'sensor', 'manual'],
            default: 'api',
        },
    },
    { timestamps: true }
);

EnvironmentalDataSchema.index({ date: 1, cityId: 1 }, { unique: true });

module.exports = mongoose.model('EnvironmentalData', EnvironmentalDataSchema);
