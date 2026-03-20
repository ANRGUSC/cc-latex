# cc-latex

A web-based LaTeX IDE with real-time PDF preview, an integrated AI assistant, GitHub sync, and light/dark themes.

![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue)
![Node](https://img.shields.io/badge/node-18%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)

## Overview

cc-latex gives you a full LaTeX editing environment in your browser — no Overleaf account needed. It runs locally, compiles with your system's `pdflatex`, and connects to an AI assistant (via the Claude CLI or an Anthropic API key) that can help you write, debug, and edit LaTeX.

## Features

- **LaTeX Editor** — CodeMirror 6 with syntax highlighting, optional Vim keybindings, line wrapping
- **Live PDF Preview** — Renders compiled PDFs in-browser using PDF.js with zoom and page navigation
- **AI Assistant** — Chat panel powered by Claude CLI or Anthropic API key; ask it to write equations, fix errors, or restructure your document. It can read your files and apply edits directly
- **Light/Dark Theme** — Catppuccin Mocha (dark) and Catppuccin Latte (light), toggle from toolbar or settings
- **GitHub Sync** — Connect a GitHub repo, push/pull from the sidebar with status indicators
- **File Operations** — Create, rename, and delete files/folders directly in the file tree
- **Compilation Output** — Tabbed panel with clickable errors that jump to the relevant line
- **Toast Notifications** — Non-intrusive feedback for save, compile, and git operations
- **Toolbar & Status Bar** — Project breadcrumb, compile button, connection indicator, cursor position
- **Settings Modal** — AI mode, API key, theme, Vim mode, auto-compile toggles
- **File Tree** — Browse and manage multi-file LaTeX projects with hover-revealed action buttons
- **Real-time Updates** — WebSocket-driven: file changes, compilation results, and git status appear instantly
- **Auto-detection** — Finds the main `.tex` file by looking for `\documentclass`
- **Auto-compile** — Optional: recompile on save (toggle in settings)
- **Keyboard Shortcuts** — Ctrl+S (save), Ctrl+Shift+B (compile), Ctrl+Enter (send chat), Ctrl+/ (shortcut help)
- **Cross-platform** — Works on Windows, macOS, and Linux

## Prerequisites

- **Node.js** 18+
- **A TeX distribution** with `pdflatex`:
  - Windows: [MiKTeX](https://miktex.org/download) (auto-installed via `winget` if missing)
  - macOS: `brew install --cask mactex`
  - Linux: `sudo apt install texlive-full` (Debian/Ubuntu) or equivalent
- **Claude CLI** (optional, for AI chat via CLI mode): [claude.ai/claude-code](https://claude.ai/claude-code)
- **Anthropic API key** (optional, alternative to Claude CLI): Get one at [console.anthropic.com](https://console.anthropic.com)
- **git** (optional, for GitHub sync)

## Quick Start

```bash
git clone https://github.com/anrgusc/cc-latex.git
cd cc-latex
./cclatex
```

Or on Windows:

```cmd
git clone https://github.com/anrgusc/cc-latex.git
cd cc-latex
cclatex.bat
```

The launcher script installs dependencies if needed, starts the backend (port 3100) and frontend (port 5210), and opens your browser with a demo project loaded.

To open an existing LaTeX project:

```bash
./cclatex /path/to/your/project
```

### Manual start

```bash
npm install
npm start              # or: npx tsx start.ts [project-dir]
```

## Architecture

Monorepo with three packages managed via npm workspaces:

```
cc-latex/
├── cclatex / cclatex.bat    # One-command launcher scripts
├── start.ts                 # Entry point — checks deps, launches backend + frontend
├── packages/
│   ├── backend/             # Express 5 server
│   │   └── src/
│   │       ├── routes/      # REST API: files, compile, chat (SSE), git
│   │       ├── services/    # pdflatex wrapper, file I/O, Claude CLI/API, git
│   │       ├── watcher.ts   # chokidar file watcher
│   │       └── websocket.ts # Real-time broadcast
│   ├── frontend/            # React + Vite app
│   │   └── src/
│   │       ├── components/  # Editor, PdfPreview, Chat, FileTree, Toolbar,
│   │       │                # StatusBar, Toast, Settings, Git, CompilationOutput
│   │       ├── stores/      # Zustand state management (app + chat + toast)
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
| Frontend | React 18, Vite 6, CodeMirror 6, PDF.js, Lucide icons |
| State | Zustand |
| Layout | react-resizable-panels |
| Language | TypeScript 5.7 |
| AI | Claude CLI or Anthropic API (claude-sonnet-4-20250514) |
| Theming | CSS variables (Catppuccin Mocha/Latte) |

### How the AI Chat Works

**CLI mode** (default): The backend spawns the `claude` CLI process, passes your current file content and compilation errors as context, and streams responses back via Server-Sent Events (SSE). No API key needed — uses your Claude CLI authentication.

**API key mode**: If the Claude CLI isn't available (or you prefer), enter your Anthropic API key in Settings. The backend uses the `@anthropic-ai/sdk` to stream responses from the Anthropic Messages API. The key is stored in your browser only and sent per-request — never stored on the server.

When the AI suggests file edits, they're parsed from structured markers in the response and applied automatically.

## Configuration

| Setting | Default | How to change |
|---------|---------|---------------|
| Backend port | 3100 | Edit `packages/shared/src/constants.ts` |
| Frontend port | 5210 | Edit `packages/frontend/vite.config.ts` |
| Project directory | `./project` | Pass as CLI argument: `./cclatex /path` |
| AI mode | CLI | Settings modal (gear icon in toolbar) |
| Theme | Dark | Toggle in toolbar (sun/moon icon) or settings |
| Vim mode | On | Toggle in editor header or settings |
| Auto-compile | Off | Settings modal |

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
