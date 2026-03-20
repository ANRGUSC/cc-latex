import { Router } from 'express';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { compileLaTeX } from '../services/compileService.js';
import { broadcast } from '../websocket.js';

export function compileRouter(projectState: { dir: string }, wss: WebSocketServer): Router {
  const router = Router();

  // POST /compile — compile LaTeX and broadcast progress via WebSocket
  router.post('/compile', async (req, res) => {
    const mainFile: string | undefined = req.body?.mainFile || undefined;

    try {
      broadcast(wss, { type: 'compilation:start' });

      const result = await compileLaTeX(projectState.dir, mainFile);

      broadcast(wss, { type: 'compilation:complete', data: result });

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compilation failed';
      broadcast(wss, {
        type: 'compilation:complete',
        data: {
          success: false,
          pdfPath: null,
          log: message,
          errors: [{ line: null, file: null, message }],
          warnings: [],
          duration: 0,
        },
      });
      res.status(500).json({ error: message });
    }
  });

  // GET /pdf/:name — serve compiled PDF
  router.get('/pdf/:name', (req, res) => {
    const pdfName = req.params.name;
    if (!pdfName || !pdfName.endsWith('.pdf')) {
      res.status(400).json({ error: 'Invalid PDF name' });
      return;
    }

    // Guard against path traversal
    if (pdfName.includes('/') || pdfName.includes('\\') || pdfName.includes('..')) {
      res.status(400).json({ error: 'Invalid PDF name' });
      return;
    }

    const pdfPath = path.resolve(projectState.dir, pdfName);

    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(pdfPath, (err) => {
      if (err) {
        if (!res.headersSent) {
          res.status(404).json({ error: 'PDF not found' });
        }
      }
    });
  });

  return router;
}
