import { create } from 'zustand';
import type { FileNode, CompilationResult } from 'cc-latex-shared';

interface AppState {
  fileTree: FileNode | null;
  setFileTree: (tree: FileNode | null) => void;

  activeFilePath: string | null;
  activeFileContent: string;
  setActiveFile: (path: string | null, content: string) => void;
  updateActiveFileContent: (content: string) => void;

  isDirty: boolean;
  setDirty: (dirty: boolean) => void;

  isCompiling: boolean;
  lastCompilation: CompilationResult | null;
  setCompiling: (compiling: boolean) => void;
  setCompilationResult: (result: CompilationResult) => void;

  pdfUrl: string | null;
  setPdfUrl: (url: string | null) => void;

  projectName: string;
  setProjectName: (name: string) => void;

  vimMode: boolean;
  toggleVimMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  fileTree: null,
  setFileTree: (tree) => set({ fileTree: tree }),

  activeFilePath: null,
  activeFileContent: '',
  setActiveFile: (path, content) =>
    set({ activeFilePath: path, activeFileContent: content, isDirty: false }),
  updateActiveFileContent: (content) =>
    set({ activeFileContent: content, isDirty: true }),

  isDirty: false,
  setDirty: (dirty) => set({ isDirty: dirty }),

  isCompiling: false,
  lastCompilation: null,
  setCompiling: (compiling) => set({ isCompiling: compiling }),
  setCompilationResult: (result) => set({ lastCompilation: result }),

  pdfUrl: null,
  setPdfUrl: (url) => set({ pdfUrl: url }),

  projectName: 'cc-latex',
  setProjectName: (name) => set({ projectName: name }),

  vimMode: localStorage.getItem('cc-latex-vim-mode') !== 'false',
  toggleVimMode: () =>
    set((state) => {
      const next = !state.vimMode;
      localStorage.setItem('cc-latex-vim-mode', String(next));
      return { vimMode: next };
    }),
}));
