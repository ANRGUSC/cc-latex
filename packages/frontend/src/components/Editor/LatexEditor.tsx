import { useRef, useEffect, useCallback } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { indentWithTab, undo } from '@codemirror/commands';
import { vim } from '@replit/codemirror-vim';
import { Code2, Circle, Save, Undo2 } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { saveFile } from '../../api/client';

// Light theme for CodeMirror
const lightTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#eff1f5' },
    '.cm-gutters': { backgroundColor: '#e6e9ef', borderRight: '1px solid #bcc0cc', color: '#8c8fa1' },
    '.cm-activeLineGutter': { backgroundColor: '#ccd0da' },
    '.cm-activeLine': { backgroundColor: 'rgba(30, 102, 245, 0.06)' },
    '.cm-selectionBackground': { backgroundColor: 'rgba(30, 102, 245, 0.15) !important' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(30, 102, 245, 0.2) !important' },
    '.cm-cursor': { borderLeftColor: '#1e66f5' },
    '.cm-content': { caretColor: '#1e66f5', color: '#4c4f69' },
    '.cm-line': { color: '#4c4f69' },
  },
  { dark: false }
);

export default function LatexEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const vimCompartment = useRef(new Compartment());
  const themeCompartment = useRef(new Compartment());
  const activeFilePath = useAppStore((s) => s.activeFilePath);
  const activeFileContent = useAppStore((s) => s.activeFileContent);
  const isDirty = useAppStore((s) => s.isDirty);
  const updateActiveFileContent = useAppStore((s) => s.updateActiveFileContent);
  const setDirty = useAppStore((s) => s.setDirty);
  const vimMode = useAppStore((s) => s.vimMode);
  const toggleVimMode = useAppStore((s) => s.toggleVimMode);
  const theme = useAppStore((s) => s.theme);
  const setCursorPosition = useAppStore((s) => s.setCursorPosition);
  const editorScrollToLine = useAppStore((s) => s.editorScrollToLine);
  const setEditorScrollToLine = useAppStore((s) => s.setEditorScrollToLine);

  // Refs for current values to avoid stale closures in CodeMirror callbacks
  const activeFilePathRef = useRef(activeFilePath);
  const activeFileContentRef = useRef(activeFileContent);
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    activeFilePathRef.current = activeFilePath;
  }, [activeFilePath]);
  useEffect(() => {
    activeFileContentRef.current = activeFileContent;
  }, [activeFileContent]);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const handleSave = useCallback(async () => {
    const path = activeFilePathRef.current;
    const content = activeFileContentRef.current;
    if (!path) return;
    try {
      await saveFile(path, content);
      setDirty(false);
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }, [setDirty]);

  const handleUndo = useCallback(() => {
    if (viewRef.current) {
      undo(viewRef.current);
      viewRef.current.focus();
    }
  }, []);

  // Reconfigure vim compartment when vimMode changes
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: vimCompartment.current.reconfigure(vimMode ? vim() : []),
      });
    }
  }, [vimMode]);

  // Reconfigure theme compartment when theme changes
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompartment.current.reconfigure(
          theme === 'dark' ? oneDark : lightTheme
        ),
      });
    }
  }, [theme]);

  // Scroll to line when editorScrollToLine changes
  useEffect(() => {
    if (editorScrollToLine && viewRef.current) {
      const view = viewRef.current;
      const line = Math.min(editorScrollToLine, view.state.doc.lines);
      if (line > 0) {
        const lineInfo = view.state.doc.line(line);
        view.dispatch({
          selection: { anchor: lineInfo.from },
          scrollIntoView: true,
        });
        view.focus();
      }
      setEditorScrollToLine(null);
    }
  }, [editorScrollToLine, setEditorScrollToLine]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy previous editor view if any
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    if (!activeFilePath) return;

    const saveKeymap = keymap.of([
      {
        key: 'Ctrl-s',
        run: () => {
          handleSave();
          return true;
        },
      },
      {
        key: 'Cmd-s',
        run: () => {
          handleSave();
          return true;
        },
      },
    ]);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        updateActiveFileContent(newContent);
      }
      // Track cursor position
      if (update.selectionSet || update.docChanged) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        setCursorPosition(line.number, pos - line.from + 1);
      }
    });

    const editorTheme = EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '15px',
      },
      '.cm-scroller': {
        fontFamily: 'var(--font-mono)',
        overflow: 'auto',
      },
    });

    // Read state at creation time
    const currentVimMode = useAppStore.getState().vimMode;
    const currentTheme = useAppStore.getState().theme;

    const state = EditorState.create({
      doc: activeFileContent,
      extensions: [
        vimCompartment.current.of(currentVimMode ? vim() : []),
        themeCompartment.current.of(currentTheme === 'dark' ? oneDark : lightTheme),
        basicSetup,
        keymap.of([indentWithTab]),
        saveKeymap,
        updateListener,
        editorTheme,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Re-create editor when activeFilePath changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilePath]);

  const fileName = activeFilePath ? activeFilePath.split('/').pop() : null;

  return (
    <>
      <div className="panel-header">
        <Code2 size={14} className="header-icon" />
        <span>{fileName || 'Editor'}</span>
        {isDirty && (
          <Circle
            size={8}
            fill="var(--warning)"
            color="var(--warning)"
            style={{ marginLeft: 4 }}
          />
        )}
        {activeFilePath && (
          <div className="header-actions">
            <button
              className="mode-toggle"
              onClick={toggleVimMode}
              title={vimMode ? 'Switch to normal editing' : 'Switch to Vim mode'}
            >
              {vimMode ? 'VIM' : 'EDIT'}
            </button>
            <button
              className="btn-icon"
              onClick={handleSave}
              disabled={!isDirty}
              title="Save (Ctrl+S)"
            >
              <Save size={14} />
            </button>
            <button
              className="btn-icon"
              onClick={handleUndo}
              title="Undo"
            >
              <Undo2 size={14} />
            </button>
            {isDirty && (
              <span style={{ fontSize: 11, color: 'var(--warning)' }}>
                unsaved
              </span>
            )}
          </div>
        )}
      </div>
      {activeFilePath ? (
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflow: 'hidden',
            minHeight: 0,
          }}
        />
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: 14,
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <Code2 size={32} strokeWidth={1} />
          <span>No file selected</span>
          <span style={{ fontSize: 12 }}>
            Open a file from the tree on the left
          </span>
        </div>
      )}
    </>
  );
}
