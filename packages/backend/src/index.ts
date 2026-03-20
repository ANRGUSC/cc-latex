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
import { setupWatcher, stopWatcher } from './watcher.js';
import { startStatusPolling } from './services/gitService.js';
import { buildFileTree } from './services/fileService.js';

// Mutable project directory — can be changed at runtime via /api/project
const projectState = {
  dir: process.env.PROJECT_DIR || path.resolve(process.cwd(), 'project'),
};

// Ensure project directory exists
if (!fs.existsSync(projectState.dir)) {
  fs.mkdirSync(projectState.dir, { recursive: true });
  console.log(`Created project directory: ${projectState.dir}`);
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

// WebSocket server — must be created before route mounts that reference it
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

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

// Browse local directories (for folder picker)
app.get('/api/browse', (req, res) => {
  const dir = typeof req.query.dir === 'string' ? req.query.dir : '';

  // No dir → list drive roots on Windows, or '/' on Unix
  if (!dir) {
    if (process.platform === 'win32') {
      try {
        // List available drive letters
        const drives: { name: string; path: string }[] = [];
        for (let code = 65; code <= 90; code++) {
          const letter = String.fromCharCode(code);
          const root = `${letter}:\\`;
          if (fs.existsSync(root)) {
            drives.push({ name: `${letter}:`, path: root });
          }
        }
        res.json({ path: '', parent: null, entries: drives, sep: path.sep });
      } catch (err) {
        res.status(500).json({ error: 'Failed to list drives' });
      }
      return;
    }
    // Unix — start at /
    return browseDir('/', res);
  }

  const resolved = path.resolve(dir);
  browseDir(resolved, res);

  function browseDir(dirPath: string, r: typeof res) {
    try {
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        r.status(400).json({ error: 'Not a directory' });
        return;
      }
      const entries: { name: string; path: string }[] = [];
      for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '$Recycle.Bin' || entry.name === 'System Volume Information') continue;
        entries.push({ name: entry.name, path: path.join(dirPath, entry.name) });
      }
      entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      const parent = path.dirname(dirPath);
      r.json({
        path: dirPath,
        parent: parent === dirPath ? null : parent,
        entries,
        sep: path.sep,
      });
    } catch {
      r.status(500).json({ error: 'Cannot read directory' });
    }
  }
});

// Project directory management
app.get('/api/project', (_req, res) => {
  res.json({
    dir: projectState.dir,
    name: path.basename(projectState.dir),
  });
});

app.post('/api/project', (req, res) => {
  const { dir } = req.body;
  if (!dir || typeof dir !== 'string') {
    res.status(400).json({ error: 'dir is required' });
    return;
  }

  const resolved = path.resolve(dir);

  // Create if it doesn't exist
  if (!fs.existsSync(resolved)) {
    try {
      fs.mkdirSync(resolved, { recursive: true });
    } catch (err) {
      res.status(400).json({ error: `Cannot create directory: ${err instanceof Error ? err.message : err}` });
      return;
    }
  }

  // Switch project dir
  projectState.dir = resolved;
  console.log(`[PROJECT] Switched to: ${resolved}`);

  // Re-setup file watcher
  stopWatcher();
  setupWatcher(projectState.dir, wss);

  // Re-start git polling
  startStatusPolling(projectState.dir, wss);

  // Send back updated file tree
  try {
    const tree = buildFileTree(projectState.dir);
    const msg = JSON.stringify({ type: 'file:tree-updated', data: tree });
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(msg);
    }
  } catch { /* ignore */ }

  res.json({
    success: true,
    dir: resolved,
    name: path.basename(resolved),
  });
});

// Mount routes — routers use projectState.dir via getter
app.use('/api/files', filesRouter(projectState));
app.use('/api', compileRouter(projectState, wss));
app.use('/api', chatRouter(projectState));
app.use('/api', gitRouter(projectState, wss));

// File watcher
setupWatcher(projectState.dir, wss);

// Start git status polling
startStatusPolling(projectState.dir, wss);

// Start server
const PORT = 3100;
server.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
  console.log(`PROJECT_DIR: ${projectState.dir}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`Claude CLI: ${claudeCliAvailable ? 'available' : 'not found'}`);
});

export { wss, projectState };
