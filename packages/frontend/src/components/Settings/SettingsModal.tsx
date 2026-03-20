import { X, Eye, EyeOff, Trash2, FolderOpen, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { switchProject, fetchFileTree, gitSetRemote, gitClone, fetchGitStatus } from '../../api/client';
import { useToastStore } from '../../stores/toastStore';
import FolderPicker from './FolderPicker';

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
  const projectDir = useAppStore((s) => s.projectDir);
  const setProjectDir = useAppStore((s) => s.setProjectDir);
  const setProjectName = useAppStore((s) => s.setProjectName);
  const setFileTree = useAppStore((s) => s.setFileTree);
  const setGitInfo = useAppStore((s) => s.setGitInfo);

  const [showKey, setShowKey] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const gitInfo = useAppStore((s) => s.gitInfo);
  const [repoInput, setRepoInput] = useState('');
  const [isSettingRemote, setIsSettingRemote] = useState(false);

  async function handleSwitchProject(dir: string) {
    if (!dir || dir === projectDir) return;
    setIsSwitching(true);
    try {
      const result = await switchProject(dir);
      setProjectDir(result.dir);
      setProjectName(result.name);
      const tree = await fetchFileTree();
      setFileTree(tree);
      try {
        const gitInfo = await fetchGitStatus();
        setGitInfo(gitInfo);
      } catch { /* no git */ }
      useToastStore.getState().addToast({ message: `Switched to ${result.name}`, type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to switch project';
      useToastStore.getState().addToast({ message: msg, type: 'error' });
    } finally {
      setIsSwitching(false);
    }
  }

  async function handleSetRemote() {
    const trimmed = repoInput.trim();
    if (!trimmed.includes('/')) return;
    const [owner, repo] = trimmed.split('/');
    setIsSettingRemote(true);
    try {
      const isExistingRepo = gitInfo?.initialized;
      const result = isExistingRepo
        ? await gitSetRemote(owner, repo)
        : await gitClone(owner, repo);
      if (result.success) {
        useToastStore.getState().addToast({ message: result.message, type: 'success' });
        setRepoInput('');
        const tree = await fetchFileTree();
        setFileTree(tree);
        try {
          const info = await fetchGitStatus();
          setGitInfo(info);
        } catch { /* ignore */ }
      } else {
        useToastStore.getState().addToast({ message: result.message, type: 'error' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to set remote';
      useToastStore.getState().addToast({ message: msg, type: 'error' });
    } finally {
      setIsSettingRemote(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          <span>Settings</span>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Project Directory */}
        <div className="modal-section">
          <div className="modal-section-title">Project Directory</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <FolderOpen size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
            <span style={{
              flex: 1,
              fontSize: 12,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              direction: 'rtl',
              textAlign: 'left',
            }}>
              {projectDir || '(none)'}
            </span>
            <button
              className="btn-sm"
              disabled={isSwitching}
              onClick={() => setShowFolderPicker(true)}
            >
              {isSwitching ? <Loader2 size={12} className="spin" /> : 'Browse...'}
            </button>
          </div>
        </div>

        {/* GitHub Remote */}
        <div className="modal-section">
          <div className="modal-section-title">GitHub Remote</div>
          {gitInfo?.remote ? (
            <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {gitInfo.remote.replace(/\.git$/, '').replace(/.*github\.com[/:]/, '')}
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="owner/repo"
              style={{ flex: 1, fontSize: 12 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSetRemote();
                }
              }}
            />
            <button
              className="btn-sm"
              disabled={isSettingRemote || !repoInput.includes('/')}
              onClick={handleSetRemote}
            >
              {isSettingRemote ? <Loader2 size={12} className="spin" /> : (gitInfo?.initialized ? 'Set' : 'Clone')}
            </button>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            {gitInfo?.initialized
              ? 'Set or change the origin remote for this repo.'
              : 'Initialize git and clone from GitHub.'}
          </span>
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

      {showFolderPicker && (
        <FolderPicker
          initialDir={projectDir}
          onCancel={() => setShowFolderPicker(false)}
          onSelect={(dir) => {
            setShowFolderPicker(false);
            handleSwitchProject(dir);
          }}
        />
      )}
    </div>
  );
}
