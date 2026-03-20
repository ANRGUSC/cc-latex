import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { useToastStore } from '../stores/toastStore';
import type { WSMessage } from 'cc-latex-shared';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setCompiling = useAppStore((s) => s.setCompiling);
  const setCompilationResult = useAppStore((s) => s.setCompilationResult);
  const setPdfUrl = useAppStore((s) => s.setPdfUrl);
  const setFileTree = useAppStore((s) => s.setFileTree);
  const setWsConnected = useAppStore((s) => s.setWsConnected);
  const setGitInfo = useAppStore((s) => s.setGitInfo);

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        setWsConnected(true);
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
              if (msg.data.pdfPath) {
                setPdfUrl(msg.data.pdfPath);
              }
              if (msg.data.success) {
                useToastStore.getState().addToast({
                  message: `Compiled successfully (${msg.data.duration}ms)`,
                  type: 'success',
                  duration: 3000,
                });
              } else {
                useToastStore.getState().addToast({
                  message: `Compilation failed: ${msg.data.errors.length} error(s)`,
                  type: 'error',
                  duration: 5000,
                });
                // Switch to output tab on error
                useAppStore.getState().setBottomPanelTab('output');
              }
              break;

            case 'file:tree-updated':
              setFileTree(msg.data);
              break;

            case 'file:changed':
              // File change events can trigger other UI updates if needed
              // Auto-compile on save if enabled
              if (msg.data.event === 'change' && useAppStore.getState().autoCompile) {
                const filePath = msg.data.path;
                if (filePath.endsWith('.tex') || filePath.endsWith('.sty') || filePath.endsWith('.cls')) {
                  // Debounce by checking if already compiling
                  if (!useAppStore.getState().isCompiling) {
                    fetch('/api/compile', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({}),
                    }).catch(() => {});
                  }
                }
              }
              break;

            case 'git:status-updated':
              setGitInfo(msg.data);
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
        setWsConnected(false);
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
  }, [setCompiling, setCompilationResult, setPdfUrl, setFileTree, setWsConnected, setGitInfo]);
}
