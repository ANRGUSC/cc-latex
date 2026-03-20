import { Wifi, WifiOff, CheckCircle2, XCircle } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export default function StatusBar() {
  const wsConnected = useAppStore((s) => s.wsConnected);
  const isCompiling = useAppStore((s) => s.isCompiling);
  const lastCompilation = useAppStore((s) => s.lastCompilation);
  const cursorLine = useAppStore((s) => s.cursorLine);
  const cursorCol = useAppStore((s) => s.cursorCol);
  const vimMode = useAppStore((s) => s.vimMode);
  const activeFilePath = useAppStore((s) => s.activeFilePath);

  const compileStatus = isCompiling
    ? 'Compiling...'
    : lastCompilation
      ? lastCompilation.success
        ? `Compiled (${lastCompilation.duration}ms)`
        : `${lastCompilation.errors.length} error(s)`
      : '';

  const compileColor = isCompiling
    ? 'var(--warning)'
    : lastCompilation?.success
      ? 'var(--success)'
      : lastCompilation
        ? 'var(--error)'
        : 'var(--text-muted)';

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span
          className="status-bar-item"
          title={wsConnected ? 'Connected to server' : 'Disconnected'}
        >
          {wsConnected ? (
            <Wifi size={12} color="var(--success)" />
          ) : (
            <WifiOff size={12} color="var(--error)" />
          )}
          {wsConnected ? 'Connected' : 'Disconnected'}
        </span>

        {compileStatus && (
          <span className="status-bar-item" style={{ color: compileColor }}>
            {lastCompilation?.success ? (
              <CheckCircle2 size={12} />
            ) : lastCompilation && !lastCompilation.success ? (
              <XCircle size={12} />
            ) : null}
            {compileStatus}
          </span>
        )}
      </div>

      <div className="status-bar-right">
        {activeFilePath && cursorLine > 0 && (
          <span className="status-bar-item">
            Ln {cursorLine}, Col {cursorCol}
          </span>
        )}
        {activeFilePath && (
          <span className="status-bar-item">
            {vimMode ? 'VIM' : 'EDIT'}
          </span>
        )}
      </div>
    </div>
  );
}
