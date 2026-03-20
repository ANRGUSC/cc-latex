import { X, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const aiMode = useAppStore((s) => s.aiMode);
  const setAiMode = useAppStore((s) => s.setAiMode);
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const claudeCliAvailable = useAppStore((s) => s.claudeCliAvailable);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const autoCompile = useAppStore((s) => s.autoCompile);
  const toggleAutoCompile = useAppStore((s) => s.toggleAutoCompile);
  const vimMode = useAppStore((s) => s.vimMode);
  const toggleVimMode = useAppStore((s) => s.toggleVimMode);

  const [showKey, setShowKey] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          <span>Settings</span>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* AI Mode */}
        <div className="modal-section">
          <div className="modal-section-title">AI Connection</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              className={aiMode === 'cli' ? 'btn-accent btn-sm' : 'btn-sm'}
              onClick={() => setAiMode('cli')}
            >
              Claude CLI
              {claudeCliAvailable && (
                <span style={{ fontSize: 9, opacity: 0.7 }}>(available)</span>
              )}
            </button>
            <button
              className={aiMode === 'apikey' ? 'btn-accent btn-sm' : 'btn-sm'}
              onClick={() => setAiMode('apikey')}
            >
              API Key
            </button>
          </div>

          {aiMode === 'cli' && !claudeCliAvailable && (
            <div style={{ fontSize: 11, color: 'var(--warning)', marginBottom: 8 }}>
              Claude CLI not detected. Install from claude.ai/claude-code or switch to API key mode.
            </div>
          )}

          {aiMode === 'apikey' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  style={{ flex: 1, fontSize: 12 }}
                />
                <button className="btn-icon" onClick={() => setShowKey(!showKey)} title={showKey ? 'Hide' : 'Show'}>
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button className="btn-icon" onClick={() => setApiKey('')} title="Clear key">
                  <Trash2 size={14} />
                </button>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Stored in browser only. Never sent to our server.
              </span>
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="modal-section">
          <div className="modal-section-title">Editor</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={vimMode}
              onChange={toggleVimMode}
              style={{ width: 14, height: 14, accentColor: 'var(--accent)' }}
            />
            Vim keybindings
          </label>
        </div>

        {/* Appearance */}
        <div className="modal-section">
          <div className="modal-section-title">Appearance</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={theme === 'light'}
              onChange={toggleTheme}
              style={{ width: 14, height: 14, accentColor: 'var(--accent)' }}
            />
            Light theme
          </label>
        </div>

        {/* Compilation */}
        <div className="modal-section">
          <div className="modal-section-title">Compilation</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoCompile}
              onChange={toggleAutoCompile}
              style={{ width: 14, height: 14, accentColor: 'var(--accent)' }}
            />
            Auto-compile on save
          </label>
        </div>

        {/* Shortcuts hint */}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
          Press Ctrl+/ for keyboard shortcuts
        </div>
      </div>
    </div>
  );
}
