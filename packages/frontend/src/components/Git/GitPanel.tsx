import { useState, useEffect } from 'react';
import {
  GitBranch,
  Upload,
  Download,
  Circle,
  Loader2,
  Link,
  Pencil,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useToastStore } from '../../stores/toastStore';
import { fetchGitCheck, fetchGitStatus, gitClone, gitSetRemote, gitPush, gitPull } from '../../api/client';

/** Extract "owner/repo" from a GitHub URL */
function shortRemote(url: string | null): string {
  if (!url) return '';
  const m = url.match(/github\.com[/:](.+?\/.+?)(?:\.git)?$/);
  return m ? m[1] : url;
}

export default function GitPanel() {
  const gitInfo = useAppStore((s) => s.gitInfo);
  const setGitInfo = useAppStore((s) => s.setGitInfo);
  const gitAvailable = useAppStore((s) => s.gitAvailable);
  const setGitAvailable = useAppStore((s) => s.setGitAvailable);
  const isGitOperationRunning = useAppStore((s) => s.isGitOperationRunning);
  const setGitOperationRunning = useAppStore((s) => s.setGitOperationRunning);
  const projectDir = useAppStore((s) => s.projectDir);

  const [remoteInput, setRemoteInput] = useState('');
  const [editingRemote, setEditingRemote] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [showPush, setShowPush] = useState(false);

  // Refresh git status when project directory changes
  useEffect(() => {
    fetchGitCheck()
      .then(({ gitAvailable: avail }) => {
        setGitAvailable(avail);
        if (avail) {
          fetchGitStatus().then(setGitInfo).catch(() => setGitInfo(null));
        }
      })
      .catch(() => {});
  }, [setGitAvailable, setGitInfo, projectDir]);

  if (!gitAvailable) return null;

  const hasRepo = gitInfo?.initialized;
  const hasRemote = hasRepo && !!gitInfo?.remote;
  const remoteShort = shortRemote(gitInfo?.remote ?? null);

  const statusColor =
    !gitInfo || !hasRepo
      ? 'var(--text-muted)'
      : gitInfo.syncStatus === 'clean' && !gitInfo.hasUncommittedChanges
        ? 'var(--success)'
        : gitInfo.syncStatus === 'conflict' || gitInfo.syncStatus === 'diverged'
          ? 'var(--error)'
          : 'var(--warning)';

  const handleSetRemote = async () => {
    const trimmed = remoteInput.trim();
    if (!trimmed.includes('/')) return;
    const [owner, repo] = trimmed.split('/');
    setGitOperationRunning(true);
    try {
      const result = hasRepo
        ? await gitSetRemote(owner, repo)
        : await gitClone(owner, repo);
      if (result.success) {
        useToastStore.getState().addToast({ message: result.message, type: 'success' });
        if (result.status) setGitInfo(result.status);
        setRemoteInput('');
        setEditingRemote(false);
      } else {
        useToastStore.getState().addToast({ message: result.message, type: 'error' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      useToastStore.getState().addToast({ message: msg, type: 'error' });
    } finally {
      setGitOperationRunning(false);
    }
  };

  const handlePush = async () => {
    if (!commitMsg.trim()) return;
    setGitOperationRunning(true);
    const result = await gitPush(commitMsg.trim());
    setGitOperationRunning(false);
    if (result.success) {
      useToastStore.getState().addToast({ message: 'Pushed successfully', type: 'success' });
      if (result.status) setGitInfo(result.status);
      setCommitMsg('');
      setShowPush(false);
    } else {
      useToastStore.getState().addToast({ message: result.message, type: 'error' });
    }
  };

  const handlePull = async () => {
    setGitOperationRunning(true);
    const result = await gitPull();
    setGitOperationRunning(false);
    if (result.success) {
      useToastStore.getState().addToast({ message: 'Pulled successfully', type: 'success' });
      if (result.status) setGitInfo(result.status);
    } else {
      useToastStore.getState().addToast({ message: result.message, type: 'error' });
    }
  };

  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        padding: '8px 10px',
        fontSize: 11,
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <GitBranch size={13} color="var(--text-secondary)" />
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>
          Git
        </span>
        {gitInfo?.branch && (
          <>
            <Circle size={6} fill={statusColor} color={statusColor} />
            <span style={{ color: 'var(--text-primary)' }}>{gitInfo.branch}</span>
          </>
        )}
        {isGitOperationRunning && (
          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', marginLeft: 'auto' }} />
        )}
      </div>

      {/* Remote display / edit */}
      {hasRemote && !editingRemote ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
          <Link size={10} style={{ flexShrink: 0, opacity: 0.5 }} />
          <span style={{
            color: 'var(--text-muted)',
            fontSize: 10,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {remoteShort}
          </span>
          <button
            className="btn-icon"
            onClick={() => { setEditingRemote(true); setRemoteInput(remoteShort); }}
            title="Change remote"
            style={{ padding: 1 }}
          >
            <Pencil size={10} />
          </button>
        </div>
      ) : null}

      {/* Remote input — shown when: no remote, or editing remote */}
      {(!hasRemote || editingRemote) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            {hasRepo ? 'Set GitHub remote' : 'Connect a GitHub repo'}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              value={remoteInput}
              onChange={(e) => setRemoteInput(e.target.value)}
              placeholder="owner/repo"
              style={{ flex: 1, fontSize: 11, padding: '3px 6px' }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSetRemote(); if (e.key === 'Escape') setEditingRemote(false); }}
            />
            <button
              className="btn-sm"
              onClick={handleSetRemote}
              disabled={!remoteInput.includes('/') || isGitOperationRunning}
            >
              {isGitOperationRunning ? <Loader2 size={10} className="spin" /> : 'Set'}
            </button>
            {editingRemote && (
              <button className="btn-sm" onClick={() => setEditingRemote(false)}>Cancel</button>
            )}
          </div>
        </div>
      )}

      {/* Push / Pull — show when remote is configured */}
      {hasRemote && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Status line */}
          <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            {gitInfo!.hasUncommittedChanges && (
              <span style={{ color: 'var(--warning)' }}>
                {gitInfo!.changedFiles.length} changed
              </span>
            )}
            {gitInfo!.aheadCount > 0 && (
              <span style={{ marginLeft: 6 }}>{gitInfo!.aheadCount} ahead</span>
            )}
            {gitInfo!.behindCount > 0 && (
              <span style={{ marginLeft: 6 }}>{gitInfo!.behindCount} behind</span>
            )}
            {!gitInfo!.hasUncommittedChanges && gitInfo!.syncStatus === 'clean' && (
              <span style={{ color: 'var(--success)' }}>up to date</span>
            )}
          </div>

          {/* Push/Pull buttons */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn-sm"
              onClick={() => setShowPush(!showPush)}
              disabled={isGitOperationRunning || !gitInfo!.hasUncommittedChanges}
              title="Commit & Push"
              style={{ flex: 1 }}
            >
              <Upload size={11} /> Push
            </button>
            <button
              className="btn-sm"
              onClick={handlePull}
              disabled={isGitOperationRunning}
              title="Pull from remote"
              style={{ flex: 1 }}
            >
              <Download size={11} /> Pull
            </button>
          </div>

          {/* Commit message input */}
          {showPush && (
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                placeholder="Commit message..."
                onKeyDown={(e) => { if (e.key === 'Enter') handlePush(); }}
                style={{ flex: 1, fontSize: 11, padding: '3px 6px' }}
              />
              <button
                className="btn-accent btn-sm"
                onClick={handlePush}
                disabled={!commitMsg.trim() || isGitOperationRunning}
              >
                Go
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
