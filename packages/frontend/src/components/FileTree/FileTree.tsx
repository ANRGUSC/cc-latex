import { useState, useCallback } from 'react';
import { FolderOpen, Folder, FileText, Files } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { fetchFileContent } from '../../api/client';
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
}

function TreeItem({ node, depth, activeFilePath, onFileClick }: TreeItemProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isActive = node.type === 'file' && node.path === activeFilePath;
  const isDir = node.type === 'directory';

  const handleClick = () => {
    if (isDir) {
      setExpanded(!expanded);
    } else {
      onFileClick(node.path);
    }
  };

  const iconSize = 14;

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          paddingLeft: depth * 16 + 8,
          cursor: 'pointer',
          backgroundColor: isActive ? 'rgba(137, 180, 250, 0.15)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
          color: isActive ? 'var(--accent)' : 'var(--text-primary)',
          fontSize: 13,
          userSelect: 'none',
          transition: 'background-color 0.1s ease',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
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
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.name}
        </span>
      </div>
      {isDir && expanded && node.children && (
        <div>
          {sortChildren(node.children).map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFilePath={activeFilePath}
              onFileClick={onFileClick}
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

  return (
    <>
      <div className="panel-header">
        <Files size={14} className="header-icon" />
        <span>{projectName}</span>
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
              />
            ))
          ) : (
            <TreeItem
              node={fileTree}
              depth={0}
              activeFilePath={activeFilePath}
              onFileClick={handleFileClick}
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
