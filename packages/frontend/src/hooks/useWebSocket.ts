import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import type { WSMessage } from 'cc-latex-shared';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setCompiling = useAppStore((s) => s.setCompiling);
  const setCompilationResult = useAppStore((s) => s.setCompilationResult);
  const setPdfUrl = useAppStore((s) => s.setPdfUrl);
  const setFileTree = useAppStore((s) => s.setFileTree);

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);

          switch (msg.type) {
            case 'compilation:start':
              setCompiling(true);
              break;

            case 'compilation:complete':
              setCompiling(false);
              setCompilationResult(msg.data);
              if (msg.data.success && msg.data.pdfPath) {
                setPdfUrl(msg.data.pdfPath);
              }
              break;

            case 'file:tree-updated':
              setFileTree(msg.data);
              break;

            case 'file:changed':
              // File change events can trigger other UI updates if needed
              break;

            case 'error':
              console.error('[WS] Server error:', msg.data.message);
              break;
          }
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected, reconnecting in 2s...');
        wsRef.current = null;
        reconnectTimerRef.current = setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        ws.close();
      };
    }

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [setCompiling, setCompilationResult, setPdfUrl, setFileTree]);
}
