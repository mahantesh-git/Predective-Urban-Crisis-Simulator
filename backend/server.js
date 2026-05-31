require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter, simulationLimiter } = require('./middleware/rateLimiter');
const { initWebSocket } = require('./services/websocketService');

const statusRoute = require('./routes/status');
const simulateRoute = require('./routes/simulate');
const forecastRoute = require('./routes/forecast');
const recommendationsRoute = require('./routes/recommendations');
const zonesRoute = require('./routes/zones');
const historyRoute = require('./routes/history');

connectDB();

const app = express();

app.use(helmet());
app.use(cors());
app.use(globalLimiter);        

app.use(express.json());
app.use(morgan('dev'));

app.get('/ping', (req, res) => res.json({
    ok: true,
    service: 'CitySentinel AI Engine',
    timestamp: new Date().toISOString(),
    ml_mode: process.env.ML_ENABLED === 'true' ? 'ml_service' : 'mock',
}));

app.use('/status', statusRoute);
app.use('/simulate', simulationLimiter, simulateRoute); 
app.use('/forecast', forecastRoute);
app.use('/recommendations', recommendationsRoute);
app.use('/zones', zonesRoute);
app.use('/history', historyRoute);

app.use((req, res) => {
    res.status(404).json({
        success: false, 
        error: `Route not found: ${req.method} ${req.originalUrl}`,
        available_routes: [
            'GET  /ping',
            'GET  /status',
            'POST /simulate',
            'POST /simulate/compare',
            'GET  /simulate/history',
            'GET  /forecast',
            'GET  /recommendations',
            'GET  /zones',
            'GET  /zones/:id',
            'GET  /history',
        ],
    });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initWebSocket(server, app);

const { startSimulator } = require('./services/sensorSimulator');
const SIM_INTERVAL = parseInt(process.env.SIMULATOR_INTERVAL_MS || '120000', 10);
startSimulator(app, SIM_INTERVAL);

server.listen(PORT, () => {
    console.log(`\n CitySentinel AI Engine  →  http://localhost:${PORT}`);
    console.log(` WebSocket Feed          →  ws://localhost:${PORT}`);
    console.log(`ML Mode: ${process.env.ML_ENABLED === 'true' ? ' ML Service' : 'Mock Forecast'}`);
    console.log(`\n Endpoints:`);
    console.log(`   GET  /status`);
    console.log(`   POST /simulate          (rate: 30/15min)`);
    console.log(`   POST /simulate/compare`);
    console.log(`   GET  /forecast`);
    console.log(`   GET  /recommendations`);
    console.log(`   GET  /zones`);
    console.log(`   GET  /history\n`);
});

module.exports = app;
