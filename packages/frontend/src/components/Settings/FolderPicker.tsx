import { useState, useEffect, useCallback } from 'react';
import { ChevronUp, Folder, HardDrive, Loader2, FolderPlus } from 'lucide-react';
import { browseDirectory, type BrowseResult } from '../../api/client';

interface Props {
  initialDir: string;
  onSelect: (dir: string) => void;
  onCancel: () => void;
}

export default function FolderPicker({ initialDir, onSelect, onCancel }: Props) {
  const [browse, setBrowse] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pathInput, setPathInput] = useState(initialDir);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  const load = useCallback(async (dir?: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await browseDirectory(dir);
      setBrowse(result);
      if (result.path) setPathInput(result.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to browse');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(initialDir || undefined);
  }, [initialDir, load]);

  function navigateTo(dir: string) {
    load(dir);
  }

  function handlePathSubmit() {
    const trimmed = pathInput.trim();
    if (trimmed) load(trimmed);
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name || !browse?.path) return;
    const newPath = browse.path + browse.sep + name;
    try {
      // Use the browse endpoint — backend will create + list it if we switch to it
      // Actually just switch project to the new path (it auto-creates)
      setShowNewFolder(false);
      setNewFolderName('');
      load(newPath);
    } catch {
      setError('Failed to create folder');
    }
  }

  const currentPath = browse?.path || pathInput || '';
  const isRoot = !browse?.path; // Showing drives

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    }} onClick={onCancel}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        width: 480,
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            Choose Project Folder
          </div>

          {/* Path bar */}
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePathSubmit(); }}
              placeholder="Type a path..."
              style={{
                flex: 1,
                fontSize: 12,
                padding: '4px 8px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
              }}
            />
            <button className="btn-sm" onClick={handlePathSubmit}>Go</button>
          </div>
        </div>

        {/* Breadcrumb / Up */}
        {browse?.path && (
          <div style={{
            padding: '6px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--text-muted)',
          }}>
            {browse.parent ? (
              <button
                className="btn-icon"
                onClick={() => navigateTo(browse.parent!)}
                title="Go up"
                style={{ padding: 2 }}
              >
                <ChevronUp size={14} />
              </button>
            ) : (
              <button
                className="btn-icon"
                onClick={() => load(undefined)}
                title="Show drives"
                style={{ padding: 2 }}
              >
                <HardDrive size={14} />
              </button>
            )}
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              direction: 'rtl',
              textAlign: 'left',
              flex: 1,
            }}>
              {browse.path}
            </span>
            <button
              className="btn-icon"
              onClick={() => setShowNewFolder(!showNewFolder)}
              title="New folder"
              style={{ padding: 2 }}
            >
              <FolderPlus size={14} />
            </button>
          </div>
        )}

        {/* New folder inline */}
        {showNewFolder && browse?.path && (
          <div style={{
            padding: '6px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: 4,
          }}>
            <Folder size={14} style={{ flexShrink: 0, marginTop: 3, opacity: 0.5 }} />
            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); }
              }}
              placeholder="New folder name..."
              style={{
                flex: 1,
                fontSize: 12,
                padding: '3px 6px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--accent)',
                borderRadius: 3,
                color: 'var(--text)',
              }}
            />
            <button className="btn-sm" onClick={handleCreateFolder}>Create</button>
          </div>
        )}

        {/* Directory listing */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 200,
          maxHeight: 350,
        }}>
          {loading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              color: 'var(--text-muted)',
            }}>
              <Loader2 size={18} className="spin" />
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px 14px',
              fontSize: 12,
              color: 'var(--error)',
            }}>
              {error}
            </div>
          )}

          {!loading && !error && browse && browse.entries.length === 0 && (
            <div style={{
              padding: '24px 14px',
              fontSize: 12,
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}>
              No subdirectories
            </div>
          )}

          {!loading && !error && browse?.entries.map((entry) => (
            <button
              key={entry.path}
              onClick={() => navigateTo(entry.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 14px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {isRoot
                ? <HardDrive size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                : <Folder size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
              }
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.name}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {currentPath || 'Select a folder'}
          </span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button className="btn-sm" onClick={onCancel}>Cancel</button>
            <button
              className="btn-accent btn-sm"
              disabled={!currentPath}
              onClick={() => onSelect(currentPath)}
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
