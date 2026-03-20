export interface FileNode {
  name: string;
  path: string; // relative to project root, always forward slashes
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface CompilationResult {
  success: boolean;
  pdfPath: string | null;
  log: string;
  errors: CompilationError[];
  warnings: string[];
  duration: number;
}

export interface CompilationError {
  line: number | null;
  file: string | null;
  message: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  fileEdits?: FileEdit[];
}

export interface FileEdit {
  path: string;
  originalContent: string;
  newContent: string;
  status: 'pending' | 'accepted' | 'rejected';
}

// Git sync types
export type GitSyncStatus = 'clean' | 'ahead' | 'behind' | 'diverged' | 'conflict' | 'unknown';

export interface GitRepoInfo {
  initialized: boolean;
  remote: string | null;
  branch: string | null;
  syncStatus: GitSyncStatus;
  aheadCount: number;
  behindCount: number;
  hasUncommittedChanges: boolean;
  changedFiles: string[];
  lastSyncTime: number | null;
  error: string | null;
}

export interface GitSetupRequest {
  owner: string;
  repo: string;
  branch?: string;
}

export interface GitCommitPushRequest {
  message: string;
}

export interface GitOperationResult {
  success: boolean;
  message: string;
  status?: GitRepoInfo;
}

export type WSMessage =
  | { type: 'compilation:start' }
  | { type: 'compilation:complete'; data: CompilationResult }
  | { type: 'file:changed'; data: { path: string; event: 'add' | 'change' | 'unlink' } }
  | { type: 'file:tree-updated'; data: FileNode }
  | { type: 'git:status-updated'; data: GitRepoInfo }
  | { type: 'error'; data: { message: string } };
