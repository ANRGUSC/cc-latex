import {
  Play,
  Loader2,
  Settings,
  Sun,
  Moon,
  Save,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useToastStore } from '../../stores/toastStore';
import { saveFile, compile } from '../../api/client';

export default function Toolbar() {
  const projectName = useAppStore((s) => s.projectName);
  const activeFilePath = useAppStore((s) => s.activeFilePath);
  const activeFileContent = useAppStore((s) => s.activeFileContent);
  const isDirty = useAppStore((s) => s.isDirty);
  const setDirty = useAppStore((s) => s.setDirty);
  const isCompiling = useAppStore((s) => s.isCompiling);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const setShowSettings = useAppStore((s) => s.setShowSettings);

  const handleSave = async () => {
    if (!activeFilePath || !isDirty) return;
    try {
      await saveFile(activeFilePath, activeFileContent);
      setDirty(false);
      useToastStore.getState().addToast({ message: 'File saved', type: 'success', duration: 2000 });
    } catch (err) {
      useToastStore.getState().addToast({ message: 'Failed to save file', type: 'error' });
    }
  };

  const handleCompile = async () => {
    try {
      if (activeFilePath && isDirty) {
        await saveFile(activeFilePath, activeFileContent);
        setDirty(false);
      }
      await compile();
    } catch (err) {
      useToastStore.getState().addToast({ message: 'Compilation failed', type: 'error' });
    }
  };

  const breadcrumb = activeFilePath
    ? activeFilePath.split('/').join(' / ')
    : '';

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="toolbar-project">{projectName}</span>
        {breadcrumb && (
          <>
            <span className="toolbar-separator">/</span>
            <span className="toolbar-breadcrumb">{breadcrumb}</span>
          </>
        )}
        {isDirty && (
          <span style={{ color: 'var(--warning)', fontSize: 11, fontWeight: 600 }}>
            (unsaved)
          </span>
        )}
      </div>

      <div className="toolbar-right">
        <button
          className="btn-icon"
          onClick={handleSave}
          disabled={!isDirty || !activeFilePath}
          title="Save (Ctrl+S)"
        >
          <Save size={15} />
        </button>

        <button
          className="btn-sm"
          onClick={handleCompile}
          disabled={isCompiling}
          title="Compile (Ctrl+Shift+B)"
        >
          {isCompiling ? (
            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Play size={13} />
          )}
          {isCompiling ? 'Compiling...' : 'Compile'}
        </button>

        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          className="btn-icon"
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          <Settings size={15} />
        </button>
      </div>
    </div>
  );
}
