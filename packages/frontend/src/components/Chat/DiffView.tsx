import { useCallback } from 'react';
import { Undo2, Check, FileCode } from 'lucide-react';
import type { FileEdit } from 'cc-latex-shared';
import { useChatStore } from '../../stores/chatStore';
import { useAppStore } from '../../stores/appStore';
import { saveFile } from '../../api/client';

interface Props {
  edit: FileEdit;
  messageId: string;
  editIndex: number;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const origLines = original ? original.split('\n') : [];
  const newLines = modified.split('\n');

  // Simple LCS-based diff
  const m = origLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'unchanged', content: origLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', content: newLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', content: origLines[i - 1] });
      i--;
    }
  }

  return result;
}

export default function DiffView({ edit, messageId, editIndex }: Props) {
  const updateFileEditStatus = useChatStore((s) => s.updateFileEditStatus);
  const diffLines = computeDiff(edit.originalContent, edit.newContent);
  const isUndone = edit.status === 'rejected';

  const handleUndo = useCallback(async () => {
    try {
      await saveFile(edit.path, edit.originalContent);
      updateFileEditStatus(messageId, editIndex, 'rejected');
      // If this file is open in the editor, refresh it
      const appState = useAppStore.getState();
      if (appState.activeFilePath === edit.path) {
        appState.setActiveFile(edit.path, edit.originalContent);
      }
    } catch (err) {
      console.error('Failed to undo edit:', err);
    }
  }, [edit.path, edit.originalContent, messageId, editIndex, updateFileEditStatus]);

  const lineColors: Record<DiffLine['type'], { bg: string; color: string; prefix: string }> = {
    added: {
      bg: 'rgba(166, 227, 161, 0.1)',
      color: 'var(--success)',
      prefix: '+',
    },
    removed: {
      bg: 'rgba(243, 139, 168, 0.1)',
      color: 'var(--error)',
      prefix: '-',
    },
    unchanged: {
      bg: 'transparent',
      color: 'var(--text-muted)',
      prefix: ' ',
    },
  };

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        fontSize: 11,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <FileCode size={12} color="var(--text-secondary)" />
          <span
            style={{
              color: 'var(--accent)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {edit.path}
          </span>
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 10,
              background: isUndone
                ? 'rgba(243, 139, 168, 0.2)'
                : 'rgba(166, 227, 161, 0.2)',
              color: isUndone ? 'var(--error)' : 'var(--success)',
              fontWeight: 600,
            }}
          >
            {isUndone ? 'undone' : 'applied'}
          </span>
        </div>
        {!isUndone && edit.originalContent && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              className="btn-sm"
              onClick={handleUndo}
              title="Undo this edit"
              style={{
                borderColor: 'var(--warning)',
                color: 'var(--warning)',
              }}
            >
              <Undo2 size={11} />
              Undo
            </button>
          </div>
        )}
      </div>

      {/* Diff body */}
      <div
        style={{
          maxHeight: 200,
          overflow: 'auto',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {diffLines.map((line, idx) => {
          const style = lineColors[line.type];
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                background: style.bg,
                padding: '0 8px',
                minHeight: 18,
                lineHeight: '18px',
              }}
            >
              <span
                style={{
                  width: 16,
                  textAlign: 'center',
                  color: style.color,
                  flexShrink: 0,
                  userSelect: 'none',
                  fontWeight: line.type !== 'unchanged' ? 700 : 400,
                }}
              >
                {style.prefix}
              </span>
              <span
                style={{
                  color:
                    line.type === 'unchanged'
                      ? 'var(--text-secondary)'
                      : style.color,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  paddingLeft: 4,
                }}
              >
                {line.content}
              </span>
            </div>
          );
        })}
        {diffLines.length === 0 && (
          <div
            style={{
              padding: 8,
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            New file content
          </div>
        )}
      </div>
    </div>
  );
}
