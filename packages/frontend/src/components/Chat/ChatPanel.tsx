import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useAppStore } from '../../stores/appStore';
import { streamChat, saveFile, fetchFileContent } from '../../api/client';
import ChatMessageComponent from './ChatMessage';
import type { ChatMessage, FileEdit, FileNode } from 'cc-latex-shared';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function summarizeTree(node: FileNode | null, depth = 0): string {
  if (!node) return '';
  const indent = '  '.repeat(depth);
  let result = `${indent}${node.name}${node.type === 'directory' ? '/' : ''}\n`;
  if (node.children) {
    for (const child of node.children) {
      result += summarizeTree(child, depth + 1);
    }
  }
  return result;
}

function parseFileEdits(content: string): FileEdit[] {
  const edits: FileEdit[] = [];
  const editRegex = /<<<EDIT\s+(.+?)>>>([\s\S]*?)<<<END_EDIT>>>/g;
  let match: RegExpExecArray | null;

  while ((match = editRegex.exec(content)) !== null) {
    const filePath = match[1].trim();
    const editContent = match[2].trim();

    // Split the edit content into original and new based on common diff markers
    // The assistant should provide the new content; original will be fetched or left empty
    edits.push({
      path: filePath,
      originalContent: '',
      newContent: editContent,
      status: 'pending',
    });
  }

  return edits;
}

export default function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const addMessage = useChatStore((s) => s.addMessage);
  const appendToLastMessage = useChatStore((s) => s.appendToLastMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const clearMessages = useChatStore((s) => s.clearMessages);

  const activeFilePath = useAppStore((s) => s.activeFilePath);
  const activeFileContent = useAppStore((s) => s.activeFileContent);
  const fileTree = useAppStore((s) => s.fileTree);
  const lastCompilation = useAppStore((s) => s.lastCompilation);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    addMessage(assistantMsg);

    setStreaming(true);

    const context = {
      activeFilePath,
      activeFileContent,
      fileTreeSummary: summarizeTree(fileTree),
      compilationErrors:
        lastCompilation?.errors?.map((e) => e.message) || [],
    };

    try {
      const chatHistory = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));

      for await (const chunk of streamChat(text, chatHistory, context)) {
        appendToLastMessage(chunk);
      }

      // After streaming is done, auto-apply any file edits
      const store = useChatStore.getState();
      const lastMsg = store.messages[store.messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        const edits = parseFileEdits(lastMsg.content);
        if (edits.length > 0) {
          // Fetch original content, apply edits, mark as accepted
          const appliedEdits: FileEdit[] = [];
          for (const edit of edits) {
            let originalContent = '';
            try {
              originalContent = await fetchFileContent(edit.path);
            } catch {
              // New file — no original content
            }
            try {
              await saveFile(edit.path, edit.newContent);
              appliedEdits.push({
                ...edit,
                originalContent,
                status: 'accepted',
              });
              // If this file is currently open in the editor, refresh it
              const appState = useAppStore.getState();
              if (appState.activeFilePath === edit.path) {
                appState.setActiveFile(edit.path, edit.newContent);
              }
            } catch {
              appliedEdits.push({ ...edit, originalContent, status: 'pending' });
            }
          }
          useChatStore.setState((state) => {
            const msgs = [...state.messages];
            const idx = msgs.length - 1;
            msgs[idx] = { ...msgs[idx], fileEdits: appliedEdits };
            return { messages: msgs };
          });
        }
      }
    } catch (err) {
      appendToLastMessage(
        '\n\n[Error: Failed to get response. Please try again.]'
      );
      console.error('Chat stream error:', err);
    } finally {
      setStreaming(false);
    }
  }, [
    input,
    isStreaming,
    addMessage,
    appendToLastMessage,
    setStreaming,
    activeFilePath,
    activeFileContent,
    fileTree,
    lastCompilation,
    messages,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="panel-header">
        <MessageSquare size={14} className="header-icon" />
        <span>AI Assistant</span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          Ask about LaTeX, fix errors, or request edits
        </span>
        <div className="header-actions">
          <button
            className="btn-sm"
            onClick={clearMessages}
            title="Clear chat"
            disabled={messages.length === 0}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minHeight: 0,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
              padding: 16,
            }}
          >
            <div>
              <MessageSquare
                size={24}
                strokeWidth={1}
                style={{ marginBottom: 8, opacity: 0.5 }}
              />
              <div>Ask me about your LaTeX document.</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                I can help fix compilation errors, suggest improvements, or
                write new content.
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageComponent key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
          background: 'var(--bg-secondary)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your LaTeX document... (Ctrl+Enter to send)"
          disabled={isStreaming}
          rows={2}
          style={{
            flex: 1,
            resize: 'none',
            minHeight: 36,
            maxHeight: 120,
          }}
        />
        <button
          className="btn-accent btn-sm"
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          style={{ height: 36, paddingLeft: 10, paddingRight: 10 }}
        >
          <Send size={13} />
        </button>
      </div>
    </>
  );
}
