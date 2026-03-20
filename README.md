# cc-latex

A web-based LaTeX IDE with real-time PDF preview and an integrated AI assistant powered by Claude.

![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue)
![Node](https://img.shields.io/badge/node-18%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)

## Overview

cc-latex gives you a full LaTeX editing environment in your browser — no Overleaf account needed. It runs locally, compiles with your system's `pdflatex`, and optionally connects to an AI assistant (via the Claude CLI) that can help you write, debug, and edit LaTeX.

## Features

- **LaTeX Editor** — CodeMirror 6 with syntax highlighting, optional Vim keybindings, line wrapping
- **Live PDF Preview** — Renders compiled PDFs in-browser using PDF.js with zoom and page navigation
- **AI Assistant** — Chat panel powered by Claude CLI; ask it to write equations, fix errors, or restructure your document. It can read your files and apply edits directly
- **File Tree** — Browse and manage multi-file LaTeX projects with subdirectory support
- **Real-time Updates** — WebSocket-driven: file changes and compilation results appear instantly
- **Auto-detection** — Finds the main `.tex` file by looking for `\documentclass`
- **Keyboard Shortcuts** — Ctrl+S (save), Ctrl+Shift+B (compile), Ctrl+Enter (send chat)
- **Cross-platform** — Works on Windows, macOS, and Linux

## Screenshots

The IDE has a four-panel layout: file tree (left), LaTeX editor (top-center), PDF preview (right), and AI chat (bottom). All panels are resizable.

## Prerequisites

- **Node.js** 18+
- **A TeX distribution** with `pdflatex`:
  - Windows: [MiKTeX](https://miktex.org/download) (auto-installed via `winget` if missing)
  - macOS: `brew install --cask mactex`
  - Linux: `sudo apt install texlive-full` (Debian/Ubuntu) or equivalent
- **Claude CLI** (optional, for AI chat): [claude.ai/claude-code](https://claude.ai/claude-code)

## Quick Start

```bash
git clone https://github.com/anrgusc/cc-latex.git
cd cc-latex
npm install
npm start
```

The backend (port 3100) and frontend (port 5210) start together, and your browser opens automatically with a demo project loaded.

To open an existing LaTeX project:

```bash
npm start /path/to/your/project
```

## Architecture

Monorepo with three packages managed via npm workspaces:

```
cc-latex/
├── start.ts                 # Entry point — checks deps, launches backend + frontend
├── packages/
│   ├── backend/             # Express 5 server
│   │   └── src/
│   │       ├── routes/      # REST API: files, compile, chat (SSE)
│   │       ├── services/    # pdflatex wrapper, file I/O, Claude CLI
│   │       ├── watcher.ts   # chokidar file watcher
│   │       └── websocket.ts # Real-time broadcast
│   ├── frontend/            # React + Vite app
│   │   └── src/
│   │       ├── components/  # Editor, PdfPreview, Chat, FileTree, Layout
│   │       ├── stores/      # Zustand state management
│   │       ├── hooks/       # WebSocket connection hook
│   │       └── api/         # HTTP + SSE client
│   └── shared/              # TypeScript types and constants
├── demo/                    # Sample LaTeX project (loaded on first run)
└── project/                 # Default working directory (gitignored)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express 5, WebSocket (ws), chokidar |
| Frontend | React 18, Vite 6, CodeMirror 6, PDF.js |
| State | Zustand |
| Layout | react-resizable-panels |
| Language | TypeScript 5.7 |
| AI | Claude CLI (uses your existing subscription) |

### How the AI Chat Works

The backend spawns the `claude` CLI process, passes your current file content and compilation errors as context, and streams responses back to the frontend via Server-Sent Events (SSE). When the AI suggests file edits, they're parsed from structured markers in the response and can be applied with one click. No API key is needed — it uses your Claude CLI authentication.

## Configuration

| Setting | Default | How to change |
|---------|---------|---------------|
| Backend port | 3100 | Edit `packages/shared/src/constants.ts` |
| Frontend port | 5210 | Edit `packages/frontend/vite.config.ts` |
| Project directory | `./project` | Pass as CLI argument: `npm start /path` |

## Development

```bash
# Run backend and frontend with hot reload
npm run dev

# Or run them separately
npm run dev -w packages/backend
npm run dev -w packages/frontend
```

## License

[PolyForm Noncommercial 1.0.0](LICENSE)

## Acknowledgments

Built with [Claude Code](https://claude.ai/claude-code).
