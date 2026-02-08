import { useEffect, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useAppStore } from './stores/appStore';
import { fetchFileTree, saveFile, compile } from './api/client';
import MainLayout from './components/Layout/MainLayout';

export default function App() {
  useWebSocket();

  const setFileTree = useAppStore((s) => s.setFileTree);
  const activeFilePath = useAppStore((s) => s.activeFilePath);
  const activeFileContent = useAppStore((s) => s.activeFileContent);
  const isDirty = useAppStore((s) => s.isDirty);
  const setDirty = useAppStore((s) => s.setDirty);

  useEffect(() => {
    fetchFileTree()
      .then(setFileTree)
      .catch((err) => console.error('Failed to load file tree:', err));
  }, [setFileTree]);

  const handleSave = useCallback(async () => {
    if (!activeFilePath || !isDirty) return;
    try {
      await saveFile(activeFilePath, activeFileContent);
      setDirty(false);
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }, [activeFilePath, activeFileContent, isDirty, setDirty]);

  const handleCompile = useCallback(async () => {
    try {
      if (activeFilePath && isDirty) {
        await saveFile(activeFilePath, activeFileContent);
        setDirty(false);
      }
      const mainFile = activeFilePath?.endsWith('.tex') ? activeFilePath : undefined;
      await compile(mainFile);
    } catch (err) {
      console.error('Failed to compile:', err);
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
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleCompile]);

  return <MainLayout />;
}
