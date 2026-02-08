# cc-latex

A web-based LaTeX IDE with real-time PDF preview and an integrated AI assistant.

## Features

- **Code editor** with LaTeX syntax highlighting and Vim keybindings (CodeMirror 6)
- **Live PDF preview** that updates on compile (PDF.js)
- **AI chat** powered by Claude CLI — ask for help writing, debugging, or editing your LaTeX
- **File tree** with project-level file management
- **Auto-detection** of the main `.tex` file (looks for `\documentclass`)
- **Keyboard shortcuts**: Ctrl+S (save), Ctrl+Shift+B (compile)

## Prerequisites

- **Node.js** 18+
- **A TeX distribution** with `pdflatex`:
  - Windows: [MiKTeX](https://miktex.org/download) (auto-installed via winget if missing)
  - macOS: `brew install --cask mactex`
  - Linux: `sudo apt install texlive-full` (Debian/Ubuntu) or equivalent
- **Claude CLI** (optional, for AI chat): https://claude.ai/claude-code

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/cc-latex.git
cd cc-latex
npm install
npm start
```

That's it. The backend (port 3100) and frontend (port 5210) start together, and your browser opens automatically with a demo project loaded.

To open an existing LaTeX project instead:

```bash
npm start /path/to/your/project
```

## Architecture

Monorepo with three packages:

| Package | Description |
|---|---|
| `packages/backend` | Express 5 server — file API, pdflatex compilation, AI chat via Claude CLI, WebSocket for real-time updates |
| `packages/frontend` | React + Vite app — CodeMirror editor, PDF.js viewer, chat panel, file tree |
| `packages/shared` | Shared TypeScript types and constants |

## License

[PolyForm Noncommercial 1.0.0](LICENSE)
