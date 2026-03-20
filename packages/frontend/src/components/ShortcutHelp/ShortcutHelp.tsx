import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const shortcuts = [
  { keys: 'Ctrl+S', action: 'Save file' },
  { keys: 'Ctrl+Shift+B', action: 'Compile LaTeX' },
  { keys: 'Ctrl+Enter', action: 'Send chat message' },
  { keys: 'Ctrl+/', action: 'Toggle this help' },
];

export default function ShortcutHelp({ onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ minWidth: 320 }}>
        <div className="modal-title">
          <span>Keyboard Shortcuts</span>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {shortcuts.map(({ keys, action }) => (
            <div
              key={keys}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{action}</span>
              <kbd
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 6px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  color: 'var(--accent)',
                }}
              >
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
