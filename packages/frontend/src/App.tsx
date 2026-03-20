import { useEffect, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useAppStore } from './stores/appStore';
import { fetchFileTree, saveFile, compile, fetchStatus, fetchProject } from './api/client';
import MainLayout from './components/Layout/MainLayout';
import ToastContainer from './components/Toast/ToastContainer';
import SettingsModal from './components/Settings/SettingsModal';
import ShortcutHelp from './components/ShortcutHelp/ShortcutHelp';
import { useToastStore } from './stores/toastStore';
import { useState } from 'react';

export default function App() {
  useWebSocket();

  const setFileTree = useAppStore((s) => s.setFileTree);
  const activeFilePath = useAppStore((s) => s.activeFilePath);
  const activeFileContent = useAppStore((s) => s.activeFileContent);
  const isDirty = useAppStore((s) => s.isDirty);
  const setDirty = useAppStore((s) => s.setDirty);
  const theme = useAppStore((s) => s.theme);
  const setClaudeCliAvailable = useAppStore((s) => s.setClaudeCliAvailable);
  const setProjectName = useAppStore((s) => s.setProjectName);
  const setProjectDir = useAppStore((s) => s.setProjectDir);
  const showSettings = useAppStore((s) => s.showSettings);
  const setShowSettings = useAppStore((s) => s.setShowSettings);

  const [showShortcuts, setShowShortcuts] = useState(false);

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch file tree + status on mount
  useEffect(() => {
    fetchFileTree()
      .then(setFileTree)
      .catch((err) => console.error('Failed to load file tree:', err));

    fetchProject()
      .then((project) => {
        setProjectName(project.name);
        setProjectDir(project.dir);
      })
      .catch(() => {});

    fetchStatus()
      .then((status) => {
        setClaudeCliAvailable(status.claudeCliAvailable);
        // If CLI unavailable and no API key set, nudge to API key mode
        if (!status.claudeCliAvailable) {
          const state = useAppStore.getState();
          if (state.aiMode === 'cli') {
            state.setAiMode('apikey');
          }
        }
      })
      .catch(() => {
        // Status endpoint not available, CLI assumed unavailable
      });
  }, [setFileTree, setClaudeCliAvailable, setProjectName, setProjectDir]);

  const handleSave = useCallback(async () => {
    if (!activeFilePath || !isDirty) return;
    try {
      await saveFile(activeFilePath, activeFileContent);
      setDirty(false);
      useToastStore.getState().addToast({ message: 'File saved', type: 'success', duration: 2000 });
    } catch (err) {
      console.error('Failed to save file:', err);
      useToastStore.getState().addToast({ message: 'Failed to save file', type: 'error' });
    }
  }, [activeFilePath, activeFileContent, isDirty, setDirty]);

  const handleCompile = useCallback(async () => {
    try {
      if (activeFilePath && isDirty) {
        await saveFile(activeFilePath, activeFileContent);
        setDirty(false);
      }
      await compile();
    } catch (err) {
      console.error('Failed to compile:', err);
      useToastStore.getState().addToast({ message: 'Failed to compile', type: 'error' });
    }
  }, [activeFilePath, activeFileContent, isDirty, setDirty]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if the event originates from inside a CodeMirror editor
      const target = e.target as HTMLElement;
      if (target.closest('.cm-editor')) return;

      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      if (e.ctrlKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
        e.preventDefault();
        handleCompile();
      }

      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleCompile]);

  return (
    <>
      <MainLayout />
      <ToastContainer />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showShortcuts && <ShortcutHelp onClose={() => setShowShortcuts(false)} />}
    </>
  );
}
