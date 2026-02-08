import { Router, type Request, type Response } from 'express';
import { buildFileTree, readFile, writeFile } from '../services/fileService.js';

// Express 5 wildcard params come as arrays — join them into a path string
function extractPath(req: Request): string | null {
  const param = (req.params as Record<string, unknown>).path;
  if (Array.isArray(param)) {
    return param.join('/');
  }
  if (typeof param === 'string') {
    return param;
  }
  return null;
}

export function filesRouter(projectDir: string): Router {
  const router = Router();

  // GET / — return file tree
  router.get('/', (_req: Request, res: Response) => {
    try {
      const tree = buildFileTree(projectDir);
      res.json(tree);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read file tree';
      res.status(500).json({ error: message });
    }
  });

  // GET /*path — read a specific file
  router.get('/*path', (req: Request, res: Response) => {
    const relativePath = extractPath(req);
    if (!relativePath) {
      res.status(400).json({ error: 'No file path specified' });
      return;
    }

    try {
      const content = readFile(projectDir, relativePath);
      res.json({ content });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Path traversal detected') {
          res.status(400).json({ error: 'Invalid file path' });
          return;
        }
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          res.status(404).json({ error: 'File not found' });
          return;
        }
      }
      const message = err instanceof Error ? err.message : 'Failed to read file';
      res.status(500).json({ error: message });
    }
  });

  // PUT /*path — write a specific file
  router.put('/*path', (req: Request, res: Response) => {
    const relativePath = extractPath(req);
    if (!relativePath) {
      res.status(400).json({ error: 'No file path specified' });
      return;
    }

    const { content } = req.body;
    if (typeof content !== 'string') {
      res.status(400).json({ error: 'Request body must include "content" as a string' });
      return;
    }

    try {
      writeFile(projectDir, relativePath, content);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof Error && err.message === 'Path traversal detected') {
        res.status(400).json({ error: 'Invalid file path' });
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to write file';
      res.status(500).json({ error: message });
    }
  });

  return router;
}
