import { useState } from 'react';
import { AlertCircle, AlertTriangle, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export default function CompilationOutput() {
  const lastCompilation = useAppStore((s) => s.lastCompilation);
  const setEditorScrollToLine = useAppStore((s) => s.setEditorScrollToLine);
  const [showLog, setShowLog] = useState(false);

  if (!lastCompilation) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        No compilation output yet. Press Ctrl+Shift+B to compile.
      </div>
    );
  }

  const { success, errors, warnings, duration, log } = lastCompilation;

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px', fontSize: 12 }}>
      {/* Status summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {success ? (
          <CheckCircle2 size={14} color="var(--success)" />
        ) : (
          <AlertCircle size={14} color="var(--error)" />
        )}
        <span style={{ color: success ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
          {success ? 'Compilation succeeded' : 'Compilation failed'}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>({duration}ms)</span>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {errors.map((err, i) => (
            <div
              key={i}
              onClick={() => {
                if (err.line) setEditorScrollToLine(err.line);
              }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                cursor: err.line ? 'pointer' : 'default',
                marginBottom: 2,
                background: 'rgba(243, 139, 168, 0.1)',
                border: '1px solid rgba(243, 139, 168, 0.2)',
              }}
            >
              <AlertCircle size={13} color="var(--error)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                {err.file && (
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {err.file}
                    {err.line ? `:${err.line}` : ''}
                    {' — '}
                  </span>
                )}
                <span style={{ color: 'var(--error)' }}>{err.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {warnings.map((warn, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
                padding: '4px 8px',
                marginBottom: 2,
                color: 'var(--warning)',
                fontSize: 11,
              }}
            >
              <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Raw log toggle */}
      <button
        className="btn-sm"
        onClick={() => setShowLog(!showLog)}
        style={{ marginTop: 4 }}
      >
        {showLog ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Raw Log
      </button>

      {showLog && (
        <pre
          style={{
            marginTop: 6,
            padding: 8,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'auto',
            fontSize: 11,
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 300,
            color: 'var(--text-secondary)',
          }}
        >
          {log}
        </pre>
      )}
    </div>
  );
}
