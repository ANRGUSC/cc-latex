# Development Notes — cc-latex

## Lessons Learned

### Express 5 Wildcard Routes
- Express 5 uses `path-to-regexp` v8 which completely changed route syntax
- `/:path+` (Express 4) → `/*path` (Express 5)
- **Critical**: Wildcard params in Express 5 return **arrays**, not strings. Must `Array.isArray()` check and `.join('/')` to reconstruct the path.

### MiKTeX on Windows
- MiKTeX installs to `%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64\` but does NOT automatically add itself to PATH
- Must check known install locations as fallback when `pdflatex` isn't on PATH
- `winget install MiKTeX.MiKTeX` may report "already installed" without fixing PATH

### Port Conflicts
- Default ports (3000, 5173) are frequently busy on dev machines
- Use less common ports (3100, 5210) to avoid collisions
- Vite's `strictPort: true` makes it fail instead of auto-incrementing — avoid unless you need a fixed port

### Git Bash on Windows
- Git Bash mangles `/` prefixed args: `/PID` becomes `C:/Users/.../PID`
- Use `powershell -File -` with heredoc or `cmd.exe /c` for Windows-specific commands
- Environment variable `$_` in PowerShell gets mangled by Git Bash — use heredoc/file approach

### spawn() on Windows
- Always use `{ shell: true }` for spawning commands on Windows, otherwise PATH isn't searched
- Node.js v24+ warns about DEP0190 (args with shell: true) — cosmetic, not blocking

### Claude CLI for AI Chat
- Uses `claude -p` (print mode) instead of the Anthropic SDK
- Piggybacks on the user's Max subscription — no API key needed
- Pass message via stdin (not as argument) to avoid shell escaping issues with long prompts
- System instructions, context, and conversation history all bundled into the stdin payload

## Architecture

- Monorepo with npm workspaces: `packages/shared`, `packages/backend`, `packages/frontend`
- Backend: Express 5 + ws + chokidar + claude CLI (for AI chat)
- Frontend: React 18 + Vite + CodeMirror 6 (vim) + pdf.js + zustand
- Ports: Backend 3100, Frontend 5210
- Start: `npx tsx start.ts [project-dir]`
