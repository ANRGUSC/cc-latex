import type { FileNode, CompilationResult, ChatMessage, GitRepoInfo, GitOperationResult } from 'cc-latex-shared';

export async function fetchFileTree(): Promise<FileNode> {
  const res = await fetch('/api/files');
  if (!res.ok) throw new Error(`Failed to fetch file tree: ${res.statusText}`);
  return res.json();
}

export async function fetchFileContent(filePath: string): Promise<string> {
  // Don't encodeURIComponent the whole path — slashes must remain as-is for wildcard routes
  const safePath = filePath.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`/api/files/${safePath}`);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.statusText}`);
  const data = await res.json();
  return data.content;
}

export async function saveFile(filePath: string, content: string): Promise<void> {
  const safePath = filePath.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`/api/files/${safePath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to save file: ${res.statusText}`);
}

export async function compile(mainFile?: string): Promise<CompilationResult> {
  const res = await fetch('/api/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mainFile }),
  });
  if (!res.ok) throw new Error(`Compilation request failed: ${res.statusText}`);
  return res.json();
}

// Status endpoint
export async function fetchStatus(): Promise<{ claudeCliAvailable: boolean }> {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error(`Status fetch failed: ${res.statusText}`);
  return res.json();
}

// File operations
export async function createFileOrDir(
  path: string,
  type: 'file' | 'directory',
  content?: string
): Promise<void> {
  const res = await fetch('/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, type, content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error || res.statusText);
  }
}

export async function deleteFileOrDir(filePath: string): Promise<void> {
  const safePath = filePath.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`/api/files/${safePath}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error || res.statusText);
  }
}

export async function renameFileOrDir(filePath: string, newName: string): Promise<void> {
  const safePath = filePath.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`/api/files/${safePath}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newName }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error || res.statusText);
  }
}

// Project management
export async function fetchProject(): Promise<{ dir: string; name: string }> {
  const res = await fetch('/api/project');
  if (!res.ok) throw new Error('Failed to fetch project info');
  return res.json();
}

export async function switchProject(dir: string): Promise<{ success: boolean; dir: string; name: string }> {
  const res = await fetch('/api/project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dir }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error || res.statusText);
  }
  return res.json();
}

// Git operations
export async function fetchGitCheck(): Promise<{ gitAvailable: boolean; ghAvailable: boolean }> {
  const res = await fetch('/api/git/check');
  if (!res.ok) throw new Error('Git check failed');
  return res.json();
}

export async function fetchGitStatus(): Promise<GitRepoInfo> {
  const res = await fetch('/api/git/status');
  if (!res.ok) throw new Error('Git status failed');
  return res.json();
}

export async function gitClone(owner: string, repo: string, branch?: string): Promise<GitOperationResult> {
  const res = await fetch('/api/git/clone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, repo, branch }),
  });
  return res.json();
}

export async function gitPush(message: string): Promise<GitOperationResult> {
  const res = await fetch('/api/git/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  return res.json();
}

export async function gitPull(): Promise<GitOperationResult> {
  const res = await fetch('/api/git/pull', { method: 'POST' });
  return res.json();
}

// Chat
interface ChatContext {
  activeFilePath?: string | null;
  activeFileContent?: string;
  fileTreeSummary?: string;
  compilationErrors?: string[];
}

export async function* streamChat(
  message: string,
  history: ChatMessage[],
  context: ChatContext,
  apiKey?: string
): AsyncGenerator<string> {
  // Transform context to match backend's expected format
  const backendContext = {
    fileTree: undefined,
    currentFile: context.activeFilePath
      ? { path: context.activeFilePath, content: context.activeFileContent || '' }
      : undefined,
    compilationErrors: context.compilationErrors,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['x-anthropic-api-key'] = apiKey;
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      history: history.map((m) => ({ role: m.role, content: m.content })),
      context: backendContext,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Chat request failed: ${errorText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.text) {
          yield parsed.text;
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith('data: ')) {
      const data = trimmed.slice(6);
      if (data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) yield parsed.text;
        } catch {
          // Skip
        }
      }
    }
  }
}
