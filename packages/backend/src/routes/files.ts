import { Router, type Request, type Response } from 'express';
import {
  buildFileTree,
  readFile,
  writeFile,
  deleteFile,
  createDirectory,
  renameFile,
  resolveAndGuard,
} from '../services/fileService.js';

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

function handlePathError(err: unknown, res: Response): void {
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
  const message = err instanceof Error ? err.message : 'Operation failed';
  res.status(500).json({ error: message });
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

  // POST / — create file or directory
  router.post('/', (req: Request, res: Response) => {
    const { path: filePath, type, content } = req.body;
    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({ error: 'path is required' });
      return;
    }

    try {
      if (type === 'directory') {
        createDirectory(projectDir, filePath);
      } else {
        writeFile(projectDir, filePath, content || '');
      }
      res.json({ success: true });
    } catch (err) {
      handlePathError(err, res);
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
      handlePathError(err, res);
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
      handlePathError(err, res);
    }
  });

  // DELETE /*path — delete file or directory
  router.delete('/*path', (req: Request, res: Response) => {
    const relativePath = extractPath(req);
    if (!relativePath) {
      res.status(400).json({ error: 'No file path specified' });
      return;
    }

    try {
      deleteFile(projectDir, relativePath);
      res.json({ success: true });
    } catch (err) {
      handlePathError(err, res);
    }
  });

  // PATCH /*path — rename file or directory
  router.patch('/*path', (req: Request, res: Response) => {
    const relativePath = extractPath(req);
    if (!relativePath) {
      res.status(400).json({ error: 'No file path specified' });
      return;
    }

    const { newName } = req.body;
    if (!newName || typeof newName !== 'string') {
      res.status(400).json({ error: 'newName is required' });
      return;
    }

    try {
      renameFile(projectDir, relativePath, newName);
      res.json({ success: true });
    } catch (err) {
      handlePathError(err, res);
    }
  });

  return router;
}
