import type { FileNode, CompilationResult, ChatMessage } from 'cc-latex-shared';

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

interface ChatContext {
  activeFilePath?: string | null;
  activeFileContent?: string;
  fileTreeSummary?: string;
  compilationErrors?: string[];
}

export async function* streamChat(
  message: string,
  history: ChatMessage[],
  context: ChatContext
): AsyncGenerator<string> {
  // Transform context to match backend's expected format
  const backendContext = {
    fileTree: undefined, // Backend will use fileTreeSummary if we add it to system prompt
    currentFile: context.activeFilePath
      ? { path: context.activeFilePath, content: context.activeFileContent || '' }
      : undefined,
    compilationErrors: context.compilationErrors,
  };

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
