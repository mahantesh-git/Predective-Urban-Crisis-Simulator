const { WebSocketServer } = require('ws');

const initWebSocket = (httpServer, app) => {
    const wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws, req) => {
        console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);

        ws.send(JSON.stringify({
            type: 'CONNECTED',
            message: 'CitySentinel AI real-time feed connected.',
            timestamp: new Date().toISOString(),
        }));

        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw);
                if (msg.type === 'PONG') return; 
                console.log('WS message received:', msg);
            } catch (error) {console.log(error) }
        });

        ws.on('close', () => {
            console.log('WebSocket client disconnected.');
        });

        ws.on('error', (err) => {
            console.error('WebSocket error:', err.message);
        });
    });

    const pingInterval = setInterval(() => {
        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() }));
            }
        });
    }, 30000);

    wss.on('close', () => clearInterval(pingInterval));
    app.set('wss', wss);

    console.log('WebSocket server initialized on same port.');
    return wss;
};

module.exports = { initWebSocket };
