import { Router, type Request, type Response } from 'express';
import type { WebSocketServer } from 'ws';
import {
  findGit,
  isGhAvailable,
  getRepoInfo,
  cloneRepo,
  setRemote,
  commitAndPush,
  pull,
} from '../services/gitService.js';

export function gitRouter(projectState: { dir: string }, wss: WebSocketServer): Router {
  const router = Router();

  // Broadcast git status to all WebSocket clients
  async function broadcastStatus() {
    try {
      const info = await getRepoInfo(projectState.dir);
      const msg = JSON.stringify({ type: 'git:status-updated', data: info });
      for (const client of wss.clients) {
        if (client.readyState === 1) client.send(msg);
      }
    } catch { /* ignore */ }
  }

  // GET /git/check — are git and gh available?
  router.get('/git/check', (_req: Request, res: Response) => {
    res.json({ gitAvailable: findGit(), ghAvailable: isGhAvailable() });
  });

  // GET /git/status — current repo info
  router.get('/git/status', async (_req: Request, res: Response) => {
    try {
      const info = await getRepoInfo(projectState.dir);
      res.json(info);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get git status';
      res.status(500).json({ error: msg });
    }
  });

  // POST /git/clone — initialize or connect a GitHub repo
  router.post('/git/clone', async (req: Request, res: Response) => {
    const { owner, repo, branch } = req.body;
    if (!owner || !repo) {
      res.status(400).json({ success: false, message: 'owner and repo required' });
      return;
    }
    try {
      await cloneRepo(projectState.dir, owner, repo, branch);
      const status = await getRepoInfo(projectState.dir);
      broadcastStatus();
      res.json({ success: true, message: `Connected to ${owner}/${repo}`, status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Clone failed';
      res.json({ success: false, message: msg });
    }
  });

  // POST /git/remote — set or change origin remote
  router.post('/git/remote', async (req: Request, res: Response) => {
    const { owner, repo } = req.body;
    if (!owner || !repo) {
      res.status(400).json({ success: false, message: 'owner and repo required' });
      return;
    }
    try {
      await setRemote(projectState.dir, owner, repo);
      const status = await getRepoInfo(projectState.dir);
      broadcastStatus();
      res.json({ success: true, message: `Remote set to ${owner}/${repo}`, status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to set remote';
      res.json({ success: false, message: msg });
    }
  });

  // POST /git/push — commit all changes and push
  router.post('/git/push', async (req: Request, res: Response) => {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ success: false, message: 'Commit message required' });
      return;
    }
    try {
      await commitAndPush(projectState.dir, message);
      const status = await getRepoInfo(projectState.dir);
      broadcastStatus();
      res.json({ success: true, message: 'Pushed successfully', status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Push failed';
      res.json({ success: false, message: msg });
    }
  });

  // POST /git/pull — pull latest from remote
  router.post('/git/pull', async (_req: Request, res: Response) => {
    try {
      await pull(projectState.dir);
      const status = await getRepoInfo(projectState.dir);
      broadcastStatus();
      res.json({ success: true, message: 'Pulled successfully', status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Pull failed';
      res.json({ success: false, message: msg });
    }
  });

  return router;
}
