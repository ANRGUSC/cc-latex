import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { WebSocketServer } from 'ws';
import { filesRouter } from './routes/files.js';
import { compileRouter } from './routes/compile.js';
import { chatRouter } from './routes/chat.js';
import { gitRouter } from './routes/git.js';
import { setupWebSocket } from './websocket.js';
import { setupWatcher } from './watcher.js';
import { startStatusPolling } from './services/gitService.js';

const PROJECT_DIR = process.env.PROJECT_DIR || path.resolve(process.cwd(), 'project');

// Ensure project directory exists
if (!fs.existsSync(PROJECT_DIR)) {
  fs.mkdirSync(PROJECT_DIR, { recursive: true });
  console.log(`Created project directory: ${PROJECT_DIR}`);
}

// Probe Claude CLI availability once at startup
let claudeCliAvailable = false;
try {
  execSync('claude --version', { stdio: 'ignore' });
  claudeCliAvailable = true;
} catch {
  console.log('[INFO] claude CLI not found — API key mode recommended');
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

// Status endpoint
app.get('/api/status', (_req, res) => {
  res.json({ claudeCliAvailable });
});

// Mount routes
app.use('/api/files', filesRouter(PROJECT_DIR));

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// Mount compile, chat, and git routes
app.use('/api', compileRouter(PROJECT_DIR, wss));
app.use('/api', chatRouter(PROJECT_DIR));
app.use('/api', gitRouter(PROJECT_DIR, wss));

// File watcher
setupWatcher(PROJECT_DIR, wss);

// Start git status polling
startStatusPolling(PROJECT_DIR, wss);

// Start server
const PORT = 3100;
server.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
  console.log(`PROJECT_DIR: ${PROJECT_DIR}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`Claude CLI: ${claudeCliAvailable ? 'available' : 'not found'}`);
});

export { wss };
