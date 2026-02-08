import { create } from 'zustand';
import type { ChatMessage, FileEdit } from 'cc-latex-shared';

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;

  addMessage: (message: ChatMessage) => void;
  appendToLastMessage: (text: string) => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
  updateFileEditStatus: (
    messageId: string,
    editIndex: number,
    status: FileEdit['status']
  ) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  appendToLastMessage: (text) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last) {
        messages[messages.length - 1] = {
          ...last,
          content: last.content + text,
        };
      }
      return { messages };
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  clearMessages: () => set({ messages: [] }),

  updateFileEditStatus: (messageId, editIndex, status) =>
    set((state) => {
      const messages = state.messages.map((msg) => {
        if (msg.id !== messageId || !msg.fileEdits) return msg;
        const fileEdits = msg.fileEdits.map((edit, i) =>
          i === editIndex ? { ...edit, status } : edit
        );
        return { ...msg, fileEdits };
      });
      return { messages };
    }),
}));
