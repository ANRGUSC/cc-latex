import { useState, useCallback } from 'react';
import {
  FolderOpen,
  Folder,
  FileText,
  Files,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useToastStore } from '../../stores/toastStore';
import {
  fetchFileContent,
  fetchFileTree,
  createFileOrDir,
  deleteFileOrDir,
  renameFileOrDir,
} from '../../api/client';
import type { FileNode } from 'cc-latex-shared';

function sortChildren(children: FileNode[]): FileNode[] {
  return [...children].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

interface TreeItemProps {
  node: FileNode;
  depth: number;
  activeFilePath: string | null;
  onFileClick: (path: string) => void;
  onRefresh: () => void;
}

function TreeItem({ node, depth, activeFilePath, onFileClick, onRefresh }: TreeItemProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [hovered, setHovered] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [creating, setCreating] = useState<'file' | 'directory' | null>(null);
  const [createName, setCreateName] = useState('');
  const isActive = node.type === 'file' && node.path === activeFilePath;
  const isDir = node.type === 'directory';

  const handleClick = () => {
    if (renaming) return;
    if (isDir) {
      setExpanded(!expanded);
    } else {
      onFileClick(node.path);
    }
  };

  const handleRename = async () => {
    const name = renameValue.trim();
    if (!name || name === node.name) {
      setRenaming(false);
      return;
    }
    try {
      await renameFileOrDir(node.path, name);
      onRefresh();
    } catch (err) {
      useToastStore.getState().addToast({
        message: err instanceof Error ? err.message : 'Rename failed',
        type: 'error',
      });
    }
    setRenaming(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${node.name}"?`)) return;
    try {
      await deleteFileOrDir(node.path);
      onRefresh();
    } catch (err) {
      useToastStore.getState().addToast({
        message: err instanceof Error ? err.message : 'Delete failed',
        type: 'error',
      });
    }
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name || !creating) {
      setCreating(null);
      return;
    }
    const parentPath = isDir ? node.path : node.path.split('/').slice(0, -1).join('/');
    const newPath = parentPath === '.' ? name : `${parentPath}/${name}`;
    try {
      await createFileOrDir(newPath, creating);
      onRefresh();
    } catch (err) {
      useToastStore.getState().addToast({
        message: err instanceof Error ? err.message : 'Create failed',
        type: 'error',
      });
    }
    setCreating(null);
    setCreateName('');
  };

  const iconSize = 14;

  return (
    <div>
      <div
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          paddingLeft: depth * 16 + 8,
          cursor: 'pointer',
          backgroundColor: isActive ? 'var(--accent-bg)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
          color: isActive ? 'var(--accent)' : 'var(--text-primary)',
          fontSize: 13,
          userSelect: 'none',
          transition: 'background-color 0.1s ease',
          position: 'relative',
        }}
        onMouseOver={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
        }}
        onMouseOut={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {isDir ? (
          expanded ? (
            <FolderOpen size={iconSize} color="var(--warning)" />
          ) : (
            <Folder size={iconSize} color="var(--warning)" />
          )
        ) : (
          <FileText size={iconSize} color="var(--text-secondary)" />
        )}

        {renaming ? (
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            style={{
              flex: 1,
              fontSize: 12,
              padding: '1px 4px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--accent)',
              borderRadius: 2,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        ) : (
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {node.name}
          </span>
        )}

        {/* Action buttons on hover */}
        {hovered && !renaming && (
          <div
            style={{
              display: 'flex',
              gap: 2,
              marginLeft: 'auto',
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                setRenameValue(node.name);
                setRenaming(true);
              }}
              title="Rename"
              style={{ padding: 1 }}
            >
              <Pencil size={11} />
            </button>
            <button
              className="btn-icon"
              onClick={handleDelete}
              title="Delete"
              style={{ padding: 1 }}
            >
              <Trash2 size={11} />
            </button>
            {isDir && (
              <>
                <button
                  className="btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(true);
                    setCreating('file');
                    setCreateName('');
                  }}
                  title="New file"
                  style={{ padding: 1 }}
                >
                  <FilePlus size={11} />
                </button>
                <button
                  className="btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(true);
                    setCreating('directory');
                    setCreateName('');
                  }}
                  title="New folder"
                  style={{ padding: 1 }}
                >
                  <FolderPlus size={11} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isDir && expanded && (
        <div>
          {/* Inline create input */}
          {creating && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 8px',
                paddingLeft: (depth + 1) * 16 + 8,
              }}
            >
              {creating === 'directory' ? (
                <FolderPlus size={12} color="var(--warning)" />
              ) : (
                <FilePlus size={12} color="var(--text-secondary)" />
              )}
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onBlur={handleCreate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') {
                    setCreating(null);
                    setCreateName('');
                  }
                }}
                autoFocus
                placeholder={creating === 'directory' ? 'folder name' : 'filename'}
                style={{
                  flex: 1,
                  fontSize: 12,
                  padding: '1px 4px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--accent)',
                  borderRadius: 2,
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {node.children &&
            sortChildren(node.children).map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFilePath={activeFilePath}
                onFileClick={onFileClick}
                onRefresh={onRefresh}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree() {
  const fileTree = useAppStore((s) => s.fileTree);
  const activeFilePath = useAppStore((s) => s.activeFilePath);
  const setActiveFile = useAppStore((s) => s.setActiveFile);
  const setFileTree = useAppStore((s) => s.setFileTree);
  const projectName = useAppStore((s) => s.projectName);

  const handleFileClick = useCallback(
    async (path: string) => {
      try {
        const content = await fetchFileContent(path);
        setActiveFile(path, content);
      } catch (err) {
        console.error('Failed to open file:', err);
      }
    },
    [setActiveFile]
  );

  const handleRefresh = useCallback(async () => {
    try {
      const tree = await fetchFileTree();
      setFileTree(tree);
    } catch (err) {
      console.error('Failed to refresh file tree:', err);
    }
  }, [setFileTree]);

  return (
    <>
      <div className="panel-header">
        <Files size={14} className="header-icon" />
        <span>{projectName}</span>
        <div className="header-actions">
          <button
            className="btn-icon"
            onClick={() => {
              // Create at root
              const name = window.prompt('New file name:');
              if (name) {
                createFileOrDir(name, 'file')
                  .then(handleRefresh)
                  .catch((err) =>
                    useToastStore.getState().addToast({
                      message: err.message,
                      type: 'error',
                    })
                  );
              }
            }}
            title="New file"
          >
            <FilePlus size={13} />
          </button>
          <button
            className="btn-icon"
            onClick={() => {
              const name = window.prompt('New folder name:');
              if (name) {
                createFileOrDir(name, 'directory')
                  .then(handleRefresh)
                  .catch((err) =>
                    useToastStore.getState().addToast({
                      message: err.message,
                      type: 'error',
                    })
                  );
              }
            }}
            title="New folder"
          >
            <FolderPlus size={13} />
          </button>
        </div>
      </div>
      <div className="panel-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {fileTree ? (
          fileTree.type === 'directory' && fileTree.children ? (
            sortChildren(fileTree.children).map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={0}
                activeFilePath={activeFilePath}
                onFileClick={handleFileClick}
                onRefresh={handleRefresh}
              />
            ))
          ) : (
            <TreeItem
              node={fileTree}
              depth={0}
              activeFilePath={activeFilePath}
              onFileClick={handleFileClick}
              onRefresh={handleRefresh}
            />
          )
        ) : (
          <div
            style={{
              padding: 16,
              color: 'var(--text-muted)',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            Loading files...
          </div>
        )}
      </div>
    </>
  );
}
