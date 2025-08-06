// WebSocket broadcast utility

/**
 * Broadcast data to all connected WebSocket clients
 * @param {WebSocket.Server} wss - WebSocket server instance
 * @param {Object} data - Data to broadcast
 */
function broadcast(wss, data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(JSON.stringify(data));
    }
  });
}

module.exports = {
  broadcast,
};
