import { Router } from 'express';
import { streamChat } from '../services/chatService.js';

export function chatRouter(projectDir: string): Router {
  const router = Router();

  // POST /chat — stream AI response via SSE
  router.post('/chat', async (req, res) => {
    const { message, history, context } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Request body must include "message" as a string' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const stream = streamChat(message, context, history);

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Chat stream failed';
      // If headers already sent, send error as SSE event
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ text: `\nError: ${errorMessage}` })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        res.status(500).json({ error: errorMessage });
      }
    }

    // Handle client disconnect
    req.on('close', () => {
      res.end();
    });
  });

  return router;
}
