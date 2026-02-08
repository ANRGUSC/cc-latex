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

export type WSMessage =
  | { type: 'compilation:start' }
  | { type: 'compilation:complete'; data: CompilationResult }
  | { type: 'file:changed'; data: { path: string; event: 'add' | 'change' | 'unlink' } }
  | { type: 'file:tree-updated'; data: FileNode }
  | { type: 'error'; data: { message: string } };
