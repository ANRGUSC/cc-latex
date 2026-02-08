import { WebSocketServer, WebSocket } from 'ws';
import type { WSMessage } from 'cc-latex-shared';

export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws, req) => {
    const remoteAddr = req.socket.remoteAddress ?? 'unknown';
    console.log(`[WS] Client connected from ${remoteAddr}`);

    ws.on('close', () => {
      console.log(`[WS] Client disconnected from ${remoteAddr}`);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Error from ${remoteAddr}:`, err.message);
    });
  });
}

export function broadcast(wss: WebSocketServer, message: WSMessage): void {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
