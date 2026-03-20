import { create } from 'zustand';
import type { FileNode, CompilationResult, GitRepoInfo } from 'cc-latex-shared';

type Theme = 'dark' | 'light';
type AiMode = 'cli' | 'apikey';
type BottomTab = 'chat' | 'output';

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
  pdfVersion: number;
  setPdfUrl: (url: string | null) => void;

  projectName: string;
  setProjectName: (name: string) => void;
  projectDir: string;
  setProjectDir: (dir: string) => void;

  vimMode: boolean;
  toggleVimMode: () => void;

  // Phase 1: Status bar + connection
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
  cursorLine: number;
  cursorCol: number;
  setCursorPosition: (line: number, col: number) => void;

  // Phase 2: Theme
  theme: Theme;
  toggleTheme: () => void;

  // Phase 3: AI mode
  aiMode: AiMode;
  setAiMode: (mode: AiMode) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  claudeCliAvailable: boolean;
  setClaudeCliAvailable: (available: boolean) => void;

  // Settings modal
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;

  // Phase 4: Git
  gitInfo: GitRepoInfo | null;
  setGitInfo: (info: GitRepoInfo | null) => void;
  gitAvailable: boolean;
  setGitAvailable: (available: boolean) => void;
  isGitOperationRunning: boolean;
  setGitOperationRunning: (running: boolean) => void;

  // Phase 5: Bottom panel + editor scroll
  bottomPanelTab: BottomTab;
  setBottomPanelTab: (tab: BottomTab) => void;
  editorScrollToLine: number | null;
  setEditorScrollToLine: (line: number | null) => void;
  autoCompile: boolean;
  toggleAutoCompile: () => void;
}

function loadPersisted<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    if (val === null) return fallback;
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
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
  pdfVersion: 0,
  setPdfUrl: (url) => set((state) => ({ pdfUrl: url, pdfVersion: state.pdfVersion + 1 })),

  projectName: 'cc-latex',
  setProjectName: (name) => set({ projectName: name }),
  projectDir: '',
  setProjectDir: (dir) => set({ projectDir: dir }),

  vimMode: loadPersisted('cc-latex-vim-mode', true),
  toggleVimMode: () =>
    set((state) => {
      const next = !state.vimMode;
      localStorage.setItem('cc-latex-vim-mode', JSON.stringify(next));
      return { vimMode: next };
    }),

  // Phase 1
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
  cursorLine: 0,
  cursorCol: 0,
  setCursorPosition: (line, col) => set({ cursorLine: line, cursorCol: col }),

  // Phase 2
  theme: loadPersisted<Theme>('cc-latex-theme', 'dark'),
  toggleTheme: () =>
    set((state) => {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cc-latex-theme', JSON.stringify(next));
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),

  // Phase 3
  aiMode: loadPersisted<AiMode>('cc-latex-ai-mode', 'cli'),
  setAiMode: (mode) => {
    localStorage.setItem('cc-latex-ai-mode', JSON.stringify(mode));
    set({ aiMode: mode });
  },
  apiKey: loadPersisted('cc-latex-api-key', ''),
  setApiKey: (key) => {
    localStorage.setItem('cc-latex-api-key', JSON.stringify(key));
    set({ apiKey: key });
  },
  claudeCliAvailable: false,
  setClaudeCliAvailable: (available) => set({ claudeCliAvailable: available }),

  // Settings
  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),

  // Phase 4
  gitInfo: null,
  setGitInfo: (info) => set({ gitInfo: info }),
  gitAvailable: false,
  setGitAvailable: (available) => set({ gitAvailable: available }),
  isGitOperationRunning: false,
  setGitOperationRunning: (running) => set({ isGitOperationRunning: running }),

  // Phase 5
  bottomPanelTab: 'chat',
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),
  editorScrollToLine: null,
  setEditorScrollToLine: (line) => set({ editorScrollToLine: line }),
  autoCompile: loadPersisted('cc-latex-auto-compile', false),
  toggleAutoCompile: () =>
    set((state) => {
      const next = !state.autoCompile;
      localStorage.setItem('cc-latex-auto-compile', JSON.stringify(next));
      return { autoCompile: next };
    }),
}));
