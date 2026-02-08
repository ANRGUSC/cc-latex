import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { WebSocketServer } from 'ws';
import { filesRouter } from './routes/files.js';
import { compileRouter } from './routes/compile.js';
import { chatRouter } from './routes/chat.js';
import { setupWebSocket } from './websocket.js';
import { setupWatcher } from './watcher.js';

const PROJECT_DIR = process.env.PROJECT_DIR || path.resolve(process.cwd(), 'project');

// Ensure project directory exists
if (!fs.existsSync(PROJECT_DIR)) {
  fs.mkdirSync(PROJECT_DIR, { recursive: true });
  console.log(`Created project directory: ${PROJECT_DIR}`);
}

const app = express();
const server = createServer(app);

// CORS — allow frontend dev server
app.use(cors({
  origin: ['http://localhost:5210', 'http://localhost:5200', 'http://localhost:5173'],
  credentials: true,
}));

// JSON body parser with 10mb limit
app.use(express.json({ limit: '10mb' }));

// Mount routes
app.use('/api/files', filesRouter(PROJECT_DIR));

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// Mount compile and chat routes (they need wss or projectDir)
app.use('/api', compileRouter(PROJECT_DIR, wss));
app.use('/api', chatRouter(PROJECT_DIR));

// File watcher
setupWatcher(PROJECT_DIR, wss);

// Start server
const PORT = 3100;
server.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
  console.log(`PROJECT_DIR: ${PROJECT_DIR}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});

export { wss };
