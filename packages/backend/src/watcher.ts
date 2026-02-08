import chokidar from 'chokidar';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import type { WSMessage } from 'cc-latex-shared';
import { buildFileTree } from './services/fileService.js';
import { broadcast } from './websocket.js';

const IGNORED_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/*.aux',
  '**/*.log',
  '**/*.synctex.gz',
  '**/*.fls',
  '**/*.fdb_latexmk',
];

export function setupWatcher(projectDir: string, wss: WebSocketServer): void {
  const watcher = chokidar.watch(projectDir, {
    ignored: IGNORED_PATTERNS,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 50,
    },
  });

  function toRelativePath(absolutePath: string): string {
    return path.relative(projectDir, absolutePath).replace(/\\/g, '/');
  }

  function handleFileEvent(event: 'add' | 'change' | 'unlink', filePath: string): void {
    const relativePath = toRelativePath(filePath);
    console.log(`[Watcher] ${event}: ${relativePath}`);

    const changeMsg: WSMessage = {
      type: 'file:changed',
      data: { path: relativePath, event },
    };
    broadcast(wss, changeMsg);

    // For structural changes, also send updated tree
    if (event === 'add' || event === 'unlink') {
      const tree = buildFileTree(projectDir);
      const treeMsg: WSMessage = {
        type: 'file:tree-updated',
        data: tree,
      };
      broadcast(wss, treeMsg);
    }
  }

  function handleDirEvent(event: 'addDir' | 'unlinkDir', dirPath: string): void {
    const relativePath = toRelativePath(dirPath);
    console.log(`[Watcher] ${event}: ${relativePath}`);

    const tree = buildFileTree(projectDir);
    const treeMsg: WSMessage = {
      type: 'file:tree-updated',
      data: tree,
    };
    broadcast(wss, treeMsg);
  }

  watcher.on('add', (filePath) => handleFileEvent('add', filePath));
  watcher.on('change', (filePath) => handleFileEvent('change', filePath));
  watcher.on('unlink', (filePath) => handleFileEvent('unlink', filePath));
  watcher.on('addDir', (dirPath) => handleDirEvent('addDir', dirPath));
  watcher.on('unlinkDir', (dirPath) => handleDirEvent('unlinkDir', dirPath));

  watcher.on('error', (err) => {
    console.error('[Watcher] Error:', err.message);
  });

  console.log(`[Watcher] Watching ${projectDir} for changes`);
}
