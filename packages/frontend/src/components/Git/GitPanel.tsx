import { useState, useEffect } from 'react';
import {
  GitBranch,
  Upload,
  Download,
  Circle,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useToastStore } from '../../stores/toastStore';
import { fetchGitCheck, fetchGitStatus, gitClone, gitPush, gitPull } from '../../api/client';

export default function GitPanel() {
  const gitInfo = useAppStore((s) => s.gitInfo);
  const setGitInfo = useAppStore((s) => s.setGitInfo);
  const gitAvailable = useAppStore((s) => s.gitAvailable);
  const setGitAvailable = useAppStore((s) => s.setGitAvailable);
  const isGitOperationRunning = useAppStore((s) => s.isGitOperationRunning);
  const setGitOperationRunning = useAppStore((s) => s.setGitOperationRunning);

  const [cloneOwner, setCloneOwner] = useState('');
  const [cloneRepo, setCloneRepo] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [showPush, setShowPush] = useState(false);

  useEffect(() => {
    fetchGitCheck()
      .then(({ gitAvailable }) => {
        setGitAvailable(gitAvailable);
        if (gitAvailable) {
          fetchGitStatus().then(setGitInfo).catch(() => {});
        }
      })
      .catch(() => {});
  }, [setGitAvailable, setGitInfo]);

  if (!gitAvailable) return null;

  const statusColor =
    !gitInfo || !gitInfo.initialized
      ? 'var(--text-muted)'
      : gitInfo.syncStatus === 'clean' && !gitInfo.hasUncommittedChanges
        ? 'var(--success)'
        : gitInfo.syncStatus === 'conflict' || gitInfo.syncStatus === 'diverged'
          ? 'var(--error)'
          : 'var(--warning)';

  const handleClone = async () => {
    if (!cloneOwner || !cloneRepo) return;
    setGitOperationRunning(true);
    const result = await gitClone(cloneOwner, cloneRepo);
    setGitOperationRunning(false);
    if (result.success) {
      useToastStore.getState().addToast({ message: result.message, type: 'success' });
      if (result.status) setGitInfo(result.status);
      setCloneOwner('');
      setCloneRepo('');
    } else {
      useToastStore.getState().addToast({ message: result.message, type: 'error' });
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

      {gitInfo?.initialized && gitInfo.remote ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Status line */}
          <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            {gitInfo.hasUncommittedChanges && (
              <span style={{ color: 'var(--warning)' }}>
                {gitInfo.changedFiles.length} changed
              </span>
            )}
            {gitInfo.aheadCount > 0 && (
              <span style={{ marginLeft: 6 }}>{gitInfo.aheadCount} ahead</span>
            )}
            {gitInfo.behindCount > 0 && (
              <span style={{ marginLeft: 6 }}>{gitInfo.behindCount} behind</span>
            )}
            {!gitInfo.hasUncommittedChanges && gitInfo.syncStatus === 'clean' && (
              <span style={{ color: 'var(--success)' }}>up to date</span>
            )}
          </div>

          {/* Push/Pull buttons */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn-sm"
              onClick={() => setShowPush(!showPush)}
              disabled={isGitOperationRunning || !gitInfo.hasUncommittedChanges}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePush();
                }}
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
      ) : (
        /* Clone form */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            Connect a GitHub repo
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              value={cloneOwner}
              onChange={(e) => setCloneOwner(e.target.value)}
              placeholder="owner"
              style={{ flex: 1, fontSize: 11, padding: '3px 6px' }}
            />
            <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>/</span>
            <input
              value={cloneRepo}
              onChange={(e) => setCloneRepo(e.target.value)}
              placeholder="repo"
              style={{ flex: 1, fontSize: 11, padding: '3px 6px' }}
            />
          </div>
          <button
            className="btn-sm"
            onClick={handleClone}
            disabled={!cloneOwner || !cloneRepo || isGitOperationRunning}
          >
            Clone
          </button>
        </div>
      )}
    </div>
  );
}
